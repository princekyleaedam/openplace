import { PrismaClient, User } from "@prisma/client";
import { calculateChargeRecharge } from "../utils/charges.js";
import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from "obscenity";

export interface UpdateUserInput {
	name?: string;
	showLastPixel?: boolean;
	discord?: string;
}

const config = {
	maxFavoriteLocations: 15,
	experiments: {
		"2025-09_pawtect": {
			variant: "disabled"
		},
		"2025-09_discord_linking": {
			enabled: false
		}
	}
};

const usernameRegex = /^[\w-]{3,16}$/i;

const usernameMatcher = new RegExpMatcher({
	...englishDataset.build(),
	...englishRecommendedTransformers
});

export class UserService {
	constructor(private prisma: PrismaClient) {}

	static isValidUsername(username: string): boolean {
		return usernameRegex.test(username);
	}

	static isAcceptableUsername(username: string): boolean {
		return !usernameMatcher.hasMatch(username);
	}

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

		const flagsBitmap = Buffer.from(user.flagsBitmap ?? [0])
			.toString("base64");

		return {
			...config,
			id: user.id,
			name: user.name,
			discord: user.discord ?? "",
			country: user.country,
			banned: user.banned,
			suspensionReason: user.suspensionReason,
			timeoutUntil: user.timeoutUntil.toISOString(),
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
			needsPhoneVerification: user.needsPhoneVerification,
			picture: user.picture ?? "",
			pixelsPainted: user.pixelsPainted,
			showLastPixel: user.showLastPixel,
			allianceId: user.allianceId,
			allianceRole: user.allianceRole
		};
	}

	async updateUser(userId: number, input: UpdateUserInput) {
		const { name, showLastPixel, discord } = input;

		if (name && name.length > 16) {
			throw new Error("The name has more than 16 characters");
		}

		const updateData: Partial<User> = {};
		if (name) {
			updateData.name = name;
		}
		if (showLastPixel) {
			updateData.showLastPixel = showLastPixel;
		}
		if (discord) {
			updateData.discord = discord;
		}

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

	async setLastIP(userId: number, ip: string) {
		await this.prisma.user.update({
			where: { id: userId },
			data: { lastIP: ip }
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
