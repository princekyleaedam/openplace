import { Prisma, PrismaClient } from "@prisma/client";
import { createCanvas } from "@napi-rs/canvas";
import { checkColorUnlocked, COLOR_PALETTE } from "../utils/colors.js";
import { calculateChargeRecharge } from "../utils/charges.js";
import { getRegionForCoordinates } from "../config/regions.js";
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

export interface PixelInfoResult {
	paintedBy: {
		id: number;
		name: string;
		allianceId: number;
		allianceName: string;
		equippedFlag: number;
	};
	region: any;
}

function calculateLevel(pixelsPainted: number): number {
	return Math.pow(pixelsPainted / LEVEL_BASE_PIXEL, LEVEL_EXPONENT) + 1;
}

export class PixelService {
	public readonly emptyTile: Buffer;

	constructor(private prisma: PrismaClient) {
		const canvas = createCanvas(1, 1);
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, 1, 1);
		this.emptyTile = canvas.toBuffer("image/png");
	}

	async getRandomTile(): Promise<RandomTileResult> {
		const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

		let recentPixelCount = await this.prisma.pixel.count({
			where: {
				paintedAt: {
					gte: recentThreshold
				}
			}
		});

		let firstRecentPixel = await this.prisma.pixel.findFirst({
			select: {
				id: true
			},
			where: {
				paintedAt: {
					gte: recentThreshold
				}
			},
			orderBy: { paintedAt: "desc" }
		});

		if (recentPixelCount === 0 || !firstRecentPixel) {
			recentPixelCount = await this.prisma.pixel.count();

			firstRecentPixel = await this.prisma.pixel.findFirst({
				select: {
					id: true
				},
				orderBy: { paintedAt: "desc" }
			});
		}

		const id = (firstRecentPixel?.id || 1) + Math.floor(Math.random() * recentPixelCount);

		const randomPixel = await this.prisma.pixel.findFirst({
			select: {
				x: true,
				y: true,
				tileX: true,
				tileY: true
			},
			where: {
				id: { gte: id }
			},
			orderBy: { id: "asc" }
		});

		if (!randomPixel) {
			return {
				pixel: { x: 500, y: 500 },
				tile: { x: 1024, y: 1024 }
			};
		}

		return {
			pixel: { x: randomPixel.x, y: randomPixel.y },
			tile: { x: randomPixel.tileX, y: randomPixel.tileY }
		};
	}

	async getPixelInfo(tileX: number, tileY: number, x: number, y: number, season: number = 0): Promise<PixelInfoResult> {
		let paintedBy = {
			id: 0,
			name: "",
			allianceId: 0,
			allianceName: "",
			equippedFlag: 0
		};

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

		if (pixel && pixel.season === season) {
			paintedBy = {
				id: pixel.user.id,
				name: pixel.user.name,
				allianceId: pixel.user.allianceId || 0,
				allianceName: pixel.user.alliance?.name || "",
				equippedFlag: pixel.user.equippedFlag
			};
		}

		const region = getRegionForCoordinates(tileX, tileY, x, y);

		return { paintedBy, region };
	}

	async getTileImage(tileX: number, tileY: number, season: number = 0): Promise<Buffer> {
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
			return this.emptyTile;
		}

		return tile.imageData
			? Buffer.from(tile.imageData)
			: await this.updatePixelTile(tileX, tileY, season);
	}

	async updatePixelTile(tileX: number, tileY: number, season: number = 0): Promise<Buffer> {
		const canvas = createCanvas(1000, 1000);
		const ctx = canvas.getContext("2d");

		ctx.clearRect(0, 0, 1000, 1000);

		const pixels = await this.prisma.pixel.findMany({
			where: { tileX, tileY, season }
		});

		for (const pixel of pixels) {
			const color = COLOR_PALETTE[pixel.colorId];
			if (color) {
				if (pixel.colorId === 0) {
					ctx.clearRect(pixel.x, pixel.y, 1, 1);
				} else {
					const [r, g, b] = color.rgb;
					ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
					ctx.fillRect(pixel.x, pixel.y, 1, 1);
				}
			}
		}

		const imageData = canvas.toBuffer("image/png");

		await this.prisma.tile.upsert({
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
				imageData
			},
			update: {
				imageData
			}
		});

		return imageData;
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
			maxCharges: LEVEL_UP_MAX_CHARGES_REWARD * (Math.floor(newLevel) - Math.floor(user.level)),
		};

		const paintedRewards = {
			droplets: painted * PAINTED_DROPLETS_REWARD,
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
