import { Prisma, PrismaClient } from "@prisma/client";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import imagemin from "imagemin";
import pngquant from "imagemin-pngquant";
import { checkColorUnlocked, COLOR_PALETTE } from "../utils/colors.js";
import { calculateChargeRecharge } from "../utils/charges.js";
import { Region, RegionService } from "./region.js";
import { LEVEL_BASE_PIXEL, LEVEL_EXPONENT, LEVEL_UP_DROPLETS_REWARD, LEVEL_UP_MAX_CHARGES_REWARD, PAINTED_DROPLETS_REWARD } from "../config/pixel.js";
import { AuthService } from "./auth.js";
import { BanReason } from "../types/index.js";
import { UserService } from "./user.js";
import { leaderboardService } from "./leaderboard.js";
import { WplaceBitMap } from "../utils/bitmap.js";

export interface PaintPixelsInput {
	tileX: number;
	tileY: number;
	colors: number[];
	coords: number[];
}

export interface PaintPixelsResult {
	painted: number;
}

export interface RandomTileResult {
	pixel: { x: number; y: number };
	tile: { x: number; y: number };
}

export type PixelInfoParams = {
	season: number;
	tileX: number;
	tileY: number;
} & ({
	x0: number;
	y0: number;
	x1: number;
	y1: number;
} | {
	x: number;
	y: number;
});

export interface PixelInfoResult {
	paintedBy?: {
		id: number;
		name?: string;
		allianceId?: number;
		allianceName?: string;
		equippedFlag?: number;
		picture?: string | null;
		discord?: string | null;
		discordUserId?: string | null;
		verified?: boolean;
	}[];
	region: Region;
}

function calculateLevel(pixelsPainted: number): number {
	return Math.pow(pixelsPainted / LEVEL_BASE_PIXEL, LEVEL_EXPONENT) + 1;
}

const BAN_ON_BANNED_IP = process.env["BAN_ON_BANNED_IP"] === "1";

export class PixelService {
	public readonly emptyTile: Buffer;
	private readonly regionService: RegionService;
	private readonly authService: AuthService;
	private readonly userService: UserService;
	private readonly regionCache = new Map<string, { region: Region; timestamp: number }>();
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

	constructor(private prisma: PrismaClient) {
		this.regionService = new RegionService(prisma);
		this.authService = new AuthService(prisma);
		this.userService = new UserService(prisma);

		const canvas = createCanvas(1000, 1000);
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, 1000, 1000);
		this.emptyTile = canvas.toBuffer("image/png");

