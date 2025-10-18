import { Prisma, PrismaClient } from "@prisma/client";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { checkColorUnlocked, COLOR_PALETTE } from "../utils/colors.js";
import { calculateChargeRecharge } from "../utils/charges.js";
import { Region, RegionService } from "./region.js";
import { LEVEL_BASE_PIXEL, LEVEL_EXPONENT, LEVEL_UP_DROPLETS_REWARD, LEVEL_UP_MAX_CHARGES_REWARD, PAINTED_DROPLETS_REWARD } from "../config/pixel.js";
import { AuthService } from "./auth.js";
import { TicketService } from "./ticket.js";
import { BanReason } from "../types/index.js";
import { UserService } from "./user.js";

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

	constructor(private prisma: PrismaClient) {
		this.regionService = new RegionService(prisma);
		this.authService = new AuthService(prisma);
		this.userService = new UserService(prisma);

		const canvas = createCanvas(1000, 1000);
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, 1000, 1000);
		this.emptyTile = canvas.toBuffer("image/png");
	}

	async getRandomTile(): Promise<RandomTileResult> {
		const result = await this.prisma.pixel.aggregate({
			_max: { id: true }
		});

		const maxId = result._max.id;
		if (!maxId) {
			console.log("Table is empty");
			return {
				pixel: { x: 220, y: 873 },
				tile: { x: 1884, y: 1228 }
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
					name: pixel.user.name,
					allianceId: pixel.user.allianceId || 0,
					allianceName: pixel.user.alliance?.name || "",
					equippedFlag: pixel.user.equippedFlag
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
							name: pixel.user.name,
							allianceId: pixel.user.allianceId || 0,
							allianceName: pixel.user.alliance?.name || "",
							equippedFlag: pixel.user.equippedFlag
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

	async getTileImage(tileX: number, tileY: number, season: number = 0): Promise<{ buffer: Buffer; updatedAt: Date }> {
		const tile = await this.prisma.tile.findUnique({
			where: {
				season_x_y: {
					season,
					x: tileX,
					y: tileY
				}
			}
		});

		if (!tile) {
			return {
				buffer: this.emptyTile,
				updatedAt: new Date(0)
			};
		}

		if (tile.imageData) {
			return {
				buffer: Buffer.from(tile.imageData),
				updatedAt: tile.updatedAt
			};
		}

		return await this.updatePixelTile(tileX, tileY, season);
	}

	async updatePixelTile(tileX: number, tileY: number, season: number = 0): Promise<{ buffer: Buffer; updatedAt: Date }> {
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

		const buffer = canvas.toBuffer("image/png");
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
				imageData: buffer
			},
			update: {
				imageData: buffer
			}
		});

		return { buffer, updatedAt };
	}

	async drawPixelsToTile(pixels: { x: number; y: number; colorId: number }[], tileX: number, tileY: number, season: number = 0): Promise<void> {
		await this.prisma.$transaction(async (tx) => {
			const canvas = createCanvas(1000, 1000);
			const ctx = canvas.getContext("2d");

			const tiles = await tx.$queryRaw<{ season: number; x: number; y: number; imageData: Buffer }[]>(
				Prisma.sql`SELECT season, x, y, imageData FROM Tile WHERE season = ${season} AND x = ${tileX} AND y = ${tileY} LIMIT 1 FOR UPDATE`
			);
			const tile = tiles[0];

			if (tile?.imageData) {
				const image = await loadImage(tile.imageData);
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

			const buffer = canvas.toBuffer("image/png");
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
					imageData: buffer
				},
				update: {
					imageData: buffer
				}
			});
		});
	}

	async paintPixels(account: { userId: number; ip: string; country?: string; }, input: PaintPixelsInput, season: number = 0): Promise<PaintPixelsResult> {
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

		const currentCharges = calculateChargeRecharge(
			user.currentCharges,
			user.maxCharges,
			user.chargesLastUpdatedAt || new Date(),
			user.chargesCooldownMs
		);

		if (currentCharges < colors.length) {
			throw new Error("attempted to paint more pixels than there was charges.");
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

		const regionCache = new Map<string, Region>();
		const validPixels: Array<{ x: number; y: number; colorId: number; coordKey: string; region?: Region }> = [];
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

		const regionPromises = [...uniqueCoords].map(async (coordKey) => {
			if (regionCache.has(coordKey)) {
				return { coordKey, region: regionCache.get(coordKey)! };
			}
			const [tileXStr, tileYStr, xStr, yStr] = coordKey.split(",");
			const region = await this.regionService.getRegionForCoordinates(
				[Number.parseInt(tileXStr), Number.parseInt(tileYStr)],
				[Number.parseInt(xStr), Number.parseInt(yStr)]
			);
			regionCache.set(coordKey, region);
			return { coordKey, region };
		});

		const regionResults = await Promise.all(regionPromises);
		const regionMap = new Map(regionResults.map(r => [r.coordKey, r.region]));

		for (const pixel of validPixels) {
			pixel.region = regionMap.get(pixel.coordKey);
			delete (pixel as any).coordKey;
		}

		const painted = validPixels.length;
		if (painted === 0) {
			return { painted: 0 };
		}

		const userEquippedFlag = user.equippedFlag;
		let totalChargeCost = 0;
		let discountedPixels = 0;

		for (const pixel of validPixels) {
			if (userEquippedFlag && pixel.region && userEquippedFlag === pixel.region.flagId) {
				totalChargeCost += 0.9;
				discountedPixels++;
			} else {
				totalChargeCost += 1;
			}
		}

		// Use insert ignore to avoid race condition when multiple users paint the same tile at the same time
		await this.prisma.$executeRaw(Prisma.sql`INSERT IGNORE INTO Tile (season, x, y) VALUES (${season}, ${tileX}, ${tileY})`);

		const now = new Date();

		if (validPixels.length > 0) {
			const values = validPixels.map(pixel => ({
				season,
				tileX,
				tileY,
				x: pixel.x,
				y: pixel.y,
				colorId: pixel.colorId,
				paintedBy: userId,
				paintedAt: now,
				regionCityId: pixel.region?.cityId,
				regionCountryId: pixel.region?.countryId
			}));

			// Upsert 1000 pixels at a time for performance, and to avoid the limit of prepared statement placeholders
			for (let i = 0; i < values.length; i += 1000) {
				const batch = values.slice(i, i + 1000);
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
			}
		}

		const newCharges = Math.max(0, currentCharges - totalChargeCost);
		const newPixelsPainted = user.pixelsPainted + painted;
		const newLevel = calculateLevel(newPixelsPainted);

		// Rewards calculations
		const levelUpRewards = {
			droplets: Math.floor(newLevel) !== Math.floor(user.level) ? LEVEL_UP_DROPLETS_REWARD : 0,
			maxCharges: LEVEL_UP_MAX_CHARGES_REWARD * (Math.floor(newLevel) - Math.floor(user.level))
		};

		const paintedRewards = {
			droplets: painted * PAINTED_DROPLETS_REWARD
		};

		const newDroplets = user.droplets + levelUpRewards.droplets + paintedRewards.droplets;
		const newMaxCharges = user.maxCharges + levelUpRewards.maxCharges;

		// Use atomic update with retry to handle deadlock
		let retries = 3;
		while (retries > 0) {
			try {
				await this.prisma.user.update({
					where: { id: userId },
					data: {
						currentCharges: newCharges,
						pixelsPainted: newPixelsPainted,
						level: newLevel,
						droplets: newDroplets,
						maxCharges: newMaxCharges,
						chargesLastUpdatedAt: new Date()
					}
				});
				break;
			} catch (error: any) {
				if (error.code === "P2034" && retries > 1) {
					retries--;
					await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
					continue;
				}
				throw error;
			}
		}

		if (user.allianceId) {
			await this.prisma.alliance.update({
				where: { id: user.allianceId },
				data: {
					pixelsPainted: { increment: painted }
				}
			});
		}

		// await this.updatePixelTile(tileX, tileY, season);
		await this.drawPixelsToTile(validPixels, tileX, tileY, season);

		return { painted };
	}
}
