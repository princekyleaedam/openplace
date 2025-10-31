import { App } from "@tinyhttp/app";

export default function (app: App) {
	app.get("/checkrobots", (_req, res) => {
		const raw = process.env["ALLOW_BOTS"];
		const allowBots = typeof raw === "string" && raw.trim() === "1";
		return res.json({ isBottingAllowed: allowBots });
	});
}
