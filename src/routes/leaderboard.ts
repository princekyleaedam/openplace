import { App } from "@tinyhttp/app";
import { prisma } from "../config/database.js";

const validModes = new Set(["today", "week", "month", "all-time"]);

export default function (app: App) {
	app.get("/leaderboard/region/:mode/:country", async (req, res) => {
		try {
			const { mode, country } = req.params;

			if (!mode || !validModes.has(mode)) {
				return res.status(400)
					.json({ error: "Invalid mode", status: 400 });
			}

			const regions = await prisma.region.findMany({
				where: {
					countryId: Number.parseInt(country || "0")
				},
				orderBy: { name: "asc" }
			});

			// TODO
			const regionsWithStats = await Promise.all(
				regions.map(async (region) => {
					return {
						id: region.id,
						name: region.name,
						cityId: region.cityId,
						number: region.number,
						countryId: region.countryId,
						pixelsPainted: 1234,
						lastLatitude: 0,
						lastLongitude: 0
					};
				})
			);

			regionsWithStats.sort((a, b) => b.pixelsPainted - a.pixelsPainted);

			return res.json(regionsWithStats);
		} catch (error) {
			console.error("Error fetching region leaderboard:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/leaderboard/country/:mode", async (req, res) => {
		try {
			const { mode } = req.params;

			if (!mode || !validModes.has(mode)) {
				return res.status(400)
					.json({ error: "Invalid mode", status: 400 });
			}
			// TODO: calculate country pixel data
			const mockCountries = [
				{ id: 235, pixelsPainted: 1_234 }
			];

			return res.json(mockCountries);
		} catch (error) {
			console.error("Error fetching country leaderboard:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/leaderboard/player/:mode", async (req, res) => {
		try {
			const { mode } = req.params;

			if (!mode || !validModes.has(mode)) {
				return res.status(400)
					.json({ error: "Invalid mode", status: 400 });
			}

			let dateFilter = {};
			const now = new Date();

			switch (mode) {
				case "today": {
					const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
					dateFilter = { paintedAt: { gte: startOfDay } };
					break;
				}
				case "week": {
					const startOfWeek = new Date(now);
					startOfWeek.setDate(now.getDate() - 7);
					dateFilter = { paintedAt: { gte: startOfWeek } };
					break;
				}
				case "month": {
					const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
					dateFilter = { paintedAt: { gte: startOfMonth } };
					break;
				}
			}

			if (mode === "all-time") {
				const players = await prisma.user.findMany({
					orderBy: { pixelsPainted: "desc" },
					take: 50,
					select: {
						id: true,
						name: true,
						allianceId: true,
						equippedFlag: true,
						pixelsPainted: true,
						picture: true,
						discord: true,
						alliance: {
							select: { name: true }
						}
					}
				});

				const response = players.map(player => ({
					id: player.id,
					name: player.name,
					allianceId: player.allianceId || 0,
					allianceName: player.alliance?.name || "",
					equippedFlag: player.equippedFlag,
					pixelsPainted: player.pixelsPainted,
					picture: player.picture || undefined,
					discord: player.discord || ""
				}));

				return res.json(response);
			} else {
				// Count pixels by time period
				const pixelCounts = await prisma.pixel.groupBy({
					by: ["paintedBy"],
					_count: { id: true },
					where: dateFilter,
					orderBy: { _count: { id: "desc" } },
					take: 50
				});

				const userIds = pixelCounts.map(p => p.paintedBy);
				const users = await prisma.user.findMany({
					where: { id: { in: userIds } },
					select: {
						id: true,
						name: true,
						allianceId: true,
						equippedFlag: true,
						picture: true,
						discord: true,
						alliance: {
							select: { name: true }
						}
					}
				});

				const userMap = new Map(users.map(u => [u.id, u]));
				const response = pixelCounts.map(pixel => {
					const user = userMap.get(pixel.paintedBy);
					return {
						id: user?.id || pixel.paintedBy,
						name: user?.name || "Unknown",
						allianceId: user?.allianceId || 0,
						allianceName: user?.alliance?.name || "",
						equippedFlag: user?.equippedFlag || 0,
						pixelsPainted: pixel._count.id,
						picture: user?.picture || undefined,
						discord: user?.discord || ""
					};
				});

				return res.json(response);
			}
		} catch (error) {
			console.error("Error fetching player leaderboard:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/leaderboard/alliance/:mode", async (req, res) => {
		try {
			const { mode } = req.params;

			if (!mode || !validModes.has(mode)) {
				return res.status(400)
					.json({ error: "Invalid mode", status: 400 });
			}

			let dateFilter = {};
			const now = new Date();

			switch (mode) {
				case "today": {
					const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
					dateFilter = { paintedAt: { gte: startOfDay } };
					break;
				}
				case "week": {
					const startOfWeek = new Date(now);
					startOfWeek.setDate(now.getDate() - 7);
					dateFilter = { paintedAt: { gte: startOfWeek } };
					break;
				}
				case "month": {
					const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
					dateFilter = { paintedAt: { gte: startOfMonth } };
					break;
				}
			}

			if (mode === "all-time") {
				const alliances = await prisma.alliance.findMany({
					orderBy: { pixelsPainted: "desc" },
					take: 50,
					select: {
						id: true,
						name: true,
						pixelsPainted: true
					}
				});

				return res.json(alliances);
			} else {
				// Count pixels by time period and alliance
				const pixelCounts = await prisma.pixel.groupBy({
					by: ["paintedBy"],
					_count: { id: true },
					where: dateFilter
				});

				// Get user alliance memberships
				const userIds = pixelCounts.map(p => p.paintedBy);
				const users = await prisma.user.findMany({
					where: {
						id: { in: userIds },
						allianceId: { not: null }
					},
					select: {
						id: true,
						allianceId: true
					}
				});

				// Group pixels by alliance
				const alliancePixelCounts = new Map<number, number>();
				const userAllianceMap = new Map(users.map(u => [u.id, u.allianceId!]));

				for (const pixel of pixelCounts) {
					const allianceId = userAllianceMap.get(pixel.paintedBy);
					if (allianceId) {
						const currentCount = alliancePixelCounts.get(allianceId) || 0;
						alliancePixelCounts.set(allianceId, currentCount + pixel._count.id);
					}
				}

				// Get alliance details and sort by pixel count
				const allianceIds = [...alliancePixelCounts.keys()];
				const alliances = await prisma.alliance.findMany({
					where: { id: { in: allianceIds } },
					select: {
						id: true,
						name: true
					}
				});

				const response = alliances.map(alliance => ({
					id: alliance.id,
					name: alliance.name,
					pixelsPainted: alliancePixelCounts.get(alliance.id) || 0
				}))
					.sort((a, b) => b.pixelsPainted - a.pixelsPainted)
					.slice(0, 50);

				return res.json(response);
			}
		} catch (error) {
			console.error("Error fetching alliance leaderboard:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/leaderboard/region/players/:city/:mode", async (req, res) => {
		try {
			// TODO: city not being used
			const { city: _city, mode } = req.params;

			if (!mode || !validModes.has(mode)) {
				return res.status(400)
					.json({ error: "Invalid mode", status: 400 });
			}

			const players = await prisma.user.findMany({
				orderBy: { pixelsPainted: "desc" },
				take: 50,
				select: {
					id: true,
					name: true,
					allianceId: true,
					equippedFlag: true,
					pixelsPainted: true,
					picture: true,
					discord: true,
					alliance: {
						select: { name: true }
					}
				}
			});

			const response = players.map(player => ({
				id: player.id,
				name: player.name,
				allianceId: player.allianceId || 0,
				allianceName: player.alliance?.name || "",
				pixelsPainted: player.pixelsPainted,
				equippedFlag: player.equippedFlag,
				picture: player.picture || undefined,
				discord: player.discord || ""
			}));

			return res.json(response);
		} catch (error) {
			console.error("Error fetching regional players leaderboard:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/leaderboard/region/alliances/:city/:mode", async (req, res) => {
		try {
			// TODO: city not being used
			const { city: _city, mode } = req.params;

			if (!mode || !validModes.has(mode)) {
				return res.status(400)
					.json({ error: "Invalid mode", status: 400 });
			}

			const alliances = await prisma.alliance.findMany({
				orderBy: { pixelsPainted: "desc" },
				take: 50,
				select: {
					id: true,
					name: true,
					pixelsPainted: true
				}
			});

			return res.json(alliances);
		} catch (error) {
			console.error("Error fetching regional alliances leaderboard:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});
}