		// Clean up cache every 10 minutes
		setInterval(() => {
			this.cleanupCache();
		}, 10 * 60 * 1000);
	}

	private cleanupCache(): void {
		const now = Date.now();
		for (const [key, value] of this.regionCache.entries()) {
			if (now - value.timestamp > this.CACHE_TTL) {
				this.regionCache.delete(key);
			}
		}
	}

	async getRandomTile(): Promise<RandomTileResult> {
		const result = await this.prisma.pixel.aggregate({
			_max: { id: true }
		});

		const maxId = result._max.id;
		if (!maxId) {
			console.log("Table is empty");
			return {
				pixel: { x: 500, y: 500 },
				tile: { x: 1024, y: 1024 }
			};
		}

		let randomRow = null;
		while (!randomRow) {
			const randomId = Math.floor(Math.random() * maxId) + 1;
			randomRow = await this.prisma.pixel.findUnique({ where: { id: randomId } });
		}

		return {
			pixel: { x: randomRow.x, y: randomRow.y },
			tile: { x: randomRow.tileX, y: randomRow.tileY }
		};
	}

	async getPixelInfo(params: PixelInfoParams): Promise<PixelInfoResult> {
		const { season, tileX, tileY } = params;
		const paintedBy: PixelInfoResult["paintedBy"] = [];
		let x = 0;
		let y = 0;

		if ("x" in params) {
			x = params.x;
			y = params.y;

			const pixel = await this.prisma.pixel.findUnique({
				where: {
					season_tileX_tileY_x_y: { season, tileX, tileY, x, y }
				},
				include: {
					user: {
						include: { alliance: true }
					}
				}
			});

			if (pixel) {
				paintedBy.push({
					id: pixel.user.id,
					name: pixel.user.nickname || pixel.user.name,
					allianceId: pixel.user.allianceId || 0,
					allianceName: pixel.user.alliance?.name || "",
					equippedFlag: pixel.user.equippedFlag,
					picture: pixel.user.picture,
					discord: pixel.user.discord,
					discordUserId: pixel.user.discordUserId,
					verified: pixel.user.verified
				});
			} else {
				paintedBy.push({
					id: 0
				});
			}
		} else {
			const { x0, y0, x1, y1 } = params;
			x = x0;
			y = y0;

			const items: { season: number; tileX: number; tileY: number; x: number; y: number; }[] = [];
			for (let y = y0; y <= y1; y++) {
				for (let x = x0; x <= x1; x++) {
					items.push({ season, tileX, tileY, x, y });
				}
			}

			const pixels = [];
			for (let i = 0; i < items.length; i += 1000) {
				const slice = items.slice(i, i + 1000);
				pixels.push(...await this.prisma.pixel.findMany({
					where: {
						OR: slice
					},
					take: slice.length,
					include: {
						user: {
							include: { alliance: true }
						}
					}
				}));
			}

			const pixelMap = new Map(pixels.map(item => [`${item.x},${item.y}`, item]));

			for (let y = y0; y <= y1; y++) {
				for (let x = x0; x <= x1; x++) {
					const pixel = pixelMap.get(`${x},${y}`);
					if (pixel) {
						paintedBy.push({
							id: pixel.user.id,
							name: pixel.user.nickname || pixel.user.name,
							allianceId: pixel.user.allianceId || 0,
							allianceName: pixel.user.alliance?.name || "",
							equippedFlag: pixel.user.equippedFlag,
							picture: pixel.user.picture,
							discord: pixel.user.discord,
							discordUserId: pixel.user.discordUserId
						});
					} else {
						paintedBy.push({
							id: 0
						});
					}
				}
			}
		}

		return {
			region: await this.regionService.getRegionForCoordinates([tileX, tileY], [x, y]),
			paintedBy
		};
	}

	async getTileImage(tileX: number, tileY: number, season = 0): Promise<{ buffer: Buffer; updatedAt: Date }> {
		const rows = await this.prisma.$queryRaw<{ imageData: Buffer | null; ts: number | null }[]>(
			Prisma.sql`SELECT imageData, UNIX_TIMESTAMP(updatedAt) as ts FROM Tile WHERE season = ${season} AND x = ${tileX} AND y = ${tileY} LIMIT 1`
		);
		const row = rows[0];
		if (!row) {
			return { buffer: this.emptyTile, updatedAt: new Date() };
		}
		const ts = typeof row.ts === "number" && Number.isFinite(row.ts) ? row.ts : Math.floor(Date.now() / 1000);
		const updatedAt = new Date(ts * 1000);
		if (row.imageData) {
			return { buffer: Buffer.from(row.imageData), updatedAt };
		}
		return await this.updatePixelTile(tileX, tileY, season);
	}

	async updatePixelTile(tileX: number, tileY: number, season = 0): Promise<{ buffer: Buffer; updatedAt: Date }> {
		const canvas = createCanvas(1000, 1000);
		const ctx = canvas.getContext("2d");
		const imageData = ctx.createImageData(1000, 1000);

		const pixels = await this.prisma.pixel.findMany({
			where: { tileX, tileY, season },
			select: {
				x: true,
				y: true,
				colorId: true
			}
		});

		for (const pixel of pixels) {
			const color = COLOR_PALETTE[pixel.colorId];
			if (!color) continue;
			if (pixel.colorId === 0) continue;

			const [r, g, b] = color.rgb;
			const index = (pixel.y * 1000 + pixel.x) * 4;
			imageData.data[index + 0] = r;
			imageData.data[index + 1] = g;
			imageData.data[index + 2] = b;
			imageData.data[index + 3] = 255;
		}
		ctx.putImageData(imageData, 0, 0);

		const buffer = await this.quantize(canvas.toBuffer("image/png"));
		const { updatedAt } = await this.prisma.tile.upsert({
			where: {
				season_x_y: {
					season,
					x: tileX,
					y: tileY
				}
			},
			create: {
				season,
				x: tileX,
				y: tileY,
				imageData: new Uint8Array(buffer)
			},
			update: {
				imageData: new Uint8Array(buffer)
			}
		});

		return { buffer, updatedAt };
	}

	async drawPixelsToTile(pixels: { x: number; y: number; colorId: number }[], tileX: number, tileY: number, season = 0): Promise<void> {
		// Process canvas updates in smaller chunks to prevent memory issues
		const canvasChunkSize = 1000;

		if (pixels.length <= canvasChunkSize) {
			// Small request, process normally
			await this.processCanvasChunk(pixels, tileX, tileY, season);
		} else {
			for (let i = 0; i < pixels.length; i += canvasChunkSize) {
				const chunk = pixels.slice(i, i + canvasChunkSize);
				await this.processCanvasChunk(chunk, tileX, tileY, season);

				// Delay between chunks to prevent memory buildup and reduce contention
				if (i + canvasChunkSize < pixels.length) {
					await new Promise(resolve => setTimeout(resolve, 50));
				}
			}
		}
	}

	private async processCanvasChunk(pixels: { x: number; y: number; colorId: number }[], tileX: number, tileY: number, season: number): Promise<void> {
		let canvas: any = null;
		let image: any = null;

		try {
			await this.prisma.$transaction(async (tx) => {
				canvas = createCanvas(1000, 1000);
				const ctx = canvas.getContext("2d");

				const tiles = await tx.$queryRaw<{ season: number; x: number; y: number; imageData: Buffer }[]>(
					Prisma.sql`SELECT season, x, y, imageData FROM Tile WHERE season = ${season} AND x = ${tileX} AND y = ${tileY} LIMIT 1 FOR UPDATE`
				);
				const tile = tiles[0];

				if (tile?.imageData) {
					image = await loadImage(tile.imageData);
					ctx.drawImage(image, 0, 0);
				} else {
					ctx.clearRect(0, 0, 1000, 1000);
				}

				const imageData = ctx.getImageData(0, 0, 1000, 1000);
				const data = imageData.data;

				for (const pixel of pixels) {
					const color = COLOR_PALETTE[pixel.colorId];
					if (!color) continue;

					const [r, g, b] = color.rgb;
					const a = pixel.colorId === 0 ? 0 : 255;
					const index = (pixel.y * 1000 + pixel.x) * 4;
					data[index + 0] = r;
					data[index + 1] = g;
					data[index + 2] = b;
					data[index + 3] = a;
				}
				ctx.putImageData(imageData, 0, 0);

				const buffer = await this.quantize(canvas.toBuffer("image/png"));
				await tx.tile.upsert({
					where: {
						season_x_y: {
							season,
							x: tileX,
							y: tileY
						}
					},
					create: {
						season,
						x: tileX,
						y: tileY,
						imageData: new Uint8Array(buffer)
					},
					update: {
						imageData: new Uint8Array(buffer)
					}
				});
			});
		} finally {
			// Clean up resources to prevent memory leaks
			if (canvas) {
				canvas = null;
			}
			if (image) {
				image = null;
			}
		}
	}

	private async quantize(buffer: Buffer): Promise<Buffer> {
		return Buffer.from(await imagemin.buffer(buffer, {
			plugins: [
				pngquant({
					posterize: 0,
					quality: [1, 1],
					speed: 9,
					strip: true
				})
			]
		}));
	}

	async paintPixels(account: { userId: number; ip: string; country?: string; }, input: PaintPixelsInput, season = 0): Promise<PaintPixelsResult> {
		const { userId } = account;
		const { tileX, tileY, colors, coords } = input;

		if (!colors || !coords || !Array.isArray(colors) || !Array.isArray(coords)) {
			throw new Error("Bad Request");
		}

		if (colors.length * 2 !== coords.length) {
			throw new Error("Bad Request");
		}

		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user) {
			throw new Error("refresh");
		}

		if (user.banned || user.timeoutUntil > new Date()) {
			await this.userService.ban(userId, true, user.suspensionReason as BanReason);
			throw new Error("banned");
		}

		const ban = await this.authService.getBan(account);
		if (ban) {
			if (BAN_ON_BANNED_IP) {
				await this.userService.ban(userId, true, ban.reason);
			}

			throw new Error("banned");
		}

		for (const colorId of colors) {
			if (!checkColorUnlocked(colorId, user.extraColorsBitmap)) {
				throw new Error("attempted to paint with a colour that was not purchased.");
			}
		}

		const pairedCoords = [];
		for (let i = 0; i < coords.length; i += 2) {
			pairedCoords.push({ x: coords[i], y: coords[i + 1] });
		}

		const validPixels: { x: number; y: number; colorId: number; coordKey: string; region?: Region | undefined }[] = [];
		const uniqueCoords = new Set<string>();

		for (const [i, colorId] of colors.entries()) {
			const coord = pairedCoords[i];
			if (!coord) continue;
			const { x, y } = coord;

			if (x === undefined || y === undefined || x < 0 || x >= 1000 || y < 0 || y >= 1000) {
				continue;
			}

			const coordKey = `${tileX},${tileY},${x},${y}`;
			uniqueCoords.add(coordKey);
			validPixels.push({
				x, y, colorId, coordKey
			});
		}

		// Process region lookups with improved caching
		const regionPromises = [];
		const coordArray = [...uniqueCoords];
		const batchSize = 1000;

		for (let i = 0; i < coordArray.length; i += batchSize) {
			const batch = coordArray.slice(i, i + batchSize);
			const batchPromises = batch.map(async (coordKey) => {
				// Check cache first
				const cached = this.regionCache.get(coordKey);
				if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
					return { coordKey, region: cached.region };
				}

				const [tileXStr, tileYStr, xStr, yStr] = coordKey.split(",");
				if (!tileXStr || !tileYStr || !xStr || !yStr) {
					throw new Error(`Invalid coordinate key: ${coordKey}`);
				}
				const region = await this.regionService.getRegionForCoordinates(
					[Number.parseInt(tileXStr), Number.parseInt(tileYStr)],
					[Number.parseInt(xStr), Number.parseInt(yStr)]
				);

				// Cache the result
				this.regionCache.set(coordKey, { region, timestamp: Date.now() });
				return { coordKey, region };
			});
			regionPromises.push(...batchPromises);
		}

		const regionResults = await Promise.all(regionPromises);
		const regionMap = new Map(regionResults.map(r => [r.coordKey, r.region]));

		for (const pixel of validPixels) {
			pixel.region = regionMap.get(pixel.coordKey) ?? undefined;
			delete (pixel as any).coordKey;
		}

		const painted = validPixels.length;
		if (painted === 0) {
			return { painted: 0 };
		}

		let totalChargeCost = 0;
		let discountedPixels = 0;

		const flagsBitmap = user.flagsBitmap
			? WplaceBitMap.fromBase64(Buffer.from(user.flagsBitmap)
				.toString("base64"))
			: new WplaceBitMap();

		for (const pixel of validPixels) {
			if (pixel.region && flagsBitmap.get(pixel.region.flagId)) {
				totalChargeCost += 0.9;
				discountedPixels++;
			} else {
				totalChargeCost += 1;
			}
		}

		// Use insert ignore to avoid race condition when multiple users paint the same tile at the same time
		await this.prisma.$executeRaw(Prisma.sql`INSERT IGNORE INTO Tile (season, x, y) VALUES (${season}, ${tileX}, ${tileY})`);

		const paintedAt = new Date();

		if (validPixels.length > 0) {
			const values = validPixels.map(pixel => ({
				season,
				tileX,
				tileY,
				x: pixel.x,
				y: pixel.y,
				colorId: pixel.colorId,
				paintedBy: userId,
				paintedAt,
				regionCityId: pixel.region?.cityId,
				regionCountryId: pixel.region?.countryId
			}));

			// Process in smaller batches to avoid memory issues with large requests
			const dbBatchSize = 500;
			for (let i = 0; i < values.length; i += dbBatchSize) {
				const batch = values.slice(i, i + dbBatchSize);
				await this.prisma.$executeRaw`
				INSERT INTO Pixel (season, tileX, tileY, x, y, colorId, paintedBy, paintedAt, regionCityId, regionCountryId)
				VALUES ${Prisma.join(batch.map(v =>
		Prisma.sql`(${v.season}, ${v.tileX}, ${v.tileY}, ${v.x}, ${v.y}, ${v.colorId}, ${v.paintedBy}, ${v.paintedAt}, ${v.regionCityId}, ${v.regionCountryId})`
	))}
				ON DUPLICATE KEY UPDATE
					colorId = VALUES(colorId),
					paintedBy = VALUES(paintedBy),
					paintedAt = VALUES(paintedAt),
					regionCityId = VALUES(regionCityId),
					regionCountryId = VALUES(regionCountryId)
			`;

				// Add delay between batches to prevent database overload
				if (i + dbBatchSize < values.length) {
					await new Promise(resolve => setTimeout(resolve, 10));
				}
			}
		}

		const paintedRewards = {
			droplets: painted * PAINTED_DROPLETS_REWARD
		};

		// Retry logic for handling race conditions and deadlocks
		let retries = 5;
		while (retries > 0) {
			try {
				await this.prisma.$transaction(async (tx) => {
					// Lock user first, then alliance to prevent deadlock
					const rows = await tx.$queryRaw<{ id: number; currentCharges: number; maxCharges: number; pixelsPainted: number; level: number; droplets: number; chargesLastUpdatedAt: Date; chargesCooldownMs: number; extraColorsBitmap: number }[]>(
						Prisma.sql`SELECT id, currentCharges, maxCharges, pixelsPainted, level, droplets, chargesLastUpdatedAt, chargesCooldownMs, extraColorsBitmap FROM User WHERE id = ${userId} LIMIT 1 FOR UPDATE`
					);
					const u = rows[0];
					if (!u) return;

					const currentCharges = calculateChargeRecharge(
						u.currentCharges,
						u.maxCharges,
						u.chargesLastUpdatedAt || new Date(),
						u.chargesCooldownMs
					);

					if (currentCharges < totalChargeCost) {
						throw new Error("attempted to paint more pixels than there was charges.");
					}

					const newCharges = Math.max(0, currentCharges - totalChargeCost);
					const newPixelsPainted = u.pixelsPainted + painted;
					const newLevel = calculateLevel(newPixelsPainted);

					const levelUpRewards = {
						droplets: Math.floor(newLevel) !== Math.floor(u.level) ? LEVEL_UP_DROPLETS_REWARD : 0,
						maxCharges: LEVEL_UP_MAX_CHARGES_REWARD * (Math.floor(newLevel) - Math.floor(u.level))
					};

					// Update user first
					await tx.user.update({
						where: { id: userId },
						data: {
							currentCharges: newCharges,
							pixelsPainted: newPixelsPainted,
							level: newLevel,
							droplets: u.droplets + levelUpRewards.droplets + paintedRewards.droplets,
							maxCharges: u.maxCharges + levelUpRewards.maxCharges,
							chargesLastUpdatedAt: new Date()
						}
					});

					// Then update alliance if user has one
					if (user.allianceId) {
						// Lock alliance to prevent race conditions
						const allianceRows = await tx.$queryRaw<{ id: number; pixelsPainted: number }[]>(
							Prisma.sql`SELECT id, pixelsPainted FROM Alliance WHERE id = ${user.allianceId} LIMIT 1 FOR UPDATE`
						);
						const alliance = allianceRows[0];
						if (alliance) {
							await tx.alliance.update({
								where: { id: user.allianceId },
								data: { pixelsPainted: alliance.pixelsPainted + painted }
							});
						}
					}
				}, {
					timeout: 10_000, // 10 second timeout
					isolationLevel: "ReadCommitted" // Use read committed to reduce lock contention
				});
				break; // Success, exit retry loop
			} catch (error: any) {
				retries--;

				// Check if it's a retryable error (race condition, deadlock, timeout)
				const isRetryableError = (
					error.message?.includes("Record has changed since last read") ||
					error.message?.includes("deadlock") ||
					error.message?.includes("timeout") ||
					error.code === "P2034" ||
					error.code === "P2024"
				);

				if (isRetryableError && retries > 0) {
					// Exponential backoff with jitter
					const baseDelay = 100 * Math.pow(2, 5 - retries);
					const jitter = Math.random() * 50;
					const delay = Math.min(baseDelay + jitter, 1000);

					console.warn(`[PixelService] Retryable error on attempt ${6 - retries}/5: ${error.message}. Retrying in ${delay}ms`);
					await new Promise(resolve => setTimeout(resolve, delay));
					continue;
				}

				// If it's not a retryable error or no retries left, throw the error
				console.error(`[PixelService] Non-retryable error or max retries exceeded:`, error);
				throw error;
			}
		}

        // await this.updatePixelTile(tileX, tileY, season);
		await this.drawPixelsToTile(validPixels, tileX, tileY, season);
		if (painted > 0) {
			let retries = 5;
			while (retries > 0) {
				try {
					await this.updateRegionStats(userId, validPixels);
					break;
				} catch (error) {
					retries--;
					if (retries > 0) {
						console.warn(`[PixelService] Error updating region stats, retrying... (${3 - retries}/3):`, error);
						await new Promise(resolve => setTimeout(resolve, 100 * (3 - retries)));
						continue;
					}
					console.error("[PixelService] Failed to update region stats after retries:", error);
				}
			}

			setImmediate(async () => {
				try {
					await this.invalidateRelevantLeaderboards(userId, validPixels);
				} catch (error) {
					console.error("Error invalidating leaderboards:", error);
				}
			});
		}

		return { painted };
	}

	private async updateRegionStats(userId: number, pixels: any[]): Promise<void> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { allianceId: true }
		});

		const allianceId = user?.allianceId;

		const regionStatsMap = new Map<string, { regionCityId?: number | null; regionCountryId?: number | null; count: number }>();

		for (const pixel of pixels) {
			const regionCityId = pixel.region?.cityId ?? null;
			const regionCountryId = pixel.region?.countryId ?? null;
			const key = `${regionCityId ?? "null"}-${regionCountryId ?? "null"}`;
			const existing = regionStatsMap.get(key);

			if (existing) {
				existing.count++;
			} else {
				regionStatsMap.set(key, {
					regionCityId,
					regionCountryId,
					count: 1
				});
			}
		}

		const today = new Date();
		const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

		await this.prisma.$transaction(async (tx) => {
			for (const stats of regionStatsMap.values()) {
				const updatedRowsStats = await tx.$executeRaw`
					UPDATE UserRegionStats
					SET pixelsPainted = pixelsPainted + ${stats.count}, lastPaintedAt = NOW()
					WHERE userId = ${userId}
					AND regionCityId <=> ${stats.regionCityId}
					AND regionCountryId <=> ${stats.regionCountryId}
					AND allianceId <=> ${allianceId}
					AND timePeriod = ${todayDate}
				` as unknown as number;

				if (!updatedRowsStats || updatedRowsStats === 0) {
					await tx.$executeRaw`
						INSERT INTO UserRegionStats (userId, regionCityId, regionCountryId, allianceId, timePeriod, pixelsPainted, lastPaintedAt)
						VALUES (${userId}, ${stats.regionCityId}, ${stats.regionCountryId}, ${allianceId}, ${todayDate}, ${stats.count}, NOW())
						ON DUPLICATE KEY UPDATE
							pixelsPainted = pixelsPainted + ${stats.count},
							lastPaintedAt = NOW()
					`;
				}

				const updatedRowsDaily = await tx.$executeRaw`
					UPDATE UserRegionStatsDaily
					SET pixelsPainted = pixelsPainted + ${stats.count}, lastPaintedAt = NOW()
					WHERE userId = ${userId}
					AND regionCityId <=> ${stats.regionCityId}
					AND regionCountryId <=> ${stats.regionCountryId}
					AND allianceId <=> ${allianceId}
					AND date = ${todayDate}
				` as unknown as number;

				if (!updatedRowsDaily || updatedRowsDaily === 0) {
					await tx.$executeRaw`
						INSERT INTO UserRegionStatsDaily (userId, regionCityId, regionCountryId, allianceId, date, pixelsPainted, lastPaintedAt)
						VALUES (${userId}, ${stats.regionCityId}, ${stats.regionCountryId}, ${allianceId}, ${todayDate}, ${stats.count}, NOW())
						ON DUPLICATE KEY UPDATE
							pixelsPainted = pixelsPainted + ${stats.count},
							lastPaintedAt = NOW()
					`;
				}
			}
		}, {
			timeout: 10_000,
			isolationLevel: "ReadCommitted"
		});
	}

	private async invalidateRelevantLeaderboards(_userId: number, pixels: any[]): Promise<void> {
		const modes: ("today" | "week" | "month" | "all-time")[] = ["today", "week", "month", "all-time"];
		const uniqueCityIds = new Set<number>();

		for (const pixel of pixels) {
			if (pixel.region?.cityId) {
				uniqueCityIds.add(pixel.region.cityId);
			}
		}

		const invalidations: Promise<void>[] = [];

		// Invalidate region leaderboards
		for (const cityId of uniqueCityIds) {
			for (const mode of modes) {
				invalidations.push(
					leaderboardService.invalidateLeaderboard("regionPlayers", mode, cityId),
					leaderboardService.invalidateLeaderboard("regionAlliances", mode, cityId)
				);
			}
		}

		await Promise.all(invalidations);
	}

	async updateUserRegionStatsForAllianceChange(userId: number, oldAllianceId: number | null, newAllianceId: number | null): Promise<void> {
		try {
			// Get user's existing region stats
			const existingStats = await this.prisma.userRegionStats.findMany({
				where: { userId }
			});

			// Update all existing stats with new alliance
			for (const stat of existingStats) {
				// Update existing record with new alliance
				await this.prisma.$executeRaw`
					UPDATE UserRegionStats
					SET allianceId = ${newAllianceId}
					WHERE userId = ${stat.userId}
					AND regionCityId <=> ${stat.regionCityId}
					AND regionCountryId <=> ${stat.regionCountryId}
					AND allianceId <=> ${oldAllianceId}
					AND timePeriod = ${stat.timePeriod}
				`;

				// And update table for the same day
				const dateString = `${stat.timePeriod.toISOString()
					.split("T")[0]} 00:00:00`;
				await this.prisma.$executeRaw`
					UPDATE UserRegionStatsDaily
					SET allianceId = ${newAllianceId}
					WHERE userId = ${stat.userId}
					AND regionCityId <=> ${stat.regionCityId}
					AND regionCountryId <=> ${stat.regionCountryId}
					AND allianceId <=> ${oldAllianceId}
					AND date = ${dateString}
				`;
			}
		} catch (error) {
			console.error("Error updating user region stats for alliance change:", error);
		}
	}
}

