import { App } from "@tinyhttp/app";
import { prisma } from "../config/database.js";
import { TicketService } from "../services/ticket.js";
import { multipart } from "milliparsec";
import { AuthenticatedRequest, BanReason } from "../types/index.js";
import { authMiddleware } from "../middleware/auth.js";

export default function (app: App) {
	app.post("/report-user", authMiddleware, multipart(), async (req: AuthenticatedRequest, res) => {
		try {
			const reportedUserId = Number.parseInt(req.body.reportedUserId?.at(0) ?? -1);
			const latitude = Number.parseFloat(req.body.latitude?.at(0) ?? -1);
			const longitude = Number.parseFloat(req.body.longitude?.at(0) ?? -1);
			const zoom = Number.parseFloat(req.body.zoom?.at(0) ?? -1);
			const reason = req.body.reason?.at(0);
			const notes = req.body.notes?.at(0);
			const image = req.body.image?.at(0) as File;

			if (!reportedUserId || !latitude || !longitude || !zoom || !reason) {
				return res.status(400)
					.json({ error: "Parameters missing", status: 400 });
			}

			if (notes.length < 5) {
				return res.status(400)
					.json({ error: "Note must be at least 5 characters", status: 400 });
			}

			if (Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(zoom)) {
				return res.status(400)
					.json({ error: "Invalid coordinates", status: 400 });
			}

			if (!Object.values(BanReason).includes(reason)) {
				return res.status(400)
					.json({ error: "Invalid ban reason", status: 400 });
			}

			const ticketService = new TicketService(prisma);
			await ticketService.reportUser({
				reportingUserId: req.user!.id,
				reportedUserId,
				latitude,
				longitude,
				zoom,
				reason,
				notes,
				image
			});

			return res.status(200)
				.json({});
		} catch (error) {
			console.error("Error reporting user:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});
}
