import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/auth.js";
import { prisma } from "../config/database.js";
import { NextFunction, Response } from "@tinyhttp/app";
import { AuthenticatedRequest } from "../types/index.js";

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next?: NextFunction) {
	try {
		const token = req.cookies?.j;

		if (!token) {
			return res.status(401)
				.json({ error: "Unauthorized", status: 401 });
		}

		const decoded = jwt.verify(token, JWT_SECRET!) as any;

		if (!decoded.userId || !decoded.sessionId) {
			return res.status(401)
				.json({ error: "Unauthorized", status: 401 });
		}

		if (decoded.exp && Date.now() >= decoded.exp * 1000) {
			return res.status(500)
				.json({
					error: "Internal Server Error. We'll look into it, please try again later.",
					status: 500
				});
		}

		const session = await prisma.session.findUnique({
			where: { id: decoded.sessionId }
		});

		if (!session || session.userId !== decoded.userId || session.expiresAt < new Date()) {
			return res.status(401)
				.json({ error: "Unauthorized", status: 401 });
		}

		req.user = {
			id: decoded.userId,
			sessionId: decoded.sessionId
		};

		return next?.();
	} catch {
		return res.status(401)
			.json({ error: "Unauthorized", status: 401 });
	}
}
