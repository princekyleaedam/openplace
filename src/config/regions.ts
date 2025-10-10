import { prisma } from "./database.js";

export interface Region {
	id: number;
	cityId: number;
	name: string;
	number: number;
	countryId: number;
	flagId: number;
}

export function toLatLng(tileX: number, tileY: number, pixelX: number, pixelY: number, opts: { tileSize?: number; canonicalZ?: number } = {}): { lat: number; lon: number } {
	const TILE_SIZE = opts.tileSize ?? 1000;
	const CANONICAL_Z = opts.canonicalZ ?? 11;
	const WORLD_PIXELS = TILE_SIZE * Math.pow(2, CANONICAL_Z);
	const globalX = tileX * TILE_SIZE + pixelX + 0.5;
	const globalY = tileY * TILE_SIZE + pixelY + 0.5;
	const xNorm = globalX / WORLD_PIXELS;
	const yNorm = globalY / WORLD_PIXELS;
	const lon = xNorm * 360 - 180;
	const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * yNorm))) * 180 / Math.PI;
	return { lat, lon };
}

export async function getRegionForCoordinates(tileX: number, tileY: number, x: number, y: number): Promise<Region> {
	const { lat, lon } = toLatLng(tileX, tileY, x, y);
	let delta = 0.25; //hmm
	for (let attempt = 0; attempt < 5; attempt++) {
		const regions = await (prisma as any).region.findMany({
			where: {
				lat: { gte: lat - delta, lte: lat + delta },
				lon: { gte: lon - delta, lte: lon + delta }
			},
			take: 250
		});
		if (regions.length > 0) {
			let best = regions[0]!;
			let bestD = Number.POSITIVE_INFINITY;
			for (const r of regions) {
				const dLat = lat - (r as any).lat;
				const dLon = lon - (r as any).lon;
				const d = dLat * dLat + dLon * dLon;
				if (d < bestD) { bestD = d; best = r; }
			}
			return {
				id: (best as any).id,
				cityId: (best as any).cityId,
				name: (best as any).name,
				number: (best as any).number,
				countryId: (best as any).countryId,
				flagId: best.countryId
			};
		}
		delta *= 2;
	}
	return {
		id: 114_594,
		cityId: 4263,
		name: "openplace",
		number: 1,
		countryId: 13,
		flagId: 13
	};
}
