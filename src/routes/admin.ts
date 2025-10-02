import { App, NextFunction, Response } from "@tinyhttp/app";
import { prisma } from "../config/database.js";
import { authMiddleware } from "../middleware/auth.js";
import { AuthenticatedRequest, UserRole } from "../types/index.js";
import { Prisma, Ticket } from "@prisma/client";
import fs from "fs/promises";

const REPORT_REASONS = [
	{ key: "doxxing", label: "Doxxing" },
	{ key: "inappropriate_content", label: "Inappropriate Content" },
	{ key: "hate_speech", label: "Hate Speech" },
	{ key: "bot", label: "Bot" },
	{ key: "other", label: "Other" },
	{ key: "griefing", label: "Griefing" }
];

const adminMiddleware = async (req: AuthenticatedRequest, res: Response, next?: NextFunction) => {
	try {
		const user = await prisma.user.findUnique({
			where: { id: req.user!.id }
		});
		if (!user || user.role !== UserRole.Admin) {
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
	app.get("/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
		try {
			const id = Number.parseInt(req.query["id"] as string ?? "") || 0;
			if (Number.isNaN(id) || id <= 0) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}
			const user = await prisma.user.findUnique({
				where: { id }
			});
			if (!user) {
				return res.status(404)
					.json({ error: "User not found", status: 404 });
			}

			const alliance = user.allianceId
				? await prisma.alliance.findFirst({
					where: { id: user.allianceId }
				})
				: null;

			return res.status(200)
				.json({
					id: user.id,
					name: user.name,
					droplets: user.droplets,
					picture: user.picture,
					role: user.role,
					timeout_until: user.timeoutUntil,

					// TODO
					ban_reason: null,
					reported_times: 0,
					timeouts_count: 0,

					same_ip_accounts: 0,
					alliance_id: user.allianceId,
					alliance_name: alliance?.name,
					pixels_painted: user.pixelsPainted,
					phone_validated: false,
					discord: user.discord
				});
		} catch (error) {
			console.error("Error fetching users:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/admin/users/notes", authMiddleware, adminMiddleware, async (req, res) => {
		try {
			const id = Number.parseInt(req.query["userId"] as string ?? "") || 0;
			if (Number.isNaN(id) || id <= 0) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}
			const user = await prisma.user.findUnique({
				where: { id }
			});
			if (!user) {
				return res.status(404)
					.json({ error: "User not found", status: 404 });
			}

			const notes = await prisma.userNote.findMany({
				where: { reportedUserId: id },
				include: { user: true },
				orderBy: { createdAt: "desc" }
			});

			return res.status(200)
				.json({
					notes: notes.map(note => ({
						id: note.id,
						author: {
							role: note.user.role,
							id: note.user.id,
							name: note.user.name
						},
						note: note.content,
						createdAt: note.createdAt
					}))
				});
		} catch (error) {
			console.error("Error fetching notes:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.post("/admin/users/notes", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const id = Number.parseInt(req.body["userId"] as string ?? "") || 0;
			const note = req.body["note"];
			if (Number.isNaN(id) || id <= 0 || typeof note !== "string") {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}

			const user = await prisma.user.findUnique({
				where: { id }
			});
			if (!user) {
				return res.status(404)
					.json({ error: "User not found", status: 404 });
			}

			await prisma.userNote.create({
				data: {
					userId: req.user!.id,
					reportedUserId: id,
					content: note
				}
			});

			return res.status(200)
				.json({});
		} catch (error) {
			console.error("Error fetching notes:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/admin/users/tickets", authMiddleware, adminMiddleware, async (req, res, next) => {
		try {
			const id = Number.parseInt(req.query["id"] as string ?? "") || 0;
			if (Number.isNaN(id) || id <= 0) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}
			const user = await prisma.user.findUnique({
				where: { id }
			});
			if (!user) {
				return res.status(404)
					.json({ error: "User not found", status: 404 });
			}

			// TODO
			return res.status(200)
				.json({});
		} catch (error) {
			console.error("Error fetching tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/admin/users/purchases", authMiddleware, adminMiddleware, async (req, res) => {
		try {
			const id = Number.parseInt(req.query["userId"] as string ?? "") || 0;
			if (Number.isNaN(id) || id <= 0) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}
			const user = await prisma.user.findUnique({
				where: { id }
			});
			if (!user) {
				return res.status(404)
					.json({ error: "User not found", status: 404 });
			}

			// TODO
			return res.status(200)
				.json({});
		} catch (error) {
			console.error("Error fetching purchases:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.post("/admin/users/set-user-droplets", authMiddleware, adminMiddleware, async (req, res, next) => {
		try {
			const userId = Number.parseInt(req.body["userId"] as string ?? "") || 0;
			const droplets = Number.parseInt(req.body["droplets"] as string ?? "") || 0;
			if (Number.isNaN(userId) || userId <= 0 || Number.isNaN(droplets)) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}

			const user = await prisma.user.findUnique({
				where: { id: userId }
			});
			if (!user) {
				return res.status(404)
					.json({ error: "User not found", status: 404 });
			}

			const newDroplets = user.droplets + droplets;

			await prisma.user.update({
				where: { id: userId },
				data: { droplets: newDroplets }
			});

			return res.status(200)
				.json({ success: true });
		} catch (error) {
			console.error("Error setting user droplets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get(["/admin/tickets", "/admin/closed-tickets"], authMiddleware, adminMiddleware, async (req: any, res: any) => {
		try {
			const user = await prisma.user.findUnique({
				where: { id: req.user.id }
			});
			if (!user || user.role === UserRole.User) {
				return res.status(403)
					.json({ error: "Forbidden", status: 403 });
			}

			const resolved = req.path === "/admin/closed-tickets";
			const tickets = await prisma.ticket.findMany({
				where: { resolved },
				orderBy: { createdAt: "desc" }
			});

			// Get all reported users
			const reportedUserIds = tickets.map(ticket => ticket.reportedUserId);
			const reportedUsers = await prisma.user.findMany({
				where: { id: { in: reportedUserIds } },
				select: {
					id: true,
					name: true,
					discord: true,
					country: true,
					banned: true
				}
			});

			const userMap = new Map(reportedUsers.map(user => [user.id, user]));

			// Group tickets by reported user
			const ticketsByUser = new Map<number, Ticket[]>();
			for (const ticket of tickets) {
				const userId = ticket.reportedUserId;
				if (!ticketsByUser.has(userId)) {
					ticketsByUser.set(userId, []);
				}
				ticketsByUser.get(userId)!.push(ticket);
			}

			const formattedTickets = [...ticketsByUser.entries()].map(([userId, userTickets]) => {
				const reportedUser = userMap.get(userId);
				return {
					id: userId,
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

	app.get("/admin/open-tickets-count", authMiddleware, adminMiddleware, async (req: any, res: any) => {
		try {
			const user = await prisma.user.findUnique({
				where: { id: req.user.id }
			});
			if (!user || user.role === UserRole.User) {
				return res.status(403)
					.json({ error: "Forbidden", status: 403 });
			}

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

	app.post("/admin/severe-open-tickets-count", authMiddleware, adminMiddleware, async (req: any, res: any) => {
		try {
			const user = await prisma.user.findUnique({
				where: { id: req.user.id }
			});
			if (!user || user.role === UserRole.User) {
				return res.status(403)
					.json({ error: "Forbidden", status: 403 });
			}

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

	app.post("/admin/assign-new-tickets", authMiddleware, adminMiddleware, async (req: any, res: any) => {
		try {
			const user = await prisma.user.findUnique({
				where: { id: req.user.id }
			});
			if (!user || user.role === UserRole.User) {
				return res.status(403)
					.json({ error: "Forbidden", status: 403 });
			}

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

	app.get("/admin/count-all-tickets", authMiddleware, adminMiddleware, async (_req: any, res: any) => {
		try {
			const results = await prisma.ticket.groupBy({
				by: ["reason"],
				where: {
					resolved: false
				},
				_count: {
					reason: true
				}
			});

			const reasons = new Map<string, number>(REPORT_REASONS.map(item => [item.key, 0]));
			for (const item of results) {
				reasons.set(item.reason, item._count.reason);
			}

			const totalCount = [...reasons.values()].reduce((a, b) => a + b, 0);

			return res.status(200)
				.json({
					...Object.fromEntries(reasons),
					total_open_tickets: totalCount
				});
		} catch (error) {
			console.error("Error assigning new tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/admin/count-all-reports", authMiddleware, adminMiddleware, async (_req: any, res: any) => {
		try {
			// TODO: Might need a separate table?
			const results = await prisma.ticket.groupBy({
				by: ["reason"],
				where: {
					resolved: false
				},
				_count: {
					reason: true
				}
			});

			const reasons = new Map<string, number>(REPORT_REASONS.map(item => [item.key, 0]));
			for (const item of results) {
				reasons.set(item.reason, item._count.reason);
			}

			const totalCount = [...reasons.values()].reduce((a, b) => a + b, 0);

			return res.status(200)
				.json({
					...Object.fromEntries(reasons),
					total_open_reports: totalCount
				});
		} catch (error) {
			console.error("Error assigning new tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get(["/admin/alliances/:id", "/admin/alliances/:id/full"], authMiddleware, adminMiddleware, async (req: any, res: any) => {
		try {
			const id = Number.parseInt(req.params["id"] as string ?? "");
			if (Number.isNaN(id) || id <= 0) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}

			const isFull = req.path.endsWith("/full");
			const alliance = await prisma.alliance.findUnique({
				where: { id },
				select: isFull
					? {
							id: true,
							name: true,
							description: true,
							hqLatitude: true,
							hqLongitude: true,
							pixelsPainted: true,
							members: true,
							bannedUsers: true,
							createdAt: true,
							updatedAt: true
						}
					: {
							id: true,
							name: true,
							pixelsPainted: true
						}
			});
			if (!alliance) {
				return res.status(404)
					.json({ error: "Alliance not found", status: 404 });
			}

			// TODO: Owner field
			const owner = alliance.members?.[0];

			const result = {
				...alliance,
				membersCount: alliance.members?.length || 0,
				ownerId: owner?.id,
				ownerName: owner?.name
			};

			return res.status(200)
				.json(result);
		} catch (error) {
			console.error("Error assigning new tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/admin/alliances/search", authMiddleware, adminMiddleware, async (req: any, res: any) => {
		try {
			const query = req.query["q"] as string ?? "";
			const queryId = Number.parseInt(query) || 0;

			let where: Prisma.AllianceWhereInput = {
				name: {
					contains: query
				}
			};

			if (!Number.isNaN(queryId) && queryId !== 0) {
				where = {
					id: queryId
				};
			}

			const results = await prisma.alliance.findMany({
				where,
				take: 20,
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					name: true,
					pixelsPainted: true
				}
			});

			return res.status(200)
				.json({ results });
		} catch (error) {
			console.error("Error assigning new tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/admin", async (_req, res) => {
		const html = await fs.readFile("./frontend/admin.html", "utf8");
		return res
			.setHeader("Content-Type", "text/html")
			.send(html);
	});
}
