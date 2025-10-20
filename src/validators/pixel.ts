import { validatePixelCoordinates, validateSeason, validateTileCoordinates } from "./common.js";

export interface PaintPixelsValidationInput {
	season: string;
	tileX: number;
	tileY: number;
	colors: number[];
	coords: number[];
}

export function validatePaintPixels(input: PaintPixelsValidationInput): string | null {
	const { season, tileX, tileY, colors, coords } = input;

	if (!validateSeason(season)) {
		return "Bad Request";
	}

	if (!validateTileCoordinates(tileX, tileY)) {
		return "Bad Request";
	}

	if (!colors || !coords || !Array.isArray(colors) || !Array.isArray(coords)) {
		return "Bad Request";
	}

	if (colors.length * 2 !== coords.length) {
		return "Bad Request";
	}

	return null;
}

export interface PixelInfoValidationInput {
	season: string;
	tileX: number;
	tileY: number;
	x: number;
	y: number;
}

export function validatePixelInfo(input: PixelInfoValidationInput): string | null {
	const { season, tileX, tileY, x, y } = input;

	if (!validateSeason(season)) {
		return "Bad Request";
	}

	if (!validateTileCoordinates(tileX, tileY)) {
		return "Bad Request";
	}

	if (!validatePixelCoordinates(x, y)) {
		return "Bad Request";
	}

	return null;
}
