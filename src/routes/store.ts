import { App } from "@tinyhttp/app";
import { WplaceBitMap } from "../utils/bitmap.js";
import { authMiddleware } from "../middleware/auth.js";
import { prisma } from "../config/database.js";
import { calculateChargeRecharge } from "../utils/charges.js";
import { AuthenticatedRequest } from "../types/index.js";
import { User } from "@prisma/client";

const STORE_ITEMS = {
	70: { name: "+5 Max. Charges", price: 500, type: "charges" },
	80: { name: "+30 Paint Charges", price: 500, type: "paint" },
	100: { name: "Unlock Paid Colors", price: 2000, type: "color" },
	110: { name: "Unlock Flag", price: 20_000, type: "flag" }
};

export default function (app: App) {
	app.post("/purchase", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const { product } = req.body;

			if (!product || !product.id) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}

			// Validate product.id is a valid number
			const productId = Number(product.id);
			if (!Number.isInteger(productId) || productId <= 0) {
				console.warn(`[${new Date()
					.toISOString()}] Invalid product ID from ${req.ip}:`, product.id);
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}

			const item = STORE_ITEMS[productId as keyof typeof STORE_ITEMS];
			if (!item) {
				console.warn(`[${new Date()
					.toISOString()}] Unknown product ID from ${req.ip}:`, productId);
				return res.status(400)
					.json({ error: "Invalid item", status: 400 });
			}

			const user = await prisma.user.findUnique({
				where: { id: req.user!.id }
			});

			if (!user) {
				return res.status(401)
					.json({ error: "Unauthorized", status: 401 });
			}

			const amount = product.amount ?? 1;

			// Strict validation for amount
			if (typeof amount !== "number" ||
				!Number.isFinite(amount) ||
				!Number.isInteger(amount) ||
				amount < 1) {
				console.warn(`[${new Date()
					.toISOString()}] Invalid purchase amount from ${req.ip}:`, amount);
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}

			const totalCost = item.price * amount;

			if (user.droplets < totalCost) {
				return res.status(403)
					.json({ error: "Forbidden", status: 403 });
			}

			const updateData: Partial<User> = {
				droplets: user.droplets - totalCost
			};

			switch (item.type) {
			case "charges":
				updateData.maxCharges = user.maxCharges + (5 * amount);
				break;

			case "paint": {
				const currentCharges = calculateChargeRecharge(
					user.currentCharges,
					user.maxCharges,
					user.chargesLastUpdatedAt || new Date(),
					user.chargesCooldownMs
				);
				updateData.currentCharges = currentCharges + (30 * amount);
				updateData.chargesLastUpdatedAt = new Date();
				break;
			}

			case "color":
				if (product.variant) {
					const variant = Number(product.variant);
					if (!Number.isInteger(variant) || variant < 32 || variant > 63) {
						console.warn(`[${new Date()
							.toISOString()}] Invalid color variant from ${req.ip}:`, product.variant);
						return res.status(400)
							.json({ error: "Bad Request", status: 400 });
					}
					const mask = 1 << (variant - 32);
					updateData.extraColorsBitmap = user.extraColorsBitmap | mask;
				}
				break;

			case "flag":
				if (product.variant) {
					const variant = Number(product.variant);
					if (!Number.isInteger(variant) || variant < 1 || variant > 251) {
						console.warn(`[${new Date()
							.toISOString()}] Invalid flag variant from ${req.ip}:`, product.variant);
						return res.status(400)
							.json({ error: "Bad Request", status: 400 });
					}
					const flagsBitmap = user.flagsBitmap
						? WplaceBitMap.fromBase64(Buffer.from(user.flagsBitmap)
							.toString("base64"))
						: new WplaceBitMap();
					flagsBitmap.set(variant, true);
					updateData.flagsBitmap = Buffer.from(flagsBitmap.toBase64(), "base64");
				}
				break;
			}

			await prisma.user.update({
				where: { id: req.user!.id },
				data: updateData
			});

			return res.json({ success: true });
		} catch (error) {
			console.error("Error purchasing item:", error);
			return res.status(403)
				.json({ error: "Forbidden", status: 403 });
		}
	});

	app.post("/flag/equip/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const flagId = Number.parseInt(req.params["id"] as string);

			if (Number.isNaN(flagId) || flagId < 0 || flagId > 251) {
				return res.status(400)
					.json({ error: "Bad Request", status: 400 });
			}

			const user = await prisma.user.findUnique({
				where: { id: req.user!.id }
			});

			if (!user) {
				return res.status(401)
					.json({ error: "Unauthorized", status: 401 });
			}

			// Handle unequip (flagId = 0)
			// idk why first flag frontend only set flagId = 0
			if (flagId === 0) {
				if (user.equippedFlag && user.equippedFlag > 0) {
					await prisma.user.update({
						where: { id: req.user!.id },
						data: { equippedFlag: 0 }
					});
					return res.json({ success: true });
				} else {
					return res.status(403)
						.json({ error: "Forbidden", status: 403 });
				}
			}

			// Handle equip (flagId > 0)
			const flagsBitmap = user.flagsBitmap
				? WplaceBitMap.fromBase64(Buffer.from(user.flagsBitmap)
					.toString("base64"))
				: new WplaceBitMap();

			if (!flagsBitmap.get(flagId)) {
				return res.status(403)
					.json({ error: "Forbidden", status: 403 });
			}

			// Equip the flag
			await prisma.user.update({
				where: { id: req.user!.id },
				data: { equippedFlag: flagId }
			});

			return res.json({ success: true });
		} catch (error) {
			console.error("Error equipping flag:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});
}

