import { PrismaClient } from "@prisma/client";
import { calculateChargeRecharge } from "../utils/charges.js";

export interface UpdateUserInput {
	name?: string;
	showLastPixel?: boolean;
	discord?: string;
}

const EXPERIMENTS = {
	"2025-09_pawtect": {
		variant: "disabled"
	},
	"2025-09_discord_linking": {
		enabled: false
	}
};

export class UserService {
	constructor(private prisma: PrismaClient) {}

	async getUserProfile(userId: number) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: {
				alliance: true,
				favoriteLocations: true
			}
		});

		if (!user) {
			throw new Error("User not found");
		}

		const updatedCharges = calculateChargeRecharge(
			user.currentCharges,
			user.maxCharges,
			user.chargesLastUpdatedAt,
			user.chargesCooldownMs
		);

		if (updatedCharges !== user.currentCharges) {
			await this.prisma.user.update({
				where: { id: userId },
				data: {
					currentCharges: updatedCharges,
					chargesLastUpdatedAt: new Date()
				}
			});
			user.currentCharges = updatedCharges;
		}

		const flagsBitmap = user.flagsBitmap
			? Buffer.from(user.flagsBitmap)
				.toString("base64")
			: "AA==";

		return {
			id: user.id,
			name: user.name,
			discord: user.discord || "",
			country: user.country,
			banned: user.banned,
			charges: {
				cooldownMs: user.chargesCooldownMs,
				count: user.currentCharges,
				max: user.maxCharges
			},
			droplets: user.droplets,
			equippedFlag: user.equippedFlag,
			extraColorsBitmap: user.extraColorsBitmap,
			favoriteLocations: user.favoriteLocations.map(loc => ({
				id: loc.id,
				name: loc.name,
				latitude: loc.latitude,
				longitude: loc.longitude
			})),
			flagsBitmap,
			role: user.role,
			isCustomer: user.isCustomer,
			level: user.level,
			maxFavoriteLocations: user.maxFavoriteLocations,
			needsPhoneVerification: user.needsPhoneVerification,
			picture: user.picture || "",
			pixelsPainted: user.pixelsPainted,
			showLastPixel: user.showLastPixel,
			timeoutUntil: user.timeoutUntil.toISOString(),
			allianceId: user.allianceId,
			allianceRole: user.allianceRole,
			experiments: EXPERIMENTS
		};
	}

	async updateUser(userId: number, input: UpdateUserInput) {
		const { name, showLastPixel, discord } = input;

		if (name && name.length > 16) {
			throw new Error("The name has more than 16 characters");
		}

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (showLastPixel !== undefined) updateData.showLastPixel = showLastPixel;
		if (discord !== undefined) updateData.discord = discord;

		await this.prisma.user.update({
			where: { id: userId },
			data: updateData
		});

		return { success: true };
	}

	async getProfilePictures(userId: number) {
		return await this.prisma.profilePicture.findMany({
			where: { userId },
			select: {
				id: true,
				url: true
			}
		});
	}

	async ban(userId: number, state: boolean) {
		await this.prisma.user.update({
			where: { id: userId },
			data: { banned: state }
		});
	}

	async timeout(userId: number, state: boolean) {
		const timeoutUntil = new Date();

		if (state) {
			// 30 day timeout
			timeoutUntil.setDate(timeoutUntil.getDate() + 30);
		}

		await this.prisma.user.update({
			where: { id: userId },
			data: {
				timeoutUntil
			}
		});
	}
}
