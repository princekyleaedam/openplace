export const TILE_COUNT = 2048;
export const TILE_SIZE = 1000;
export const ZOOM_LEVEL = 11;
export const CLOSE_ZOOM_LEVEL = 15;

export type Coords = [number, number];
export type LngLat = Coords;

export interface TileCoords {
	tile: Coords;
	pixel: Coords;
}

export function lngLatToTileCoords(lngLat: LngLat): TileCoords {
	const [lng, lat] = lngLat;
	const n = Math.pow(2, ZOOM_LEVEL);

	const tileXFloat = (lng + 180) / 360 * n;
	const latRad = lat * Math.PI / 180;
	const tileYFloat = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

	const [tileX, tileY] = [Math.floor(tileXFloat), Math.floor(tileYFloat)];
	const [x, y] = [Math.floor((tileXFloat - tileX) * TILE_SIZE), Math.floor((tileYFloat - tileY) * TILE_SIZE)];

	return {
		tile: [Math.max(0, Math.min(TILE_COUNT - 1, tileX)), Math.max(0, Math.min(TILE_COUNT - 1, tileY))],
		pixel: [Math.max(0, Math.min(TILE_SIZE - 1, x)), Math.max(0, Math.min(TILE_SIZE - 1, y))]
	};
}

export function tileCoordsToLngLat(coords: TileCoords): LngLat {
	const [tileX, tileY] = coords.tile;
	const [x, y] = coords.pixel;

	const [tileXFloat, tileYFloat] = [tileX + ((x + 0.5) / TILE_SIZE), tileY + ((y + 0.5) / TILE_SIZE)];

	// Web Mercator inverse projection
	const n = Math.pow(2, ZOOM_LEVEL);
	const lng = (tileXFloat / n * 360) - 180;
	const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * tileYFloat / n)));
	const lat = latRad * 180 / Math.PI;
	return [lng, lat];
}

export function snapToPixelGrid(lngLat: LngLat): LngLat {
	return tileCoordsToLngLat(lngLatToTileCoords(lngLat));
}

export function getPixelId(coords: TileCoords): string {
	const [tileX, tileY] = coords.tile;
	const [x, y] = coords.pixel;
	return `${tileX}-${tileY}-${x}-${y}`;
}

export function getPixelBounds(coords: TileCoords): {
	topLeft: LngLat;
	topRight: LngLat;
	bottomLeft: LngLat;
	bottomRight: LngLat;
} {
	const [tileX, tileY] = coords.tile;
	const [x, y] = coords.pixel;

	const [tileXLeft, tileYTop] = [tileX + (x / TILE_SIZE), tileY + (y / TILE_SIZE)];
	const [tileXRight, tileYBottom] = [tileX + ((x + 1) / TILE_SIZE), tileY + ((y + 1) / TILE_SIZE)];

	const n = Math.pow(2, ZOOM_LEVEL);

	const [lngLeft, lngRight] = [(tileXLeft / n * 360) - 180, (tileXRight / n * 360) - 180];
	const [latTopRad, latBottomRad] = [
		Math.atan(Math.sinh(Math.PI * (1 - 2 * tileYTop / n))),
		Math.atan(Math.sinh(Math.PI * (1 - 2 * tileYBottom / n)))
	];
	const [latTop, latBottom] = [latTopRad * 180 / Math.PI, latBottomRad * 180 / Math.PI];

	return {
		topLeft: [lngLeft, latTop],
		topRight: [lngRight, latTop],
		bottomLeft: [lngLeft, latBottom],
		bottomRight: [lngRight, latBottom]
	};
}

// Bresenham's line algorithm - get all pixels between two points
export function getPixelsBetween(from: TileCoords, to: TileCoords): TileCoords[] {
	const pixels: TileCoords[] = [];

	// TODO: Support pixels between tiles
	if (from.tile[0] !== to.tile[0] || from.tile[1] !== to.tile[1]) {
		return [to];
	}

	let [x0, y0] = from.pixel;
	const [x1, y1] = to.pixel;

	const [dx, dy] = [Math.abs(x1 - x0), Math.abs(y1 - y0)];
	const [sx, sy] = [x0 < x1 ? 1 : -1, y0 < y1 ? 1 : -1];
	let err = dx - dy;

	while (true) {
		pixels.push({
			tile: from.tile,
			pixel: [x0, y0]
		});

		if (x0 === x1 && y0 === y1) {
			break;
		}

		const e2 = err * 2;
		if (e2 > -dy) {
			err -= dy;
			x0 += sx;
		}
		if (e2 < dx) {
			err += dx;
			y0 += sy;
		}
	}

	return pixels;
}

export function getTileBounds(tileX: number, tileY: number): [LngLat, LngLat, LngLat, LngLat] {
	const { topLeft } = getPixelBounds({
		tile: [tileX, tileY],
		pixel: [0, 0]
	});

	const { topRight, bottomRight } = getPixelBounds({
		tile: [tileX, tileY],
		pixel: [TILE_SIZE - 1, TILE_SIZE - 1]
	});

	return [
		topLeft,
		[topRight[0], topLeft[1]],
		bottomRight,
		[topLeft[0], bottomRight[1]]
	];
}
