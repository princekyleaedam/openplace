import { App, Response } from "@tinyhttp/app";
import { cors } from "@tinyhttp/cors";
import { cookieParser } from "@tinyhttp/cookie-parser";
import dotenv from "dotenv";
import fs from "fs/promises";
import { ServerResponse } from "http";
import { json } from "milliparsec";
import sirv from "sirv";
import { inspect } from "util";
import admin from "./routes/admin.js";
import alliance from "./routes/alliance.js";
import auth from "./routes/auth.js";
import favoriteLocation from "./routes/favorite-location.js";
import leaderboard from "./routes/leaderboard.js";
import me from "./routes/me.js";
import moderator from "./routes/moderator.js";
import pixel from "./routes/pixel.js";
import reportUser from "./routes/report-user.js";
import store from "./routes/store.js";

dotenv.config();

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
app.use((req, res, next) => {
	// Ensure req.ip is always a valid IP address
	let ip = req.get("cf-connecting-ip") as string ?? 
	         req.get("x-forwarded-for") as string ?? 
	         req.connection?.remoteAddress ?? 
	         req.ip ?? 
	         "127.0.0.1";
	
	// Clean up IP address (remove port, handle multiple IPs)
	if (ip.includes(',')) {
		ip = ip.split(',')[0].trim();
	}
	if (ip.includes(':')) {
		const parts = ip.split(':');
		if (parts.length > 2) {
			// IPv6
			ip = parts.join(':');
		} else {
			// IPv4 with port
			ip = parts[0];
		}
	}
	
	// Validate IP format
	if (!ip || ip.length < 7 || (!ip.includes('.') && !ip.includes(':'))) {
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

app.use((req, res, next) => {
	res.set("cache-control", "private, must-revalidate");
	next?.();
});

app.use((req, res, next) => {
	// Hack for paths that use multipart body
	if (req.path === "/report-user" || req.path === "/moderator/timeout-user" || req.path === "/admin/ban-user") {
		return next?.();
	}

	return jsonMiddleware(req, res, next);
});

// Logging
app.use((req, res, next) => {
	const inspectOptions = { colors: true, compact: true, breakLength: Number.POSITIVE_INFINITY };
	const startTime = Date.now();

	// console.log(`[${req.ip}] [${new Date()
	// 	.toISOString()}] ${req.method} ${req.url}`);
	if (req.body && Object.keys(req.body).length > 0) {
		// Disabled since this leaks passwords and sensitive info. Instead log other info seperately.
		// console.log(`[${req.ip}] Body:`, inspect(req.body, inspectOptions));
	}
	

	const originalJson = res.json;
	res.json = function (data) {
		const duration = Date.now() - startTime;
		// this is also pretty annoying. we will log paints and such from logged in accounts
		// if (req.url == "/me") {
		// 	console.log(`[${req.ip}] ${data.name}#${data.id} got user information`);
		// }
		// console.log(`[${req.ip}] Response JSON (${res.statusCode}) [${duration}ms]:`, inspect(data, inspectOptions));
		return originalJson.call(this, data);
	};

	return next?.();
});

admin(app);
alliance(app);
auth(app);
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

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
