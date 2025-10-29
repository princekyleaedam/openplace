import { App } from "@tinyhttp/app";
import { prisma } from "../config/database.js";
import { leaderboardService } from "../services/leaderboard.js";

const validModes = new Set(["today", "week", "month", "all-time"]);

// TODO: Split up file
 
export default function (app: App) {
	app.get("/leaderboard/region/:mode/:country", async (req, res) => {
		try {
			const { mode, country } = req.params;

			if (!mode || !validModes.has(mode)) {
				return res.status(400)
					.json({ error: "Invalid mode", status: 400 });
			}

			const countryId = Number.parseInt(country || "0");
			const limitParam = Number.parseInt(String(req.query["limit"] || "50"));
			const limit = Number.isNaN(limitParam) ? 50 : Math.max(1, Math.min(limitParam, 50));

			const response = await leaderboardService.getLeaderboard("region", mode as any, countryId > 0 ? countryId : undefined, limit);

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

			const response = await leaderboardService.getLeaderboard("country", mode as any, undefined, 50);

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

			const response = await leaderboardService.getLeaderboard("player", mode as any, undefined, 50);
			return res.json(response);
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

			const response = await leaderboardService.getLeaderboard("alliance", mode as any, undefined, 50);
			return res.json(response);
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

			let regionCityId = paramId;
			const regionById = await prisma.region.findUnique({ where: { id: paramId } });
			if (regionById) {
				regionCityId = regionById.cityId;
			}

			const response = await leaderboardService.getLeaderboard("regionPlayers", mode as any, regionCityId, 50);

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

			const response = await leaderboardService.getLeaderboard("regionAlliances", mode as any, regionCityId, 50);

			return res.json(response);
		} catch (error) {
			console.error("Error fetching regional alliances leaderboard:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});
}
