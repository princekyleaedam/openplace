import { App, NextFunction, Response } from "@tinyhttp/app";
import { prisma } from "../config/database.js";
import { authMiddleware } from "../middleware/auth.js";
import { AuthenticatedRequest, TicketResolution, UserRole } from "../types/index.js";
import { User } from "@prisma/client";
import fs from "fs/promises";
import { validatePixelInfo } from "../validators/pixel.js";
import { createErrorResponse, HTTP_STATUS } from "../utils/response.js";
import { PixelService } from "../services/pixel.js";
import { TicketService } from "../services/ticket.js";

const moderatorMiddleware = async (req: AuthenticatedRequest, res: Response, next?: NextFunction) => {
	try {
		const user = await prisma.user.findUnique({
			where: { id: req.user!.id }
		});
		if (!user || user.role === UserRole.User) {
			return res.status(403)
				.json({ error: "Forbidden", status: 403 });
		}
		return next?.();
	} catch (error) {
		console.error("Error fetching user:", error);
		return res.status(500)
			.json({ error: "Internal Server Error", status: 500 });
	}
};

const pixelService = new PixelService(prisma);
const ticketService = new TicketService(prisma);

// TODO: Split this up further. Just ignoring so I can actually read this file without zigzags for now
// eslint-disable-next-line max-lines-per-function
export default function (app: App) {
	app.get("/moderator/tickets", authMiddleware, moderatorMiddleware, async (_req, res) => {
		try {
			const tickets = await prisma.ticket.findMany({
				where: {
					resolution: null
				},
				orderBy: {
					createdAt: "desc"
				},
				select: {
					id: true,
					latitude: true,
					longitude: true,
					zoom: true,
					reason: true,
					notes: true,
					image: true,
					resolution: true,
					severe: true,
					createdAt: true,
					user: {
						select: {
							id: true,
							name: true,
							discord: true,
							country: true,
							banned: true,
							role: true,
							picture: true
						}
					},
					reportedUser: {
						select: {
							id: true,
							name: true,
							discord: true,
							country: true,
							banned: true,
							role: true,
							picture: true,
							lastIP: true,
							registrationIP: true
						}
					}
				}
		});

		const formattedTickets = await Promise.all(tickets.map(async (ticket) => {
			const reportedUser = ticket.reportedUser;
			const author = ticket.user;

			const reportedCount = await prisma.ticket.count({ where: { reportedUserId: reportedUser.id } });
			const timeoutCount = await prisma.ticket.count({ where: { reportedUserId: reportedUser.id, resolution: "Timeout" } });
			const pixelsPainted = await prisma.pixel.count({ where: { user: { id: reportedUser.id } } });
			
			let sameIpAccounts = 0;
			if (reportedUser.lastIP) {
				sameIpAccounts = await prisma.user.count({ where: { lastIP: reportedUser.lastIP, id: { not: reportedUser.id } } });
			} else if (reportedUser.registrationIP) {
				sameIpAccounts = await prisma.user.count({ where: { registrationIP: reportedUser.registrationIP, id: { not: reportedUser.id } } });
			}
				return {
					id: ticket.id,
					author: author
						? {
								userId: author.id,
								name: author.name,
								discord: author.discord,
								country: author.country,
								banned: author.banned,
								role: author.role,
								reportedCount: await prisma.ticket.count({ where: { userId: author.id } }),
								pixelsPainted: await prisma.pixel.count({ where: { user: { id: author.id } } })
							}
						: null,
					reportedUser: reportedUser
						? {
								userId: reportedUser.id,
								id: reportedUser.id,
								name: reportedUser.name,
								discord: reportedUser.discord,
								country: reportedUser.country,
								banned: reportedUser.banned,
								role: reportedUser.role,
								picture: reportedUser.picture,
								reportedCount,
								timeoutCount,
								pixelsPainted,
								lastTimeoutReason: null
							}
						: null,
					createdAt: ticket.createdAt,
					reports: [
						{
							id: ticket.id,
							reportedLatitude: ticket.latitude,
							reportedLongitude: ticket.longitude,
							zoom: ticket.zoom,
							reason: ticket.reason,
							notes: ticket.notes,
							image: ticket.image 
								? Buffer.from(ticket.image)
									.toString("base64")
								: "",
							createdAt: ticket.createdAt,
							userId: reportedUser.id,
							reportedByName: author.name,
							reportedByPicture: author.picture,
							reportedBy: author
								? {
										userId: author.id,
										id: author.id,
										name: author.name,
										discord: author.discord,
										country: author.country,
										banned: author.banned,
										role: author.role
									}
								: null,
							reportedCount,
							timeoutCount,
							lastTimeoutReason: null,
							sameIpAccounts,
							pixelsPainted,
							allianceId: 0,
							allianceName: "fdgdg"
						}
					]
				};
		}));

			return res.status(200)
				.json({ tickets: formattedTickets, status: 200 });
		} catch (error) {
			console.error("Error fetching moderator tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/moderator/users", authMiddleware, moderatorMiddleware, async (req, res) => {
		try {
			const idsStr = req.query["ids"] as string;
			const ids = idsStr.split(",")
				.map(item => Number.parseInt(item))
				.filter(item => !Number.isNaN(item) && item > 0);

			const users = await prisma.user.findMany({
				where: { id: { in: ids } },
				select: {
					id: true,
					name: true,
					discord: true,
					country: true,
					banned: true,
					role: true,
					picture: true
				}
			});

			return res.json({
				users: users.map(user => ({
					userId: user.id,
					id: user.id,
					name: user.name,
					banned: user.banned,
					picture: user.picture
				}))
			});
		} catch (error) {
			console.error("Error fetching users:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/moderator/users/tickets", authMiddleware, moderatorMiddleware, async (req, res) => {
		try {
			const userId = Number.parseInt(req.query["userId"] as string ?? "") || 0;
			if (Number.isNaN(userId) || userId <= 0) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}

			const reportedUser = await prisma.user.findUnique({
				where: { id: userId },
				select: {
					id: true,
					name: true,
					discord: true,
					country: true,
					banned: true
				}
			});
			if (!reportedUser) {
				return res.status(404)
					.json({ error: "User not found", status: 404 });
			}

			const tickets = await prisma.ticket.findMany({
				where: { reportedUserId: userId }
			});

			const authors = new Map<number, User | null>();
			await Promise.all(tickets.map(async ticket => {
				const userId = ticket.userId;
				if (!authors.has(userId)) {
					authors.set(userId, await prisma.user.findFirst({
						where: { id: userId }
					}));
				}
			}));

			const formattedTickets = tickets.map(ticket => {
				const author = authors.get(ticket.userId);
				return {
					id: userId,
					author: author
						? {
								id: author.id,
								name: author.name,
								discord: author.discord || "",
								country: author.country,
								banned: author.banned
							}
						: null,
					reportedUser: reportedUser
						? {
								id: reportedUser.id,
								name: reportedUser.name,
								discord: reportedUser.discord || "",
								country: reportedUser.country,
								banned: reportedUser.banned
							}
						: null,
					createdAt: ticket.createdAt,
					reports: [ticket].map(ticket => ({
						id: ticket.id,
						latitude: ticket.latitude,
						longitude: ticket.longitude,
						zoom: ticket.zoom,
						reason: ticket.reason,
						notes: ticket.notes,
						image: ticket.image
							? Buffer.from(ticket.image)
								.toString("base64")
							: "",
						createdAt: ticket.createdAt
					}))
				};
			});

			return res.status(200)
				.json({ tickets: formattedTickets, status: 200 });
		} catch (error) {
			console.error("Error fetching moderator tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/moderator/open-tickets-count", authMiddleware, moderatorMiddleware, async (_req, res) => {
		try {
			const count = await prisma.ticket.count({
				where: { resolution: null }
			});
			return res.status(200)
				.json({ tickets: count });
		} catch (error) {
			console.error("Error assigning new tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.post("/moderator/severe-open-tickets-count", authMiddleware, moderatorMiddleware, async (_req, res) => {
		try {
			const count = await prisma.ticket.count({
				where: {
					severe: true,
					resolution: null
				}
			});
			return res.status(200)
				.json({ tickets: count });
		} catch (error) {
			console.error("Error assigning new tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.post("/moderator/assign-new-tickets", authMiddleware, moderatorMiddleware, async (_req, res) => {
		try {
			// TODO
			return res.json({
				newTicketsIds: []
			});
		} catch (error) {
			console.error("Error assigning new tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.post("/moderator/set-ticket-status", authMiddleware, moderatorMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const { ticketId, status, assignedReason } = req.body ?? {};
			if (typeof ticketId !== "string" || ticketId.length === 0) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Bad Request", HTTP_STATUS.BAD_REQUEST));
			}

			let resolution: TicketResolution | null = null;
			switch (status) {
				case "ignore":
					resolution = TicketResolution.Ignore;
					break;
				case "timeout":
					resolution = TicketResolution.Timeout;
					break;
				case "ban":
					resolution = TicketResolution.Ban;
					break;
			}

			if (!resolution) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Invalid status", HTTP_STATUS.BAD_REQUEST));
			}

			if (assignedReason && resolution === TicketResolution.Ban) {
				await prisma.ticket.update({ where: { id: ticketId }, data: { reason: assignedReason } });
			}

			await ticketService.resolve(ticketId, req.user!.id, resolution);
			return res.status(200)
				.json({});
		} catch (error) {
			console.error("Error setting ticket status:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/moderator/count-my-tickets", authMiddleware, moderatorMiddleware, async (_req, res) => {
		try {
			// TODO
			return res.json(0);
		} catch (error) {
			console.error("Error assigning new tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/moderation", authMiddleware, moderatorMiddleware, async (_req, res) => {
		const html = await fs.readFile("./frontend/moderation.html", "utf8");
		return res
			.setHeader("Content-Type", "text/html")
			.send(html);
	});

	app.get("/moderator/:season/pixel/:tileX/:tileY", async (req, res) => {
		// Temporary redirect to the non-moderator route
		const redirectUrl = req.originalUrl.replace(/^\/moderator/, "");
		return res.redirect(redirectUrl);
	});

	app.get("/moderator/pixel-area/:season/:tileX/:tileY", authMiddleware, moderatorMiddleware, async (req, res) => {
		try {
			const x0 = Number.parseInt(req.query["x0"] as string);
			const y0 = Number.parseInt(req.query["y0"] as string);
			const x1 = Number.parseInt(req.query["x1"] as string);
			const y1 = Number.parseInt(req.query["y1"] as string);
			const season = req.params["season"] as string;
			const tileX = Number.parseInt(req.params["tileX"] as string);
			const tileY = Number.parseInt(req.params["tileY"] as string);

			if (y1 < y0 || x1 < x0) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Bad Request", HTTP_STATUS.BAD_REQUEST));
			}

			const validationError = validatePixelInfo({ season, tileX, tileY, x: x0, y: y0 }) ?? validatePixelInfo({ season, tileX, tileY, x: x1, y: y1 });
			if (validationError) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse(validationError, HTTP_STATUS.BAD_REQUEST));
			}

			const result = await pixelService.getPixelInfo({ season: 0, tileX, tileY, x0, y0, x1, y1 });
			const paintedBy = result.paintedBy ?? [];
			return res.json({
				region: result.region,
				paintedBy: paintedBy.length === 0 ? null : paintedBy.map(item => item.id)
			});
		} catch (error) {
			console.error("Error getting pixel info:", error);
			return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
				.json(createErrorResponse("Internal Server Error", HTTP_STATUS.INTERNAL_SERVER_ERROR));
		}
	});
}
