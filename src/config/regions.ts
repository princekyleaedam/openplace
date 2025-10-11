import { prisma } from "./database.js";

export interface Region {
	id: number;
	cityId: number;
	name: string;
	number: number;
	countryId: number;
	flagId: number;
}

export function toLatLng(tile: [number, number], pixel: [number, number], opts: { tileSize?: number; canonicalZ?: number } = {}): { latitude: number; longitude: number } {
	const [tileX, tileY] = tile;
	const [pixelX, pixelY] = pixel;

	const tileSize = opts.tileSize ?? 1000;
	const canonicalZ = opts.canonicalZ ?? 11;
	const worldPixels = tileSize * Math.pow(2, canonicalZ);

	const [globalX, globalY] = [tileX * tileSize + pixelX + 0.5, tileY * tileSize + pixelY + 0.5];
	const [normX, normY] = [globalX / worldPixels, globalY / worldPixels];

	const longitude = normX * 360 - 180;
	const latitude = Math.atan(Math.sinh(Math.PI * (1 - 2 * normY))) * 180 / Math.PI;

	return { latitude, longitude };
}

export async function getRegionForCoordinates(tile: [number, number], pixel: [number, number]): Promise<Region> {
	// Find the closest region for this pixel
	const { latitude, longitude } = toLatLng(tile, pixel);

	let delta = 0.1;
	for (let attempt = 0; attempt < 7; attempt++) {
		const regions = await prisma.region.findMany({
			where: {
				latitude: { gte: latitude - delta, lte: latitude + delta },
				longitude: { gte: longitude - delta, lte: longitude + delta }
			},
			take: 250
		});

		if (regions.length > 0) {
			let best = regions[0]!;
			let bestD = Number.POSITIVE_INFINITY;
			for (const region of regions) {
				const dLat = latitude - region.latitude;
				const dLon = longitude - region.longitude;
				const d = dLat * dLat + dLon * dLon;
				if (d < bestD) {
					bestD = d;
					best = region;
				}
			}

			return {
				id: best.id,
				cityId: best.cityId,
				name: best.name,
				number: best.number,
				countryId: best.countryId,
				flagId: best.countryId
			};
		}

		delta *= 2;
	}

	return {
		id: 0,
		cityId: 0,
		name: "openplace",
		number: 1,
		countryId: 13,
		flagId: 13
	};
}
