import { App, Response } from "@tinyhttp/app";
import { prisma } from "../config/database.js";
import { TicketService } from "../services/ticket.js";
import { AuthenticatedRequest, BanReason, TicketResolution } from "../types/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { adminMiddleware } from "./admin.js";
import { Ticket } from "@prisma/client";
import multer from "multer";

const ticketService = new TicketService(prisma);

async function makeTicket(req: AuthenticatedRequest, res: Response): Promise<Ticket | undefined> {
	const reportedUserId = Number.parseInt(req.body.reportedUserId ?? -1);
	const latitude = Number.parseFloat(req.body.latitude ?? -1);
	const longitude = Number.parseFloat(req.body.longitude ?? -1);
	const zoom = Number.parseFloat(req.body.zoom ?? -1);
	const reason = req.body.reason;
	const notes = req.body.notes;
	const image = req.file;

	if (!reportedUserId || !latitude || !longitude || !zoom || !reason) {
		res.status(400)
			.json({ error: "Parameters missing", status: 400 });
		return;
	}

	// negative user ids can correlate to the suspended account user or a system account. so we are going to block those requests.
	if (reportedUserId < 0) {
		res.status(400)
			.json({ error: "You cannot report a user id with a negative integer.", status: 400 });
		return;
	}

	if (!notes || notes.length < 5) {
		res.status(400)
			.json({ error: "Note must be at least 5 characters", status: 400 });
		return;
	}

	if (!image) {
		res.status(400)
			.json({ error: "Image is required", status: 400 });
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
		image: image as Express.Multer.File
	});
}

export default function (app: App) {
	const imageUpload = multer({
		storage: multer.memoryStorage(),
		limits: {
			fileSize: 10 * 1024 * 1024, // 10MB
			files: 1
		},
		fileFilter: (_req, file, cb) => {
			// Chỉ cho phép image files
			if (file.mimetype.startsWith("image/")) {
				cb(null, true);
			} else {
				cb(new Error("Only image files are allowed"));
			}
		}
	});

	const useMulterSingle = (field: string) => (req: any, res: any, next?: any) => (imageUpload.single(field) as any)(req as any, res as any, next as any);

	app.post("/report-user", authMiddleware, useMulterSingle("image"), async (req: AuthenticatedRequest, res) => {
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

	app.post("/admin/ban-user", authMiddleware, adminMiddleware, useMulterSingle("image"), async (req: AuthenticatedRequest, res) => {
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

	app.post("/moderator/timeout-user", authMiddleware, adminMiddleware, useMulterSingle("image"), async (req: AuthenticatedRequest, res) => {
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
