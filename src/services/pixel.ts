import { Alliance, Pixel, Prisma, PrismaClient, User } from "@prisma/client";
import { createCanvas } from "@napi-rs/canvas";
import { checkColorUnlocked, COLOR_PALETTE } from "../utils/colors.js";
import { calculateChargeRecharge } from "../utils/charges.js";
import { getRegionForCoordinates, Region } from "../config/regions.js";
import { LEVEL_BASE_PIXEL, LEVEL_EXPONENT, LEVEL_UP_DROPLETS_REWARD, LEVEL_UP_MAX_CHARGES_REWARD, PAINTED_DROPLETS_REWARD } from "../config/pixel.js";

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

export class PixelService {
	public readonly emptyTile: Buffer;

	constructor(private prisma: PrismaClient) {
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
			region: getRegionForCoordinates(tileX, tileY, x, y),
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
		ctx.clearRect(0, 0, 1000, 1000);

		const imageData = ctx.createImageData(1000, 1000);

		const pixels = await this.prisma.pixel.findMany({
			where: { tileX, tileY, season },
			select: {
				x: true,
				y: true,
				colorId: true,
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

	async paintPixels(userId: number, input: PaintPixelsInput, season: number = 0): Promise<PaintPixelsResult> {
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

		const regionCache = new Map();
		const validPixels = [];

		for (const [i, colorId] of colors.entries()) {
			const coord = pairedCoords[i];
			if (!coord) continue;
			const { x, y } = coord;

			if (x === undefined || y === undefined || x < 0 || x >= 1000 || y < 0 || y >= 1000) {
				continue;
			}

			const coordKey = `${tileX},${tileY},${x},${y}`;
			let region;
			if (regionCache.has(coordKey)) {
				region = regionCache.get(coordKey);
			} else {
				region = getRegionForCoordinates(tileX, tileY, x, y);
				regionCache.set(coordKey, region);
			}

			validPixels.push({
				x, y, colorId, region
			});
		}

		const painted = validPixels.length;
		if (painted === 0) {
			return { painted: 0 };
		}

		const userEquippedFlag = user.equippedFlag;
		let totalChargeCost = 0;
		let discountedPixels = 0;

		for (const pixel of validPixels) {
			if (userEquippedFlag && userEquippedFlag === pixel.region.flagId) {
				totalChargeCost += 0.9;
				discountedPixels++;
			} else {
				totalChargeCost += 1;
			}
		}

		if (discountedPixels > 0 && validPixels[0]) {
			console.log(`Applied 10% flag discount to ${discountedPixels} pixels in ${validPixels[0].region.name}`);
		}

		await this.prisma.tile.upsert({
			where: { season_x_y: { season, x: tileX, y: tileY } },
			create: { season, x: tileX, y: tileY },
			update: {}
		});

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
				paintedAt: now
			}));

			// Upsert 1000 pixels at a time for performance, and to avoid the limit of prepared statement placeholders
			for (let i = 0; i < values.length; i += 1000) {
				const batch = values.slice(i, i + 1000);
				await this.prisma.$executeRaw`
					INSERT INTO Pixel (season, tileX, tileY, x, y, colorId, paintedBy, paintedAt)
					VALUES ${Prisma.join(batch.map(v =>
						Prisma.sql`(${v.season}, ${v.tileX}, ${v.tileY}, ${v.x}, ${v.y}, ${v.colorId}, ${v.paintedBy}, ${v.paintedAt})`
					))}
					ON DUPLICATE KEY UPDATE
						colorId = VALUES(colorId),
						paintedBy = VALUES(paintedBy),
						paintedAt = VALUES(paintedAt)
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

		if (user.allianceId) {
			await this.prisma.alliance.update({
				where: { id: user.allianceId },
				data: {
					pixelsPainted: { increment: painted }
				}
			});
		}

		await this.updatePixelTile(tileX, tileY, season);

		return { painted };
	}
}
