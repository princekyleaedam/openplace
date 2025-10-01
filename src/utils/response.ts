
export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,
	ALREADY_REPORTED: 208,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	UNAVAILABLE_FOR_LEGAL_REASONS: 451,
	INTERNAL_SERVER_ERROR: 500
} as const;

export const ERROR_MESSAGES = {
	BAD_REQUEST: "Bad Request",
	UNAUTHORIZED: "Unauthorized",
	FORBIDDEN: "Forbidden",
	NOT_FOUND: "Not Found",
	INTERNAL_SERVER_ERROR: "Internal Server Error",
	USER_NOT_FOUND: "User not found",
	NO_ALLIANCE: "No Alliance",
	ALREADY_IN_ALLIANCE: "Already in alliance",
	ALLIANCE_NAME_TAKEN: "Alliance name taken",
	INVALID_INVITE: "Invalid invite",
	ALREADY_REPORTED: "Already Reported",
	REFRESH_TOKEN: "refresh"
} as const;

export function createErrorResponse(message: string, status: number) {
	return { error: message, status };
}

export function createSuccessResponse(data?: any) {
	if (data === undefined) {
		return { success: true };
	}
	return data;
}
