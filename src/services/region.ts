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

	private cache = new Map<string, Region>();
	private inflight = new Map<string, Promise<Region>>();
	private static indexLoaded = false;
	private static indexLoadingPromise: Promise<void> | null = null;
	private static binSizeDeg = 1;
	private static bins = new Map<string, {
		id: number;
		cityId: number;
		name: string;
		number: number;
		countryId: number;
		latitude: number;
		longitude: number
	}[]>();
	private static kd: { nearest: (pt: { latitude: number; longitude: number }) => any | null } | null = null;
	private staticKey(lat: number, lon: number): string {
		const rLat = Math.round(lat * 10_000) / 10_000;
		const rLon = Math.round(lon * 10_000) / 10_000;
		return `${rLat}:${rLon}`;
	}
	private static binKey(lat: number, lon: number): string {
		const s = RegionService.binSizeDeg;
		const bLat = Math.floor(lat / s) * s;
		const bLon = Math.floor(lon / s) * s;
		return `${bLat}:${bLon}`;
	}
	private static neighbors(lat: number, lon: number, radiusBins: number): string[] {
		const s = RegionService.binSizeDeg;
		const bLat = Math.floor(lat / s);
		const bLon = Math.floor(lon / s);
		const keys: string[] = [];
		for (let dy = -radiusBins; dy <= radiusBins; dy++) {
			for (let dx = -radiusBins; dx <= radiusBins; dx++) {
				keys.push(`${(bLat + dy) * s}:${(bLon + dx) * s}`);
			}
		}
		return keys;
	}
	private static async ensureIndex(prisma: PrismaClient): Promise<void> {
		if (RegionService.indexLoaded) return;
		if (RegionService.indexLoadingPromise) {
			await RegionService.indexLoadingPromise;
			return;
		}
		RegionService.indexLoadingPromise = (async () => {
			const rows = await prisma.region.findMany({
				select: {
					id: true,
					cityId: true,
					name: true,
					number: true,
					countryId: true,
					latitude: true,
					longitude: true
				}
			});
			for (const r of rows) {
				const key = RegionService.binKey(r.latitude as unknown as number, r.longitude as unknown as number);
				if (!RegionService.bins.has(key)) RegionService.bins.set(key, []);
				RegionService.bins.get(key)!.push({
					id: r.id,
					cityId: r.cityId,
					name: r.name,
					number: r.number,
					countryId: r.countryId,
					latitude: r.latitude as unknown as number,
					longitude: r.longitude as unknown as number
				});
			}

			// FORGIVE ME FATHER FOR I HAVE SINNED T.T
			// Build a lightweight KD-Tree (2D) for fast nearest lookup (lazy version no lib)
			// TODO: Lazy-calculate neighbors and cache to database instead of in-memory
			interface Point {
				latitude: number;
				longitude: number;
				id: number;
				cityId: number;
				name: string;
				number: number;
				countryId: number
			}
			const pts: Point[] = rows.map(r => ({
				latitude: r.latitude as unknown as number,
				longitude: r.longitude as unknown as number,
				id: r.id,
				cityId: r.cityId,
				name: r.name,
				number: r.number,
				countryId: r.countryId
			}));

			interface Node { p: Point; axis: 0 | 1; left: Node | null; right: Node | null }

			function build(points: Point[], depth: number): Node | null {
				if (points.length === 0) return null;
				const axis: 0 | 1 = (depth % 2) as 0 | 1;
				points.sort((a, b) => (axis === 0 ? a.latitude - b.latitude : a.longitude - b.longitude));
				const mid = Math.floor(points.length / 2);
				const node: Node = { p: points[mid] as Point, axis, left: null, right: null };
				node.left = build(points.slice(0, mid), depth + 1);
				node.right = build(points.slice(mid + 1), depth + 1);
				return node;
			}
			const root = build(pts, 0);
			function sq(a: number) { return a * a }
			function dist2(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
				return sq(a.latitude - b.latitude) + sq(a.longitude - b.longitude);
			}
			function nearest(pt: { latitude: number; longitude: number }): Point | null {
				let best: Point | null = null;
				let bestD = Number.POSITIVE_INFINITY;
				function search(node: Node | null) {
					if (!node) return;
					const np = node.p as Point;
					const d = dist2(pt, np);
					if (d < bestD) { bestD = d; best = np }
					const axis = node.axis;
					const delta = (axis === 0 ? pt.latitude - np.latitude : pt.longitude - np.longitude);
					const first = delta < 0 ? node.left : node.right;
					const second = delta < 0 ? node.right : node.left;
					search(first);
					if (delta * delta < bestD) search(second);
				}
				search(root);
				return best;
			}
			RegionService.kd = { nearest: (pt) => nearest(pt) };

			RegionService.indexLoaded = true;
		})()
			.finally(() => {
				RegionService.indexLoadingPromise = null;
			});
		await RegionService.indexLoadingPromise;
	}

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
		const { latitude, longitude } = RegionService.pixelsToCoordinates(tile, pixel);

		const key = this.staticKey(latitude, longitude);
		const cached = this.cache.get(key);
		if (cached) return cached;
		const existing = this.inflight.get(key);
		if (existing) return existing;

		const work = (async () => {
			const nearest = await this.findNearestRegionByDistance(latitude, longitude);
			if (nearest) {
				// console.log("nearest", nearest);
				const result = {
					id: nearest.id,
					cityId: nearest.cityId,
					name: nearest.name,
					number: nearest.number,
					countryId: nearest.countryId,
					flagId: nearest.countryId
				} as Region;

				this.cache.set(key, result);
				return result;
			}

			return {
				id: 0,
				cityId: 0,
				name: "openplace",
				number: 1,
				countryId: 13,
				flagId: 13
			};
		})();

		this.inflight.set(key, work);
		try {
			const r = await work;
			return r;
		} finally {
			this.inflight.delete(key);
		}
	}

	private deg2rad(v: number): number { return v * Math.PI / 180 }

	// ref: https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
	private getDistanceFromLatLon(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
		const R = 6_371_000;
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
		await RegionService.ensureIndex(this.prisma);
		if (RegionService.kd) {
			const p = RegionService.kd.nearest({ latitude, longitude });
			if (p) return {
				id: p.id,
				cityId:
				p.cityId,
				name: p.name,
				number: p.number,
				countryId: p.countryId,
				latitude: p.latitude,
				longitude: p.longitude
			};
		}
		let radius = 0;
		for (let iter = 0; iter < 6; iter++) {
			const keys = RegionService.neighbors(latitude, longitude, radius);
			let best: { id: number; cityId: number; name: string; number: number; countryId: number; latitude: number; longitude: number } | null = null;
			let bestD = Number.POSITIVE_INFINITY;
			for (const k of keys) {
				const bucket = RegionService.bins.get(k);
				if (!bucket) continue;
				for (const region of bucket) {
					const d = this.getDistanceFromLatLon(
						{ latitude, longitude }, {
							latitude: region.latitude,
							longitude: region.longitude
						});
					if (d < bestD) {
						bestD = d;
						best = region;
					}
				}
			}
			if (best) return best;
			radius += 1;
		}
		return null;
	}
}
