import { App } from "@tinyhttp/app";
import { prisma } from "../config/database.js";
import { leaderboardCache } from "../services/leaderboard-cache.js";

const validModes = new Set(["today", "week", "month", "all-time"]);

// TODO: Split up file
// eslint-disable-next-line max-lines-per-function
export default function (app: App) {
	app.get("/leaderboard/region/:mode/:country", async (req, res) => {
		try {
			const { mode, country } = req.params;

			if (!mode || !validModes.has(mode)) {
				return res.status(400)
					.json({ error: "Invalid mode", status: 400 });
			}

			// Time filter
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

			const countryId = Number.parseInt(country || "0");
			const limitParam = Number.parseInt(String(req.query["limit"] || "50"));
			const limit = Number.isNaN(limitParam) ? 50 : Math.max(1, Math.min(limitParam, 50)); //
			const pixelWhere = {
				...dateFilter,
				...(countryId > 0 ? { regionCountryId: countryId } : {})
			};

			const cacheKey = `region:${mode}:${countryId}:${limit}`;
			let ranked = leaderboardCache.get<{ cityId: number; pixelsPainted: number }[]>(cacheKey);
			if (!ranked) {
				const counts = await prisma.pixel.groupBy({
					by: ["regionCityId"],
					_count: { id: true },
					where: pixelWhere,
					orderBy: { _count: { id: "desc" } },
					take: limit
				});
				ranked = counts
					.filter(c => c.regionCityId != null && ((c._count?.id as number) || 0) > 0)
					.map(c => ({ cityId: c.regionCityId as number, pixelsPainted: (c._count?.id as number) || 0 }));
				leaderboardCache.set(cacheKey, ranked);
			}

			const cityIds = ranked.map(r => r.cityId);
			const regions = await prisma.region.findMany({ where: { cityId: { in: cityIds } } });
			const regionByCityId = new Map(regions.map(r => [r.cityId, r]));
			const response = ranked
				.map(r => {
					const region = regionByCityId.get(r.cityId);
					if (!region) return null;
					const lat = Number(region.latitude);
					const lon = Number(region.longitude);
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

			const cacheKey = `country:${mode}:50`;
			let response = leaderboardCache.get<{ id: number; pixelsPainted: number }[]>(cacheKey);
			if (!response) {
				const counts = await prisma.pixel.groupBy({
					by: ["regionCountryId"],
					_count: { id: true },
					where: mode === "all-time" ? {} : dateFilter,
					orderBy: { _count: { id: "desc" } },
					take: 50
				});

				response = counts
					.filter(c => c.regionCountryId != null)
					.map(c => ({ id: c.regionCountryId as number, pixelsPainted: (c._count?.id as number) || 0 }));
				leaderboardCache.set(cacheKey, response);
			}

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
					where: { role: "user", pixelsPainted: { gt: 0 } },
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
				const cacheKey = `player:${mode}:50`;
				let pixelCounts = leaderboardCache.get<{ paintedBy: number; _count: { id: number } }[]>(cacheKey);
				if (!pixelCounts) {
					pixelCounts = await prisma.pixel.groupBy({
						by: ["paintedBy"],
						_count: { id: true },
						where: dateFilter,
						orderBy: { _count: { id: "desc" } },
						take: 50
					});
					leaderboardCache.set(cacheKey, pixelCounts);
				}

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
				const response = pixelCounts
					.map(p => {
						const user = userMap.get(p.paintedBy);
						if (!user) return null;
						return {
							id: user.id,
							name: user.name,
							allianceId: user.allianceId || 0,
							allianceName: user.alliance?.name || "",
							equippedFlag: user.equippedFlag || 0,
							pixelsPainted: (p._count?.id as number) || 0,
							picture: user.picture || undefined,
							discord: user.discord || ""
						};
					})
					.filter(Boolean);

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
					where: { pixelsPainted: { gt: 0 } },
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
				const cacheKey = `alliance:${mode}:50`;
				let pixelCounts = leaderboardCache.get<{ paintedBy: number; _count: { id: number } }[]>(cacheKey);
				if (!pixelCounts) {
					pixelCounts = await prisma.pixel.groupBy({
						by: ["paintedBy"],
						_count: { id: true },
						where: dateFilter
					});
					leaderboardCache.set(cacheKey, pixelCounts);
				}

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
			if (!mode || !validModes.has(mode) || Number.isNaN(paramId)) {
				return res.status(400)
					.json({ error: "Invalid params", status: 400 });
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

			let regionCityId = paramId;
			const regionById = await prisma.region.findUnique({ where: { id: paramId } });
			if (regionById) {
				regionCityId = regionById.cityId;
			}

			const cacheKey = `regionPlayers:${regionCityId}:${mode}:50`;
			let pixelCounts = leaderboardCache.get<{ paintedBy: number; _count: { id: number } }[]>(cacheKey);
			if (!pixelCounts) {
				pixelCounts = await prisma.pixel.groupBy({
					by: ["paintedBy"],
					_count: { id: true },
					where: { ...dateFilter, regionCityId },
					orderBy: { _count: { id: "desc" } },
					take: 50
				});
				leaderboardCache.set(cacheKey, pixelCounts);
			}

			const userIds = pixelCounts.map(p => p.paintedBy as number);
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
			const response = pixelCounts
				.map(p => {
					const user = userMap.get(p.paintedBy as number);
					if (!user) return null;
					return {
						id: user.id,
						name: user.name,
						allianceId: user.allianceId || 0,
						allianceName: user.alliance?.name || "",
						equippedFlag: user.equippedFlag || 0,
						pixelsPainted: (p._count?.id as number) || 0,
						picture: user.picture || undefined,
						discord: user.discord || ""
					};
				})
				.filter(Boolean);

			return res.json(response);
		} catch (error) {
			console.error("Error fetching regional players leaderboard:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.get("/leaderboard/region/alliances/:city/:mode", async (req, res) => {
		try {
			const { city, mode } = req.params;

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

			const paramId = Number.parseInt(city || "0");
			if (Number.isNaN(paramId)) {
				return res.status(400)
					.json({ error: "Invalid params", status: 400 });
			}

			let regionCityId = paramId;
			const regionById = await prisma.region.findUnique({ where: { id: paramId } });
			if (regionById) {
				regionCityId = regionById.cityId;
			}

			const cacheKey = `regionAlliances:${regionCityId}:${mode}:50`;
			let allianceCounts = leaderboardCache.get<{ allianceId: number; pixelsPainted: number }[]>(cacheKey);
			if (!allianceCounts) {
				const pixelCounts = await prisma.pixel.groupBy({
					by: ["paintedBy"],
					_count: { id: true },
					where: { ...dateFilter, regionCityId }
				});
				const userIds = pixelCounts.map(p => p.paintedBy as number);
				const users = await prisma.user.findMany({
					where: { id: { in: userIds }, allianceId: { not: null } },
					select: { id: true, allianceId: true }
				});
				const alliancePixelMap = new Map<number, number>();
				const userAlliance = new Map(users.map(u => [u.id, u.allianceId as number]));
				for (const pc of pixelCounts) {
					const aid = userAlliance.get(pc.paintedBy as number);
					if (aid) {
						const prev = alliancePixelMap.get(aid) || 0;
						alliancePixelMap.set(aid, prev + ((pc._count?.id as number) || 0));
					}
				}
				allianceCounts = [...alliancePixelMap.entries()]
					.map(([id, pixelsPainted]) => ({ allianceId: id, pixelsPainted }))
					.sort((a, b) => b.pixelsPainted - a.pixelsPainted)
					.slice(0, 50);
				leaderboardCache.set(cacheKey, allianceCounts);
			}

			const allianceIds = allianceCounts.map(a => a.allianceId);
			const alliances = await prisma.alliance.findMany({
				where: { id: { in: allianceIds } },
				select: { id: true, name: true }
			});
			const allianceMap = new Map(alliances.map(a => [a.id, a.name]));
			const response = allianceCounts.map(a => ({ id: a.allianceId, name: allianceMap.get(a.allianceId) || "", pixelsPainted: a.pixelsPainted }));

			return res.json(response);
		} catch (error) {
			console.error("Error fetching regional alliances leaderboard:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});
}
