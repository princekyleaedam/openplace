import { App, NextFunction, Response } from "@tinyhttp/app";
import { prisma } from "../config/database.js";
import { authMiddleware } from "../middleware/auth.js";
import { AuthenticatedRequest, UserRole } from "../types/index.js";
import { Ticket, User } from "@prisma/client";
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
	app.get("/moderator/tickets", authMiddleware, moderatorMiddleware, async (req: any, res: any) => {
		try {
			const tickets = await prisma.ticket.findMany({
				where: {
					resolved: false
				},
				select: {
					user: {
						select: {
							id: true,
							name: true,
							discord: true,
							country: true,
							banned: true
						}
					},
					reportedUser: {
						select: {
							id: true,
							name: true,
							discord: true,
							country: true,
							banned: true
						}
					}
				}
			});

			// Get all reported users
			const reportedUserIds = tickets.map(ticket => ticket.reportedUserId);
			const reportedUsers = await prisma.user.findMany({
				where: { id: { in: reportedUserIds } },
				select: {}
			});

			const userMap = new Map(reportedUsers.map(user => [user.id, user]));

			// Group tickets by reported user
			const ticketsByUser = new Map<number, Ticket[]>();
			const authors = new Map<number, User | null>();
			await Promise.all(tickets.map(async ticket => {
				const userId = ticket.userId;
				if (!authors.has(userId)) {
					authors.set(userId, await prisma.user.findFirst({
						where: { id: userId }
					}));
				}

				const reportedUserID = ticket.reportedUserId;
				if (!ticketsByUser.has(reportedUserID)) {
					ticketsByUser.set(reportedUserID, []);
				}
				ticketsByUser.get(reportedUserID)!.push(ticket);
			}));

			const formattedTickets = [...ticketsByUser.entries()].map(([userId, userTickets]) => {
				const author = authors.get(userTickets[0]?.userId || 0);
				const reportedUser = userMap.get(userId);
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
					createdAt: userTickets[0]?.createdAt,
					reports: userTickets.map(ticket => ({
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

	app.get("/moderator/open-tickets-count", authMiddleware, moderatorMiddleware, async (req: any, res: any) => {
		try {
			const count = await prisma.ticket.count({
				where: { resolved: false }
			});
			return res.status(200)
				.json({ tickets: count });
		} catch (error) {
			console.error("Error assigning new tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.post("/moderator/severe-open-tickets-count", authMiddleware, moderatorMiddleware, async (req: any, res: any) => {
		try {
			const count = await prisma.ticket.count({
				where: {
					severe: true,
					resolved: false
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

	app.post("/moderator/assign-new-tickets", authMiddleware, moderatorMiddleware, async (req: any, res: any) => {
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

	app.get("/moderator/count-my-tickets", authMiddleware, moderatorMiddleware, async (req: any, res: any) => {
		try {
			// TODO
			res.json(0);
		} catch (error) {
			console.error("Error assigning new tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/moderation", async (_req, res) => {
		const html = await fs.readFile("./frontend/moderation.html", "utf8");
		return res
			.setHeader("Content-Type", "text/html")
			.send(html);
	});
}
