import { App, NextFunction, Response } from "@tinyhttp/app";
import { prisma } from "../config/database.js";
import { authMiddleware } from "../middleware/auth.js";
import { AuthenticatedRequest, UserRole } from "../types/index.js";
import { Prisma, Ticket } from "@prisma/client";
import fs from "fs/promises";
import { UserService } from "../services/user.js";

const REPORT_REASONS = [
	{ key: "doxxing", label: "Doxxing" },
	{ key: "inappropriate_content", label: "Inappropriate Content" },
	{ key: "hate_speech", label: "Hate Speech" },
	{ key: "bot", label: "Bot" },
	{ key: "other", label: "Other" },
	{ key: "griefing", label: "Griefing" }
];

export const adminMiddleware = async (req: AuthenticatedRequest, res: Response, next?: NextFunction) => {
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

const userService = new UserService(prisma);

// TODO: Split this up further. Just ignoring so I can actually read this file without zigzags for now
// eslint-disable-next-line max-lines-per-function
export default function (app: App) {
	app.get("/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
		try {
			const idStr = req.query["id"] as string ?? "";
			const id = Number.parseInt(idStr);
			if (!Number.isInteger(id) || id <= 0 || id > Number.MAX_SAFE_INTEGER) {
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

			const reportedTimes = await prisma.ticket.count({
				where: { reportedUserId: id }
			});

			const timeoutsCount = await prisma.ticket.count({
				where: { reportedUserId: id, resolution: "timeout" }
			});

			const sameIPOr: any[] = [];
			if (user.lastIP) sameIPOr.push({ lastIP: user.lastIP });
			if (user.registrationIP) sameIPOr.push({ registrationIP: user.registrationIP });
			const sameIPAccounts = sameIPOr.length > 0
				? await prisma.user.count({
					where: {
						id: { not: id },
						OR: sameIPOr
					}
				})
				: 0;

			return res.status(200)
				.json({
					userId: user.id,
					id: user.id,
					name: user.nickname || user.name,
					droplets: user.droplets,
					picture: user.picture,
					role: user.role,
					timeout_until: user.timeoutUntil,

					// TODO
					ban_reason: user.suspensionReason ?? null,
					reported_times: reportedTimes,
					timeouts_count: timeoutsCount,

					same_ip_accounts: sameIPAccounts,
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
							name: note.user.nickname || note.user.name
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

	app.get("/admin/users/tickets", authMiddleware, adminMiddleware, async (req, res) => {
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

			// TODO: Rewrite this to use the new ticket service
			const [
				globalClosedTotal,
				globalIgnored,
				globalTimeouts,
				globalBans,
				reportedClosedTotal,
				reportedIgnored,
				reportedTimeouts,
				reportedBans
			] = await Promise.all([
				prisma.ticket.count({ where: { resolution: { not: null } } }),
				prisma.ticket.count({ where: { resolution: "ignore" } }),
				prisma.ticket.count({ where: { resolution: "timeout" } }),
				prisma.ticket.count({ where: { resolution: "ban" } }),
				prisma.ticket.count({ where: { reportedUserId: id, resolution: { not: null } } }),
				prisma.ticket.count({ where: { reportedUserId: id, resolution: "ignore" } }),
				prisma.ticket.count({ where: { reportedUserId: id, resolution: "timeout" } }),
				prisma.ticket.count({ where: { reportedUserId: id, resolution: "ban" } })
			]);

			return res.status(200)
				.json({
					closedTotal: globalClosedTotal,
					ignored: globalIgnored,
					timeouts: globalTimeouts,
					bans: globalBans,
					rclosedTotal: reportedClosedTotal,
					rignored: reportedIgnored,
					rtimeouts: reportedTimeouts,
					rbans: reportedBans
				});
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

	app.post("/admin/users/set-user-droplets", authMiddleware, adminMiddleware, async (req, res) => {
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



	app.get(["/admin/tickets", "/admin/closed-tickets", "/admin/closed-reports"], authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const user = await prisma.user.findUnique({
				where: { id: req.user!.id }
			});
			if (!user || user.role === UserRole.User) {
				return res.status(403)
					.json({ error: "Forbidden", status: 403 });
			}

			const resolved = req.path === "/admin/closed-tickets" || req.path === "/admin/closed-reports"; // TODO: Check if closed-reports is correct
			const startDate = req.query["start"] as string;
			const endDate = req.query["end"] as string;

			if (resolved && startDate && endDate) {
				let dateFilter = {};
				if (startDate && endDate) {
					dateFilter = {
						createdAt: {
							gte: new Date(startDate),
							lte: new Date(endDate)
						}
					};
				}

				const mods = await prisma.user.findMany({
					where: {
						role: { in: ["moderator"] } // , "admin" ?
					},
					select: {
						id: true,
						name: true,
						nickname: true,
						role: true
					}
				});

				const modStats = await Promise.all(mods.map(async (mod) => {
					const [total, ban, ignored, timeout] = await Promise.all([
						prisma.ticket.count({
							where: {
								...dateFilter,
								moderatorUserId: mod.id,
								resolution: { not: null }
							}
						}),
						prisma.ticket.count({
							where: {
								...dateFilter,
								moderatorUserId: mod.id,
								resolution: "ban"
							}
						}),
						prisma.ticket.count({
							where: {
								...dateFilter,
								moderatorUserId: mod.id,
								resolution: "ignore"
							}
						}),
						prisma.ticket.count({
							where: {
								...dateFilter,
								moderatorUserId: mod.id,
								resolution: "timeout"
							}
						})
					]);

					if (total === 0) {
						return null;
					}

					const suspensionRate = (ban + timeout) / total;

					return {
						user: {
							id: mod.id,
							name: mod.nickname || mod.name,
							role: mod.role
						},
						total,
						ban,
						ignored,
						timeout,
						suspensionRate
					};
				}));

				const filteredModStats = modStats.filter(stat => stat !== null);

				return res.json({ items: filteredModStats });
			}

			const tickets = await prisma.ticket.findMany({
				where: { resolution: resolved ? { not: null } : null },
				orderBy: { createdAt: "desc" }
			});

			// Get all reported users
			const reportedUserIds = tickets.map(ticket => ticket.reportedUserId);
			const reportedUsers = await prisma.user.findMany({
				where: { id: { in: reportedUserIds } },
				select: {
					id: true,
					name: true,
					nickname: true,
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
								name: reportedUser.nickname || reportedUser.name,
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

	app.get("/admin/open-tickets-count", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const user = await prisma.user.findUnique({
				where: { id: req.user!.id }
			});
			if (!user || user.role === UserRole.User) {
				return res.status(403)
					.json({ error: "Forbidden", status: 403 });
			}

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

	app.post("/admin/severe-open-tickets-count", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const user = await prisma.user.findUnique({
				where: { id: req.user!.id }
			});
			if (!user || user.role === UserRole.User) {
				return res.status(403)
					.json({ error: "Forbidden", status: 403 });
			}

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

	app.post("/admin/assign-new-tickets", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const user = await prisma.user.findUnique({
				where: { id: req.user!.id }
			});
			if (!user || user.role === UserRole.User) {
				return res.status(403)
					.json({ error: "Forbidden", status: 403 });
			}

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

	app.get("/admin/count-all-tickets", authMiddleware, adminMiddleware, async (_req, res) => {
		try {
			const results = await prisma.ticket.groupBy({
				by: ["reason"],
				where: {
					resolution: null
				},
				_count: {
					reason: true
				}
			});

			// TODO: Fix to use - -> _
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

	app.get("/admin/count-all-reports", authMiddleware, adminMiddleware, async (_req, res) => {
		try {
			// TODO: Might need a separate table?
			const results = await prisma.ticket.groupBy({
				by: ["reason"],
				where: {
					resolution: null
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

	app.get(["/admin/alliances/:id", "/admin/alliances/:id/full"], authMiddleware, adminMiddleware, async (req, res) => {
		try {
			const id = Number.parseInt(req.params["id"] as string ?? "");
			if (Number.isNaN(id) || id <= 0) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}

			const isFull = req.path.endsWith("/full");
			const alliance = await prisma.alliance.findUnique({
				where: { id },
				select: {
					id: true,
					name: true,
					description: isFull,
					hqLatitude: isFull,
					hqLongitude: isFull,
					pixelsPainted: true,
					members: isFull,
					bannedUsers: isFull,
					createdAt: isFull,
					updatedAt: isFull
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
				ownerName: owner?.nickname || owner?.name
			};

			return res.status(200)
				.json(result);
		} catch (error) {
			console.error("Error assigning new tickets:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/admin/alliances/search", authMiddleware, adminMiddleware, async (req, res) => {
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

	app.post("/admin/remove-ban", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const userId = Number.parseInt(req.body["userId"] as string ?? "") || 0;
			if (Number.isNaN(userId) || userId <= 0) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}

			await userService.ban(userId, false, null);
			return res.status(200)
				.json({});
		} catch (error) {
			console.error("Error removing ban:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.post("/moderator/remove-timeout", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const userId = Number.parseInt(req.body["userId"] as string ?? "") || 0;
			if (Number.isNaN(userId) || userId <= 0) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}

			await userService.timeout(userId, false);
			return res.status(200)
				.json({});
		} catch (error) {
			console.error("Error removing timeout:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.post("/admin/remove-timeout", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const userId = Number.parseInt(req.body["userId"] as string ?? "") || 0;
			if (Number.isNaN(userId) || userId <= 0) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}

			await userService.timeout(userId, false);
			return res.status(200)
				.json({});
		} catch (error) {
			console.error("Error removing timeout:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/admin", authMiddleware, adminMiddleware, async (_req, res) => {
		const html = await fs.readFile("./frontend/admin.html", "utf8");
		return res
			.setHeader("Content-Type", "text/html")
			.send(html);
	});
}
