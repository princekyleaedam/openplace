import { App } from "@tinyhttp/app";
import { authMiddleware } from "../middleware/auth.js";
import { handleServiceError } from "../middleware/errorHandler.js";
import { PixelService } from "../services/pixel.js";
import { validateSeason, validateTileCoordinates } from "../validators/common.js";
import { validatePaintPixels, validatePixelInfo } from "../validators/pixel.js";
import { createErrorResponse, HTTP_STATUS } from "../utils/response.js";
import { prisma } from "../config/database.js";

const pixelService = new PixelService(prisma);

export default function (app: App) {
	app.get("/:season/tile/random", async (req: any, res: any) => {
		try {
			const season = req.params["season"];
			if (!validateSeason(season)) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Bad Request", HTTP_STATUS.BAD_REQUEST));
			}

			const result = await pixelService.getRandomTile();
			return res.json(result);
		} catch (error) {
			console.error("Error getting random tile:", error);
			return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
				.json(createErrorResponse("Internal Server Error", HTTP_STATUS.INTERNAL_SERVER_ERROR));
		}
	});

	app.get("/:season/pixel/:tileX/:tileY", async (req: any, res: any) => {
		try {
			const season = req.params["season"];
			const tileX = Number.parseInt(req.params["tileX"]);
			const tileY = Number.parseInt(req.params["tileY"]);
			const x = Number.parseInt(req.query["x"] as string);
			const y = Number.parseInt(req.query["y"] as string);

			const validationError = validatePixelInfo({ season, tileX, tileY, x, y });
			if (validationError) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse(validationError, HTTP_STATUS.BAD_REQUEST));
			}

			const result = await pixelService.getPixelInfo(tileX, tileY, x, y);
			return res.json(result);
		} catch (error) {
			console.error("Error getting pixel info:", error);
			return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
				.json(createErrorResponse("Internal Server Error", HTTP_STATUS.INTERNAL_SERVER_ERROR));
		}
	});

	app.get("/files/:season/tiles/:tileX/:tileY.png", async (req: any, res: any) => {
		try {
			const season = req.params["season"];
			const tileX = Number.parseInt(req.params["tileX"]);
			const tileY = Number.parseInt(req.params["tileY"]);

			if (!validateSeason(season)) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Bad Request", HTTP_STATUS.BAD_REQUEST));
			}

			if (!validateTileCoordinates(tileX, tileY)) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Bad Request", HTTP_STATUS.BAD_REQUEST));
			}

			const imageBuffer = await pixelService.getTileImage(tileX, tileY);

			if (imageBuffer.length === 0) {
				return res.status(HTTP_STATUS.NOT_FOUND)
					.end();
			}

			res.setHeader("Content-Type", "image/png");
			res.setHeader("Cache-Control", "public, max-age=300");
			return res.send(imageBuffer);
		} catch (error) {
			console.error("Error generating tile image:", error);
			return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
				.json(createErrorResponse("Internal Server Error", HTTP_STATUS.INTERNAL_SERVER_ERROR));
		}
	});

	app.post("/:season/pixel/:tileX/:tileY", authMiddleware, async (req: any, res: any) => {
		try {
			const season = req.params["season"];
			const tileX = Number.parseInt(req.params["tileX"]);
			const tileY = Number.parseInt(req.params["tileY"]);
			const { colors, coords } = req.body;

			const validationError = validatePaintPixels({ season, tileX, tileY, colors, coords });
			if (validationError) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse(validationError, HTTP_STATUS.BAD_REQUEST));
			}

			const result = await pixelService.paintPixels(req.user!.id, { tileX, tileY, colors, coords });
			return res.json(result);
		} catch (error) {
			return handleServiceError(error as Error, res);
		}
	});
}
