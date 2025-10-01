import { App } from "@tinyhttp/app";
import { cors } from "@tinyhttp/cors";
import { cookieParser } from "@tinyhttp/cookie-parser";
import dotenv from "dotenv";
import { inspect } from "util";
import admin from "./routes/admin.js";
import alliance from "./routes/alliance.js";
import auth from "./routes/auth.js";
import favoriteLocation from "./routes/favorite-location.js";
import leaderboard from "./routes/leaderboard.js";
import me from "./routes/me.js";
import moderator from "./routes/moderator.js";
import pixel from "./routes/pixel.js";
import store from "./routes/store.js";
import { addPrismaToRequest } from "./config/database.js";
import fs from "fs/promises";

dotenv.config();

const app = new App({
	noMatchHandler: async (_req, res) => {
		const html = await fs.readFile("./frontend/404.html", "utf-8");
		return res.status(404)
			.setHeader("Content-Type", "text/html")
			.send(html);
	}
});

app.use(cors());
app.use(cookieParser());
app.use((req, _res, next) => {
	let body = "";
	req.on("data", chunk => {
		body += chunk.toString();
	});
	req.on("end", () => {
		try {
			req.body = body ? JSON.parse(body) : {};
		} catch {
			req.body = {};
		}
		return next?.();
	});
});

// Logging
app.use((req, res, next) => {
	const inspectOptions = { colors: true, compact: true, breakLength: Number.POSITIVE_INFINITY };
	const startTime = Date.now();
	const requestId = req.get("x-forwarded-for");

	console.log(`[${requestId}] [${new Date()
		.toISOString()}] ${req.method} ${req.url}`);
	console.log(`[${requestId}] Headers:`, inspect(req.headers, inspectOptions));
	if (req.body && Object.keys(req.body).length > 0) {
		console.log(`[${requestId}] Body:`, inspect(req.body, inspectOptions));
	}

	const originalJson = res.json;
	res.json = function (data) {
		const duration = Date.now() - startTime;
		console.log(`[${requestId}] Response JSON (${res.statusCode}) [${duration}ms]:`, inspect(data, inspectOptions));
		return originalJson.call(this, data);
	};

	return next?.();
});

app.use(addPrismaToRequest);

admin(app);
alliance(app);
auth(app);
favoriteLocation(app);
leaderboard(app);
me(app);
moderator(app);
pixel(app);
store(app);

const PORT = Number(process.env["PORT"]) || 3000;

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
