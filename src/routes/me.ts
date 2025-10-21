import { App } from "@tinyhttp/app";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.js";
import { handleServiceError } from "../middleware/errorHandler.js";
import { UserService } from "../services/user.js";
import { validateUpdateUser } from "../validators/user.js";
import { createErrorResponse, HTTP_STATUS } from "../utils/response.js";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest } from "../types/index.js";

// Security validation functions
function validateImageContent(buffer: Buffer, mimeType: string): boolean {
	// Check magic bytes (file signatures)
	const magicBytes = {
		"image/jpeg": [0xFF, 0xD8, 0xFF],
		"image/png": [0x89, 0x50, 0x4E, 0x47],
		"image/gif": [0x47, 0x49, 0x46],
		"image/webp": [0x52, 0x49, 0x46, 0x46] // RIFF header
	}; // patch malicious payload upload
	
	const expectedBytes = magicBytes[mimeType as keyof typeof magicBytes];
	if (!expectedBytes) return false;
	
	// Check if buffer starts with expected magic bytes
	for (const [i, expectedByte] of expectedBytes.entries()) {
		if (buffer[i] !== expectedByte) {
			return false;
		}
	}
	
	// Additional WebP validation (RIFF...WEBP)
	if (mimeType === "image/webp") {
		const webpSignature = buffer.toString("ascii", 8, 12);
		if (webpSignature !== "WEBP") {
			return false;
		}
	}
	
	return true;
}

function isValidBase64(str: string): boolean {
	// Check if string contains only valid base64 characters
	const base64Regex = /^[\d+/A-Za-z]*={0,2}$/;
	if (!base64Regex.test(str)) {
		return false;
	}
	
	// Check if length is valid (multiple of 4 after padding)
	const paddedLength = str.length + (4 - str.length % 4) % 4;
	if (paddedLength % 4 !== 0) {
		return false;
	}
	
	return true;
}

const userService = new UserService(prisma);

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 2 * 1024 * 1024 // 2 MB - consistent limit
	},
	fileFilter: (_req, file, cb) => {
		// Validate MIME type (primary validation)
		const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
		
		if (!allowedMimeTypes.includes(file.mimetype)) {
			cb(new Error("Only image files (JPG, PNG, GIF, WebP) are allowed"));
			return;
		}
		
		// Validate file extension (secondary validation - optional for blob files)
		const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
		const lastDotIndex = file.originalname.lastIndexOf(".");
		
		// If file has extension, validate it
		if (lastDotIndex !== -1) {
			const fileExtension = file.originalname.toLowerCase()
				.slice(Math.max(0, lastDotIndex));
			if (!allowedExtensions.includes(fileExtension)) {
				cb(new Error("Invalid file extension"));
				return;
			}
		}		
		cb(null, true);
	}
});

const useMulterSingle = (field: string) => (req: any, res: any, next?: any) => (upload.single(field) as any)(req as any, res as any, next as any);

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

			if (name !== undefined && typeof name !== "string") {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Invalid name type", HTTP_STATUS.BAD_REQUEST));
			}

			if (showLastPixel !== undefined && typeof showLastPixel !== "boolean") {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Invalid showLastPixel type", HTTP_STATUS.BAD_REQUEST));
			}

			if (discord !== undefined && typeof discord !== "string") {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Invalid discord type", HTTP_STATUS.BAD_REQUEST));
			}

			const validationError = validateUpdateUser({ nickname: name, showLastPixel, discord });
			if (validationError) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse(validationError, HTTP_STATUS.BAD_REQUEST));
			}

			const result = await userService.updateUser(req.user!.id, { nickname: name, showLastPixel, discord });
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

	app.post("/me/profile-picture", authMiddleware, useMulterSingle("image"), async (req: AuthenticatedRequest, res) => {
		try {
			// Check user droplets before processing
			const user = await prisma.user.findUnique({
				where: { id: req.user!.id },
				select: { droplets: true }
			});

			if (!user) {
				return res.status(HTTP_STATUS.NOT_FOUND)
					.json(createErrorResponse("User not found", HTTP_STATUS.NOT_FOUND));
			}

			if (user.droplets < 20_000) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("You do not have enough droplets.", HTTP_STATUS.FORBIDDEN));
			}

			// Handle file upload
			if ((req as any).file) {
				const file = (req as any).file;
				
				// Additional file size check (redundant but safe)
				if (file.size > 2 * 1024 * 1024) {
					return res.status(HTTP_STATUS.BAD_REQUEST)
						.json(createErrorResponse("Image file too large (max 2MB)", HTTP_STATUS.BAD_REQUEST));
				}
				
				// Validate file content - check magic bytes
				const buffer = file.buffer;
				const isValidImage = validateImageContent(buffer, file.mimetype);
				if (!isValidImage) {
					return res.status(HTTP_STATUS.BAD_REQUEST)
						.json(createErrorResponse("Invalid image file content", HTTP_STATUS.BAD_REQUEST));
				}
				
				// Convert file to base64
				const base64 = buffer.toString("base64");
				const mimeType = file.mimetype;
				
				// Validate base64 content
				if (!base64 || base64.length === 0 || !isValidBase64(base64)) {
					return res.status(HTTP_STATUS.BAD_REQUEST)
						.json(createErrorResponse("Invalid file data", HTTP_STATUS.BAD_REQUEST));
				}
				
				// Ensure base64 is properly padded
				const paddedBase64 = base64 + "=".repeat((4 - base64.length % 4) % 4);
				const pictureUrl = `data:${mimeType};base64,${paddedBase64}`;
				
				const result = await userService.updateProfilePicture(req.user!.id, pictureUrl);
				
				return res.json({
					...result,
					pictureUrl
				});
			} else {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Image file is required", HTTP_STATUS.BAD_REQUEST));
			}
		} catch (error) {
			return handleServiceError(error as Error, res);
		}
	});

	app.get("/me/profile-pictures", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const pictures = await userService.getProfilePictures(req.user!.id);
			return res.json(pictures);
		} catch (error) {
			return handleServiceError(error as Error, res);
		}
	});

	app.post("/me/profile-picture/change", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const { pictureId } = req.body || {};
			
			// If no pictureId provided (empty payload {}), set empty profile picture
			if (pictureId === undefined || pictureId === null) {
				const result = await userService.changeProfilePicture(req.user!.id, null);
				return res.json(result);
			}
			
			// Validate pictureId if provided
			if (typeof pictureId !== "number" || pictureId <= 0) {
				return res.status(HTTP_STATUS.BAD_REQUEST)
					.json(createErrorResponse("Invalid picture ID", HTTP_STATUS.BAD_REQUEST));
			}
			
			const result = await userService.changeProfilePicture(req.user!.id, pictureId);
			return res.json(result);
		} catch (error) {
			return handleServiceError(error as Error, res);
		}
	});

	app.delete("/me/sessions", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const result = await userService.logoutFromAllDevices(req.user!.id);
			return res.json(result);
		} catch (error) {
			return handleServiceError(error as Error, res);
		}
	});

	app.delete("/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
		try {
			const { confirmText } = req.body || {};
			const currentNickname = await userService.getNickname(req.user!.id);
			if (!currentNickname || confirmText !== currentNickname) {
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
