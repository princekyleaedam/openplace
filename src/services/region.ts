import { PrismaClient } from "@prisma/client";

export interface Region {
	id: number;
	cityId: number;
	name: string;
	number: number;
	countryId: number;
	flagId: number;
}

export class RegionService {
	constructor(private prisma: PrismaClient) {}

	static pixelsToCoordinates(tile: [number, number], pixel: [number, number], { tileSize, canonicalZ }: { tileSize?: number; canonicalZ?: number } = {}): { latitude: number; longitude: number } {
		const [tileX, tileY] = tile;
		const [pixelX, pixelY] = pixel;

		tileSize ??= 1000;
		canonicalZ ??= 11;
		const worldPixels = tileSize * Math.pow(2, canonicalZ);

		const [globalX, globalY] = [tileX * tileSize + pixelX + 0.5, tileY * tileSize + pixelY + 0.5];
		const [normX, normY] = [globalX / worldPixels, globalY / worldPixels];

		const longitude = normX * 360 - 180;
		const latitude = Math.atan(Math.sinh(Math.PI * (1 - 2 * normY))) * 180 / Math.PI;

		return { latitude, longitude };
	}

	async getRegionForCoordinates(tile: [number, number], pixel: [number, number]): Promise<Region> {
		// Find the closest region for this pixel
		const { latitude, longitude } = RegionService.pixelsToCoordinates(tile, pixel);

		let delta = 0.1;
		for (let attempt = 0; attempt < 7; attempt++) {
			const regions = await this.prisma.region.findMany({
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

		// find nearest known region by distance (over oceans/poles)
		const nearest = await this.findNearestRegionByDistance(latitude, longitude);
		if (nearest) {
			return { id: nearest.id, cityId: nearest.cityId, name: nearest.name, number: nearest.number, countryId: nearest.countryId, flagId: nearest.countryId };
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

	private deg2rad(v: number): number { return v * Math.PI / 180; }

	// ref: https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
	private getDistanceFromLatLon(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
		const R = 6371000;
		const dLat = this.deg2rad(b.latitude - a.latitude);
		const dLon = this.deg2rad(b.longitude - a.longitude);
		const lat1 = this.deg2rad(a.latitude);
		const lat2 = this.deg2rad(b.latitude);
		const sinDLat = Math.sin(dLat / 2);
		const sinDLon = Math.sin(dLon / 2);
		const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
		return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
	}

	private async findNearestRegionByDistance(latitude: number, longitude: number) {
		let delta = 1;
		for (let attempt = 0; attempt < 8; attempt++) {
			const regions = await this.prisma.region.findMany({
				where: {
					latitude: { gte: latitude - delta, lte: latitude + delta },
					longitude: { gte: longitude - delta, lte: longitude + delta }
				},
				take: 500
			});
			if (regions.length > 0) {
				let best = regions[0]!;
				let bestD = Number.POSITIVE_INFINITY;
				for (const region of regions) {
					const d = this.getDistanceFromLatLon({ latitude, longitude }, { latitude: region.latitude as unknown as number, longitude: region.longitude as unknown as number });
					if (d < bestD) {
						bestD = d;
						best = region;
					}
				}
				return best;
			}
			delta *= 2;
		}
		return undefined;
	}
}
