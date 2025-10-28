import { App } from "@tinyhttp/app";
import crypto from "crypto";
import fs from "fs/promises";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.js";
import { handleServiceError } from "../middleware/errorHandler.js";
import DiscordService from "../services/discord.js";
import { createErrorResponse, HTTP_STATUS } from "../utils/response.js";
import { AuthenticatedRequest } from "../types/index.js";
import { discordBot } from "../discord/bot.js";
import { ACTIVE_COOLDOWN_MS, BOOSTER_COOLDOWN_MS } from "../services/user.js";

const discordService = new DiscordService();

// TODO: Move to Redis
const stateStore = new Map<string, { userId: number; expiresAt: number }>();

setInterval(() => {
	const now = Date.now();
	for (const [state, data] of stateStore.entries()) {
		if (data.expiresAt < now) {
			stateStore.delete(state);
		}
	}
}, 10 * 60 * 1000);

export default function (app: App) {
	app.get("/discord/link", optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
		if (!req.user) {
			return res.redirect("/login");
		}

		const html = await fs.readFile("./src/public/discord-link.html", "utf8");
		res.setHeader("Content-Type", "text/html");
		return res.send(html);
	});

	app.get("/discord/unlink", optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
		if (!req.user) {
			return res.redirect("/login");
		}

		const html = await fs.readFile("./src/public/discord-unlink.html", "utf8");
		res.setHeader("Content-Type", "text/html");
		return res.send(html);
	});

	app.get("/account.css", async (_req, res) => {
		const css = await fs.readFile("./src/public/account.css", "utf8");
		res.setHeader("Content-Type", "text/css");
		return res.send(css);
	});

	app.get("/discord/configured", authMiddleware, (_req, res) => {
		if (!discordService.isConfigured) {
			return res.status(503)
				.json(createErrorResponse("Discord OAuth is not configured", 503));
		}
		return res.json({ configured: true });
	});

	app.get("/discord/auth-url", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			if (!discordService.isConfigured) {
				return res.status(503)
					.json(createErrorResponse("Discord OAuth is not configured", 503));
			}

			if (await discordService.isDiscordLinked(req.user!.id)) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Discord account is already linked", HTTP_STATUS.BAD_REQUEST));
			}

			const stateKey = crypto.randomBytes(32)
				.toString("hex");

			stateStore.set(stateKey, {
				userId: req.user!.id,
				expiresAt: Date.now() + 10 * 60 * 1000
			});

			return res.json({
				url: discordService.getAuthorizationUrl(stateKey)
			});
		} catch (error) {
			return handleServiceError(error as Error, res);
		}
	});

	app.get("/discord/callback", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const { code, state } = req.query;

			if (!code || typeof code !== "string") {
				// TODO: Cleanup
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.send("<h1>Error: Missing authorization code</h1><a href=\"/discord/link\">Try again</a>");
			}

			if (!state || typeof state !== "string") {
				// TODO: Cleanup
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.send("<h1>Error: Missing state parameter</h1><a href=\"/discord/link\">Try again</a>");
			}

			const stateData = stateStore.get(state);
			stateStore.delete(state);
			if (!stateData || stateData.userId !== req.user!.id || stateData.expiresAt < Date.now()) {
				// TODO: Cleanup
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.send("<h1>Error: Invalid or expired state token</h1><a href=\"/discord/link\">Try again</a>");
			}

			const accessToken = await discordService.exchangeCodeForToken(code);
			const discordUser = await discordService.getDiscordUser(accessToken);
			await discordService.linkDiscordAccount(stateData.userId, discordUser);

			const cooldown = await discordBot.updateUserId(discordUser.id);

			let cooldownMessage = "";
			if (cooldown) {
				const seconds = Math.floor(cooldown / 1000);
				if (cooldown === BOOSTER_COOLDOWN_MS) {
					cooldownMessage = `<p><strong>Thanks for boosting our server!</strong> Your paint cooldown has been set to ${seconds} seconds.</p>`;
				} else if (cooldown === ACTIVE_COOLDOWN_MS) {
					cooldownMessage = `<p><strong>Thanks for being an active server member!</strong> Your paint cooldown has been set to ${seconds} seconds.</p>`;
				} else {
					cooldownMessage = `<p>You’re not eligible for reduced paint cooldown time. Check the Discord server’s rules for more information.</p>`;
				}
			} else {
				cooldownMessage = `<p>Unable to check Discord roles. Your cooldown will be updated when the bot syncs.</p>`;
			}

			// TODO: Cleanup
			return res.send(`
				<html>
				<head>
					<title>Discord Linked - openplace</title>
					<link rel="stylesheet" href="/account.css">
				</head>
				<body>
					<div class="login-form">
						<h1>Success!</h1>
						<p>Your Discord account (${discordUser.username}) has been linked.</p>
						${cooldownMessage}
						<a href="/">Back to Home</a>
					</div>
				</body>
				</html>
			`);
		} catch (error) {
			console.error("Discord callback error:", error);

			// TODO: Cleanup
			return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
				.send(`
					<html>
					<head>
						<title>Error - openplace</title>
						<link rel="stylesheet" href="/account.css">
					</head>
					<body>
						<div class="login-form">
							<h1>Error</h1>
							<p>${(error as Error).message || "Failed to link Discord account"}</p>
							<a href="/discord/link">Try again</a>
						</div>
					</body>
					</html>
				`);
		}
	});

	app.post("/discord/unlink", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const isLinked = await discordService.isDiscordLinked(req.user!.id);
			if (!isLinked) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Discord account is not linked", HTTP_STATUS.BAD_REQUEST));
			}

			await discordService.unlinkDiscordAccount(req.user!.id);
			return res.json({
				success: true,
				message: "Discord account unlinked"
			});
		} catch (error) {
			return handleServiceError(error as Error, res);
		}
	});
}
