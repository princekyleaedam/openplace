import { App } from "@tinyhttp/app";
import { prisma } from "../config/database.js";
import { authMiddleware } from "../middleware/auth.js";

export default function (app: App) {
	app.post("/favorite-location", authMiddleware, async (req: any, res: any) => {
		try {
			const { latitude, longitude, name } = req.body;

			if (typeof latitude !== "number" || typeof longitude !== "number") {
				return res.status(400)
					.json({ error: "Invalid coordinates", status: 400 });
			}

			const user = await prisma.user.findUnique({
				where: { id: req.user!.id },
				include: { favoriteLocations: true }
			});

			if (!user) {
				return res.status(404)
					.json({ error: "User not found", status: 404 });
			}

			if (user.favoriteLocations.length >= user.maxFavoriteLocations) {
				return res.status(403)
					.json({ error: "Maximum favorite locations reached", status: 403 });
			}

			const favorite = await prisma.favoriteLocation.create({
				data: {
					userId: req.user!.id,
					latitude,
					longitude,
					name: name || ""
				}
			});

			return res.json({
				id: favorite.id,
				success: true
			});
		} catch (error) {
			console.error("Error adding favorite location:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});

	app.delete("/favorite-location/delete", authMiddleware, async (req: any, res: any) => {
		try {
			const locationId = Number.parseInt(req.body.id);

			if (Number.isNaN(locationId)) {
				return res.status(400)
					.json({ error: "Invalid location ID", status: 400 });
			}

			const deleted = await prisma.favoriteLocation.deleteMany({
				where: {
					id: locationId,
					userId: req.user!.id
				}
			});

			if (deleted.count === 0) {
				return res.status(404)
					.json({ error: "Favorite location not found", status: 404 });
			}

			return res.json({ success: true });
		} catch (error) {
			console.error("Error deleting favorite location:", error);
			return res.status(500)
				.json({ error: "Internal Server Error", status: 500 });
		}
	});
}
