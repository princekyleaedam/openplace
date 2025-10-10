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

			// Time filter
			let dateFilter: Record<string, unknown> = {};
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

			const countryId = Number.parseInt(country || "0");
			const limitParam = Number.parseInt(String(req.query["limit"] || "50"));
			const limit = Number.isNaN(limitParam) ? 50 : Math.max(1, Math.min(limitParam, 50)); //

			const pixelWhere = countryId > 0 ? { ...(dateFilter as any), regionCountryId: countryId } : (dateFilter as any);
			const counts = await (prisma as any).pixel.groupBy({
				by: ["regionCityId"],
				_count: { id: true },
				where: pixelWhere
			});
			const ranked = (counts as any[])
				.filter(c => c.regionCityId != null && ((c._count?.id as number) || 0) > 0)
				.map(c => ({ cityId: c.regionCityId as number, pixelsPainted: (c._count?.id as number) || 0 }))
				.sort((a, b) => b.pixelsPainted - a.pixelsPainted)
				.slice(0, limit);

			const cityIds = ranked.map(r => r.cityId);
			const regions = await prisma.region.findMany({ where: { cityId: { in: cityIds } } });
			const regionByCityId = new Map(regions.map(r => [r.cityId, r]));
			const response = ranked
				.map(r => {
					const region = regionByCityId.get(r.cityId);
					if (!region) return null;
					const lat = Number((region as any).lat);
					const lon = Number((region as any).lon);
					if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
					return {
						id: region.id,
						name: region.name,
						cityId: region.cityId,
						number: region.number,
						countryId: region.countryId,
						pixelsPainted: r.pixelsPainted,
						lastLatitude: lat,
						lastLongitude: lon
					};
				})
				.filter(Boolean);

			return res.json(response);
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

			let dateFilter: Record<string, unknown> = {};
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

			let counts: any[];
			if (mode === "all-time") {
				counts = await (prisma as any).pixel.groupBy({
					by: ["regionCountryId"],
					_count: { id: true }
				});
			} else {
				counts = await (prisma as any).pixel.groupBy({
					by: ["regionCountryId"],
					_count: { id: true },
					where: dateFilter
				});
			}

			const response = (counts as any[])
				.filter(c => c.regionCountryId != null)
				.map(c => ({ id: c.regionCountryId as number, pixelsPainted: (c._count?.id as number) || 0 }))
				.sort((a, b) => b.pixelsPainted - a.pixelsPainted)
				.slice(0, 250);

			return res.json(response);
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
					where: { role: "user" },
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
					where: {
						id: { in: userIds },
						role: "user"
					},
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
			const { city, mode } = req.params;
			const paramId = Number.parseInt(city || "0");
			if (!mode || !validModes.has(mode) || Number.isNaN(paramId) || paramId <= 0) {
				return res.status(400)
					.json({ error: "Invalid params", status: 400 });
			}

			let dateFilter: Record<string, unknown> = {};
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

			let regionCityId = paramId;
			const regionById = await prisma.region.findUnique({ where: { id: paramId } });
			if (regionById) {
				regionCityId = regionById.cityId;
			}

			const pixelCounts = await (prisma as any).pixel.groupBy({
				by: ["paintedBy"],
				_count: { id: true },
				where: { ...(dateFilter as any), regionCityId },
				orderBy: { _count: { id: "desc" } },
				take: 50
			});

			const userIds = (pixelCounts as any[]).map(p => p.paintedBy as number);
			const users = await prisma.user.findMany({
				where: { id: { in: userIds }, role: "user" },
				select: {
					id: true,
					name: true,
					allianceId: true,
					equippedFlag: true,
					picture: true,
					discord: true,
					alliance: { select: { name: true } }
				}
			});
			const userMap = new Map(users.map(u => [u.id, u]));
			const response = (pixelCounts as any[]).map(p => {
				const user = userMap.get(p.paintedBy as number);
				return {
					id: user?.id || (p.paintedBy as number),
					name: user?.name || "Unknown",
					allianceId: user?.allianceId || 0,
					allianceName: user?.alliance?.name || "",
					equippedFlag: user?.equippedFlag || 0,
					pixelsPainted: (p._count?.id as number) || 0,
					picture: user?.picture || undefined,
					discord: user?.discord || ""
				};
			});

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
