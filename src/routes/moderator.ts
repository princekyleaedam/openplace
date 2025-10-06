import { App, NextFunction, Response } from "@tinyhttp/app";
import { prisma } from "../config/database.js";
import { authMiddleware } from "../middleware/auth.js";
import { AuthenticatedRequest, UserRole } from "../types/index.js";
import { User } from "@prisma/client";
import fs from "fs/promises";

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

export default function (app: App) {
	app.get("/moderator/tickets", authMiddleware, moderatorMiddleware, async (_req: any, res: any) => {
		try {
			const tickets = await prisma.ticket.findMany({
				where: {
					resolution: null
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
							picture: true
						}
					}
				}
			});

			const formattedTickets = tickets.map(ticket => {
				const reportedUser = ticket.reportedUser;
				const author = ticket.user;
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
								reportedCount: 0,
								pixelsPainted: 0
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
								reportedCount: 0,
								timeoutCount: 0,
								pixelsPainted: 0,
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
							reportedCount: 0,
							timeoutCount: 0,
							lastTimeoutReason: null,
							sameIpAccounts: 0,
							pixelsPainted: 0,
							allianceId: 0,
							allianceName: "fdgdg"
						}
					]
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

	app.get("/moderator/users/tickets", authMiddleware, moderatorMiddleware, async (req: any, res: any) => {
		try {
			const userId = Number.parseInt(req.query.userId as string ?? "") || 0;
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
						image: ticket.image,
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

	app.get("/moderator/open-tickets-count", authMiddleware, moderatorMiddleware, async (_req: any, res: any) => {
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

	app.post("/moderator/severe-open-tickets-count", authMiddleware, moderatorMiddleware, async (_req: any, res: any) => {
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

	app.post("/moderator/assign-new-tickets", authMiddleware, moderatorMiddleware, async (_req: any, res: any) => {
		try {
			// TODO
			res.json({
				newTicketsIds: []
			});
		} catch (error) {
			console.error("Error assigning new tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/moderator/count-my-tickets", authMiddleware, moderatorMiddleware, async (_req: any, res: any) => {
		try {
			// TODO
			res.json(0);
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

	app.get("/moderator/:season/pixel/:tileX/:tileY", async (req: any, res: any) => {
		// Temporary redirect to the non-moderator route
		const redirectUrl = req.originalUrl.replace(/^\/moderator/, "");
		return res.redirect(redirectUrl);
	});
}
