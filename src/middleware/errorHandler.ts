import { Response } from "@tinyhttp/app";
import { createErrorResponse, ERROR_MESSAGES, HTTP_STATUS } from "../utils/response.js";

export function handleServiceError(error: Error, res: Response) {
	console.error("Service error:", error);

	switch (error.message) {
	case "Bad Request":
		return res.status(HTTP_STATUS.BAD_REQUEST)
			.json(createErrorResponse(ERROR_MESSAGES.BAD_REQUEST, HTTP_STATUS.BAD_REQUEST));

	case "User not found":
		return res.status(HTTP_STATUS.NOT_FOUND)
			.json(createErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND));

	case "No Alliance":
		return res.status(HTTP_STATUS.NOT_FOUND)
			.json(createErrorResponse(ERROR_MESSAGES.NO_ALLIANCE, HTTP_STATUS.NOT_FOUND));

	case "Forbidden":
		return res.status(HTTP_STATUS.FORBIDDEN)
			.json(createErrorResponse(ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN));

	case "refresh":
		return res.status(HTTP_STATUS.UNAUTHORIZED)
			.json(createErrorResponse(ERROR_MESSAGES.REFRESH_TOKEN, HTTP_STATUS.UNAUTHORIZED));

	case "banned":
		return res.status(HTTP_STATUS.UNAVAILABLE_FOR_LEGAL_REASONS)
			.json({ err: "other", suspension: "ban" });

	case "attempted to paint more pixels than there was charges.":
		return res.status(HTTP_STATUS.FORBIDDEN)
			.json(createErrorResponse(error.message, HTTP_STATUS.FORBIDDEN));

	case "attempted to paint with a colour that was not purchased.":
		return res.status(HTTP_STATUS.FORBIDDEN)
			.json(createErrorResponse(error.message, HTTP_STATUS.FORBIDDEN));

	case "The name has more than 16 characters":
		return res.status(HTTP_STATUS.BAD_REQUEST)
			.json(createErrorResponse(error.message, HTTP_STATUS.BAD_REQUEST));

	case "Alliance name is required":
	case "Alliance name taken":
	case "Already in alliance":
		return res.status(HTTP_STATUS.BAD_REQUEST)
			.json(createErrorResponse(error.message, HTTP_STATUS.BAD_REQUEST));

	case "Invalid invite":
		return res.status(HTTP_STATUS.BAD_REQUEST)
			.json(createErrorResponse(ERROR_MESSAGES.INVALID_INVITE, HTTP_STATUS.BAD_REQUEST));

	case "Not Found":
		return res.status(HTTP_STATUS.NOT_FOUND)
			.json(createErrorResponse(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND));

	case "Already Reported":
		return res.status(HTTP_STATUS.ALREADY_REPORTED)
			.json(createErrorResponse(ERROR_MESSAGES.ALREADY_REPORTED, HTTP_STATUS.ALREADY_REPORTED));

	default:
		return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
			.json(createErrorResponse(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR));
	}
}
