import { App, Response } from "@tinyhttp/app";
import { prisma } from "../config/database.js";
import { TicketService } from "../services/ticket.js";
import { multipart } from "milliparsec";
import { AuthenticatedRequest, BanReason, TicketResolution } from "../types/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { adminMiddleware } from "./admin.js";
import { Ticket } from "@prisma/client";

const ticketService = new TicketService(prisma);

async function makeTicket(req: AuthenticatedRequest, res: Response): Promise<Ticket | undefined> {
	const reportedUserId = Number.parseInt(req.body.reportedUserId?.at(0) ?? -1);
	const latitude = Number.parseFloat(req.body.latitude?.at(0) ?? -1);
	const longitude = Number.parseFloat(req.body.longitude?.at(0) ?? -1);
	const zoom = Number.parseFloat(req.body.zoom?.at(0) ?? -1);
	const reason = req.body.reason?.at(0);
	const notes = req.body.notes?.at(0);
	const image = req.body.image?.at(0) as File;

	if (!reportedUserId || !latitude || !longitude || !zoom || !reason) {
		res.status(400)
			.json({ error: "Parameters missing", status: 400 });
		return;
	}

	if (notes.length < 5) {
		res.status(400)
			.json({ error: "Note must be at least 5 characters", status: 400 });
		return;
	}

	if (Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(zoom)) {
		res.status(400)
			.json({ error: "Invalid coordinates", status: 400 });
		return;
	}

	if (!Object.values(BanReason)
		.includes(reason)) {
		res.status(400)
			.json({ error: "Invalid ban reason", status: 400 });
		return;
	}

	return await ticketService.reportUser({
		reportingUserId: req.user!.id,
		reportedUserId,
		latitude,
		longitude,
		zoom,
		reason,
		notes,
		image
	});
}

export default function (app: App) {
	app.post("/report-user", authMiddleware, multipart(), async (req: AuthenticatedRequest, res) => {
		try {
			const ticket = await makeTicket(req, res);
			if (!ticket) {
				return;
			}

			return res.status(200)
				.json({});
		} catch (error) {
			console.error("Error reporting user:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.post("/admin/ban-user", authMiddleware, adminMiddleware, multipart(), async (req: AuthenticatedRequest, res) => {
		try {
			const ticket = await makeTicket(req, res);
			if (!ticket) {
				return;
			}

			await ticketService.resolve(ticket.id, req.user!.id, TicketResolution.Ban);

			return res.status(200)
				.json({});
		} catch (error) {
			console.error("Error reporting user:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.post("/moderator/timeout-user", authMiddleware, adminMiddleware, multipart(), async (req: AuthenticatedRequest, res) => {
		try {
			const ticket = await makeTicket(req, res);
			if (!ticket) {
				return;
			}

			await ticketService.resolve(ticket.id, req.user!.id, TicketResolution.Timeout);

			return res.status(200)
				.json({});
		} catch (error) {
			console.error("Error reporting user:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});
}
