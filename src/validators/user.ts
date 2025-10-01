export interface UpdateUserValidationInput {
	name?: string;
	showLastPixel?: boolean;
	discord?: string;
}

export function validateUpdateUser(input: UpdateUserValidationInput): string | null {
	const { name } = input;

	if (name && name.length > 16) {
		return "The name has more than 16 characters";
	}

	return null;
}
