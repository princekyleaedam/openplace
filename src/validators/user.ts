export interface UpdateUserValidationInput {
	name?: string;
	nickname?: string;
	showLastPixel?: boolean;
	discord?: string;
}

function hasValidCharacters(str: string): boolean {
	const blockedPattern = /<|>|script|javascript:|on\w+\s*=/i;
	return !blockedPattern.test(str);
}


export function validateUpdateUser(input: UpdateUserValidationInput): string | null {
	const { name, nickname, discord } = input;

	if (name !== undefined && typeof name !== "string") {
		return "Invalid name format";
	}

	if (nickname !== undefined && typeof nickname !== "string") {
		return "Invalid nickname format";
	}

	if (discord !== undefined && typeof discord !== "string") {
		return "Invalid discord format";
	}

	if (name) {
		const trimmedName = name.trim();
		if (trimmedName.length === 0) {
			return "The name cannot be empty";
		}
		if (trimmedName.length > 16) {
			return "The name has more than 16 characters";
		}
		if (!hasValidCharacters(trimmedName)) {
			return "The name contains invalid characters (HTML/script tags not allowed)";
		}
	}

	if (nickname !== undefined) {
		const trimmedNickname = nickname.trim();
		if (trimmedNickname.length === 0) {
			return "The nickname cannot be empty";
		}
		if (!hasValidCharacters(trimmedNickname)) {
			return "The nickname contains invalid characters (HTML/script tags not allowed)";
		}
		if (trimmedNickname.length > 16) {
			return "The nickname has more than 16 characters";
		}
	}

	if (discord) {
		const trimmedDiscord = discord.trim();
		if (trimmedDiscord.length > 32) {
			return "The discord has more than 32 characters";
		}
		const discordPattern = /^[a-zA-Z0-9._]+$/;
		if (trimmedDiscord.length > 0 && !discordPattern.test(trimmedDiscord)) {
			return "Invalid discord username format";
		}
	}

	return null;
}
