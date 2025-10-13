import { App } from "@tinyhttp/app";
import { authMiddleware } from "../middleware/auth.js";
import { handleServiceError } from "../middleware/errorHandler.js";
import { UserService } from "../services/user.js";
import { validateUpdateUser } from "../validators/user.js";
import { createErrorResponse, HTTP_STATUS } from "../utils/response.js";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest } from "../types/index.js";

const userService = new UserService(prisma);

export default function (app: App) {
	app.get("/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const result = await userService.getUserProfile(req.user!.id);
			return res.json(result);
		} catch (error) {
			return handleServiceError(error as Error, res);
		}
	});

	app.post("/me/update", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const { name, showLastPixel, discord } = req.body;

			const validationError = validateUpdateUser({ name, showLastPixel, discord });
			if (validationError) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse(validationError, HTTP_STATUS.BAD_REQUEST));
			}

			const result = await userService.updateUser(req.user!.id, { name, showLastPixel, discord });
			return res.json(result);
		} catch (error) {
			return handleServiceError(error as Error, res);
		}
	});

	app.get("/me/profile-pictures", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const result = await userService.getProfilePictures(req.user!.id);
			return res.json(result);
		} catch (error) {
			return handleServiceError(error as Error, res);
		}
	});

	app.delete("/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const { confirmText } = req.body || {};
			const currentName = await userService.getUserName(req.user!.id);
			if (!currentName || confirmText !== currentName) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Invalid confirm text", HTTP_STATUS.BAD_REQUEST));
			}
			const result = await userService.deleteAccount(req.user!.id);
			return res.json(result);
		} catch (error) {
			return handleServiceError(error as Error, res);
		}
	});
}
