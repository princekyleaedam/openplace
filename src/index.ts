import dotenv from "dotenv";
dotenv.config();

import { App, Response } from "@tinyhttp/app";
import { cors } from "@tinyhttp/cors";
import { cookieParser } from "@tinyhttp/cookie-parser";
import fs from "fs/promises";
import { ServerResponse } from "http";
import { json } from "milliparsec";
import sirv from "sirv";
import admin from "./routes/admin.js";
import alliance from "./routes/alliance.js";
import auth from "./routes/auth.js";
import discord from "./routes/discord.js";
import favoriteLocation from "./routes/favorite-location.js";
import leaderboard from "./routes/leaderboard.js";
import me from "./routes/me.js";
import moderator from "./routes/moderator.js";
import pixel from "./routes/pixel.js";
import reportUser from "./routes/report-user.js";
import store from "./routes/store.js";
import { leaderboardService } from "./services/leaderboard.js";
import { discordBot } from "./discord/bot.js";

const isDev = process.env["NODE_ENV"] !== "production";

const noMatchPage = await fs.readFile("./frontend/404.html", "utf8");

const app = new App({
	settings: {
		networkExtensions: true
	},

	noMatchHandler: async (_req, res) => {
		return res.status(404)
			.set("Content-Type", "text/html")
			.send(noMatchPage);
	}
});

// Fix IP address handling early to prevent @tinyhttp errors
app.use((req, _res, next) => {
	// Ensure req.ip is always a valid IP address
	let ip = req.get("cf-connecting-ip") as string ??
	         req.get("x-forwarded-for") as string ??
	         req.connection?.remoteAddress ??
	         req.ip ??
	         "127.0.0.1";

	// Clean up IP address (remove port, handle multiple IPs)
	if (ip && ip.includes(",")) {
		ip = ip.split(",")[0]?.trim() ?? "";
	}
	if (ip && ip.includes(":")) {
		const parts = ip.split(":");
		ip = parts.length > 2
			? parts.join(":") // IPv6
			: parts[0] ?? ""; // IPv4 with port
	}

	// Validate IP format
	if (!ip || ip.length < 7 || (!ip.includes(".") && !ip.includes(":"))) {
		ip = "127.0.0.1";
	}

	req.ip = ip;
	next?.();
});

app.use(cors());
app.use(cookieParser());

const jsonMiddleware = json({
	payloadLimit: 50 * 1024 * 1024 // 50 MB
});

app.use((_req, res, next) => {
	res.set("cache-control", "private, must-revalidate");
	next?.();
});

app.use((req, res, next) => {
	// Hack for paths that use multipart body or don't need JSON parsing
	if (req.path === "/report-user" || req.path === "/moderator/timeout-user" || req.path === "/admin/ban-user" || req.path === "/me/profile-picture" || req.path === "/me/sessions") {
		return next?.();
	}

	// Wrap JSON middleware with error handling
	try {
		return jsonMiddleware(req, res, next);
	} catch (error) {
		console.warn(`[${new Date()
			.toISOString()}] JSON parsing error for ${req.method} ${req.path} from ${req.ip}:`, error);
		return res.status(400)
			.json({ error: "Invalid JSON format" });
	}
});

// Logging
app.use((req, _res, next) => {
	// Log suspicious requests
	if (req.body && typeof req.body === "string" && req.body.length > 0) {
		console.warn(`[${new Date()
			.toISOString()}] Suspicious request body from ${req.ip} to ${req.method} ${req.path}:`, req.body.slice(0, 100));
	}
	return next?.();
});

admin(app);
alliance(app);
auth(app);
discord(app);
favoriteLocation(app);
leaderboard(app);
me(app);
moderator(app);
pixel(app);
reportUser(app);
store(app);

app.use(sirv("./frontend", {
	dev: isDev,
	setHeaders: (res: ServerResponse, _pathname, _stats) => {
		if (!isDev) {
			(res as Response).set("cache-control", `public, maxage=${5 * 60}, s-maxage=${5 * 60}, stale-while-revalidate=${5 * 60}, stale-if-error=${5 * 60}`);
		}
	}
}));

const port = Number(process.env["BACKEND_PORT"]) || 3000;

app.listen(port, async () => {
	console.log(`Server running on port ${port}`);

	console.log("Starting global leaderboard warmup scheduler (every 1 minute)");
	leaderboardService.warmupGlobalLeaderboards()
		.catch(error => {
			console.error("Initial warmup failed:", error);
		});

	setInterval(async () => {
		try {
			await leaderboardService.warmupGlobalLeaderboards();
			// const timestamp = new Date()
			// 	.toISOString();
			// console.log(`[${timestamp}] Global leaderboards warmup completed`);
		} catch (error) {
			const timestamp = new Date()
				.toISOString();
			console.error(`[${timestamp}] Leaderboard warmup error:`, error);
		}
	}, 1 * 60 * 1000);

	await discordBot.start();
});

async function shutdown() {
	await discordBot.stop();
	// eslint-disable-next-line unicorn/no-process-exit
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
