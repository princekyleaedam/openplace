import { App } from "@tinyhttp/app";
import bcrypt from "bcryptjs";
import { JWT_SECRET } from "../config/auth.js";
import { prisma } from "../config/database.js";
import { authMiddleware } from "../middleware/auth.js";
import jwt from "jsonwebtoken";
import fs from "fs/promises";
import { UserService } from "../services/user.js";
import { AuthenticatedRequest } from "../types/index.js";

const userService = new UserService(prisma);

export default function (app: App) {
	app.get("/login", async (_req, res) => {
		const loginHtml = await fs.readFile("./src/public/login.html", "utf8");
		res.setHeader("Content-Type", "text/html");
		return res.send(loginHtml);
	});

	app.post("/login", async (req, res) => {
		try {
			const { username, password } = req.body;

			if (!username || !password) {
				return res.status(400)
					.json({ error: "Username and password required" });
			}

			if (!UserService.isAcceptableUsername(username)) {
				return res.status(401)
					.json({ error: "Invalid username or password" });
			}

			let user = await prisma.user.findFirst({
				where: { name: username }
			});

			if (user) {
				const passwordValid = await bcrypt.compare(password, user.passwordHash ?? "");
				if (!passwordValid) {
					return res.status(401)
						.json({ error: "Invalid username or password" });
				}

				if (req.ip) {
					await userService.setLastIP(user.id, req.ip);
				}
			} else {
				if (!UserService.isValidUsername(username)) {
					return res.status(400)
						.json({ error: "Username must be between 3 and 16 characters and cannot contain special characters." });
				}

				const passwordHash = await bcrypt.hash(password, 10);
				const firstUser = (await prisma.user.count()) === 0;

				user = await prisma.user.create({
					data: {
						name: username,
						passwordHash,
						registrationIP: req.ip!,
						lastIP: req.ip!,
						country: "US", // TODO
						role: firstUser ? "admin" : "user",
						droplets: 1000,
						currentCharges: 20,
						maxCharges: 20,
						pixelsPainted: 0,
						level: 1,
						extraColorsBitmap: 0,
						equippedFlag: 0,
						chargesLastUpdatedAt: new Date()
					}
				});
			}

			const session = await prisma.session.create({
				data: {
					userId: user.id,
					expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
				}
			});

			const token = jwt.sign(
				{
					userId: user.id,
					sessionId: session.id,
					iss: "openplace",
					exp: Math.floor(session.expiresAt.getTime() / 1000),
					iat: Math.floor(Date.now() / 1000)
				},
				JWT_SECRET!
			);

			res.setHeader("Set-Cookie", [
				`j=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`
			]);

			return res.json({ success: true });
		} catch (error) {
			console.error("Login error:", error);
			return res.status(500)
				.json({ error: "Internal Server Error" });
		}
	});

	app.post("/auth/logout", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			if (req.user?.sessionId) {
				await prisma.session.delete({
					where: { id: req.user.sessionId }
				});
			}

			res.setHeader("Set-Cookie", [
				`j=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
			]);

			return res.json({ success: true });
		} catch (error) {
			console.error("Logout error:", error);
			return res.status(500)
				.json({ error: "Internal Server Error" });
		}
	});
}
