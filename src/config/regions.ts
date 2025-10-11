import { prisma } from "./database.js";

export interface Region {
	id: number;
	cityId: number;
	name: string;
	number: number;
	countryId: number;
	flagId: number;
}

export function toLatLng(tileX: number, tileY: number, pixelX: number, pixelY: number, opts: { tileSize?: number; canonicalZ?: number } = {}): { latitude: number; longitude: number } {
	const TILE_SIZE = opts.tileSize ?? 1000;
	const CANONICAL_Z = opts.canonicalZ ?? 11;
	const WORLD_PIXELS = TILE_SIZE * Math.pow(2, CANONICAL_Z);
	const globalX = tileX * TILE_SIZE + pixelX + 0.5;
	const globalY = tileY * TILE_SIZE + pixelY + 0.5;
	const xNorm = globalX / WORLD_PIXELS;
	const yNorm = globalY / WORLD_PIXELS;
	const longitude = xNorm * 360 - 180;
	const latitude = Math.atan(Math.sinh(Math.PI * (1 - 2 * yNorm))) * 180 / Math.PI;
	return { latitude, longitude };
}

export async function getRegionForCoordinates(tileX: number, tileY: number, x: number, y: number): Promise<Region> {
	const { latitude, longitude } = toLatLng(tileX, tileY, x, y);
	let delta = 0.25; // hmm
	for (let attempt = 0; attempt < 5; attempt++) {
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
