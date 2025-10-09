import { PrismaClient } from "@prisma/client";
import { UserService } from "./user";
import { ValidationError } from "../utils/error";

export interface CreateAllianceInput {
	name: string;
}

export interface UpdateAllianceDescriptionInput {
	description: string;
}

export interface UpdateAllianceHQInput {
	latitude: number;
	longitude: number;
}

const PAGINATION_CONSTANTS = {
	PAGE_SIZE: 50
} as const;

export class AllianceService {
	constructor(private prisma: PrismaClient) {}

	static isValidAllianceName(name: string): boolean {
		return name.length > 0 && name.length <= 13;
	}

	async getUserAlliance(userId: number) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: { alliance: true }
		});

		if (!user || !user.alliance) {
			throw new Error("No Alliance");
		}

		const memberCount = await this.prisma.user.count({
			where: { allianceId: user.alliance.id }
		});

		return {
			id: user.alliance.id,
			name: user.alliance.name,
			description: user.alliance.description || "",
			hq: user.alliance.hqLatitude && user.alliance.hqLongitude
				? {
						latitude: user.alliance.hqLatitude,
						longitude: user.alliance.hqLongitude
					}
				: null,
			members: memberCount,
			pixelsPainted: user.alliance.pixelsPainted || 0,
			role: user.allianceRole,
			createdAt: user.alliance.createdAt.toISOString(),
			updatedAt: user.alliance.updatedAt.toISOString()
		};
	}

	async createAlliance(userId: number, input: CreateAllianceInput) {
		const { name } = input;

		if (!name || typeof name !== "string") {
			throw new ValidationError("empty_name");
		}

		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (user?.allianceId) {
			throw new ValidationError("Already in alliance");
		}

		const existingAlliance = await this.prisma.alliance.findUnique({
			where: { name }
		});

		if (existingAlliance) {
			throw new ValidationError("name_taken");
		}

		if (!AllianceService.isValidAllianceName(name)) {
			throw new ValidationError("max_characters");
		}

		if (!UserService.isAcceptableUsername(name)) {
			throw new ValidationError("max_characters");
		}

		const alliance = await this.prisma.alliance.create({
			data: {
				name,
				description: "",
				pixelsPainted: 0
			}
		});

		await this.prisma.user.update({
			where: { id: userId },
			data: {
				allianceId: alliance.id,
				allianceRole: "admin"
			}
		});

		return { id: alliance.id };
	}

	async updateDescription(userId: number, input: UpdateAllianceDescriptionInput) {
		const { description } = input;

		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.allianceId || user.allianceRole !== "admin") {
			throw new Error("Forbidden");
		}

		if (!UserService.isAcceptableUsername(description)) {
			throw new ValidationError("Invalid alliance description");
		}

		await this.prisma.alliance.update({
			where: { id: user.allianceId },
			data: { description }
		});

		return { success: true };
	}

	async getInvites(userId: number) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.allianceId || user.allianceRole !== "admin") {
			throw new Error("Forbidden");
		}

		let invite = await this.prisma.allianceInvite.findFirst({
			where: { allianceId: user.allianceId }
		});

		if (!invite) {
			invite = await this.prisma.allianceInvite.create({
				data: { allianceId: user.allianceId }
			});
		}

		return [invite.id];
	}

	async joinAlliance(userId: number, inviteId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user) {
			throw new Error("User not found");
		}

		if (!inviteId) {
			throw new ValidationError("Invalid invite");
		}

		const inviteRecord = await this.prisma.allianceInvite.findUnique({
			where: { id: inviteId }
		});

		if (!inviteRecord) {
			throw new Error("Not Found");
		}

		if (user.allianceId === inviteRecord.allianceId) {
			return { success: "true" };
		}

		if (user.allianceId) {
			throw new ValidationError("Already Reported");
		}

		const bannedUser = await this.prisma.bannedUser.findUnique({
			where: {
				userId_allianceId: {
					userId,
					allianceId: inviteRecord.allianceId
				}
			}
		});

		if (bannedUser) {
			throw new Error("Forbidden");
		}

		await this.prisma.user.update({
			where: { id: userId },
			data: {
				allianceId: inviteRecord.allianceId,
				allianceRole: "member"
			}
		});

		return { success: "true" };
	}

	async leaveAlliance(userId: number) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.allianceId) {
			throw new Error("Forbidden");
		}

		if (user.allianceRole === "admin") {
			// Check if this is the last admin
			const adminCount = await this.prisma.user.count({
				where: {
					allianceId: user.allianceId,
					allianceRole: "admin"
				}
			});

			if (adminCount <= 1) {
				// Hand admin to another member if possible
				const newAdmin = await this.prisma.user.findFirst({
					where: {
						allianceId: user.allianceId,
						allianceRole: "member"
					}
				});

				if (newAdmin) {
					await this.prisma.user.update({
						where: { id: newAdmin.id },
						data: { allianceRole: "admin" }
					});
				}
			}
		}

		await this.prisma.user.update({
			where: { id: userId },
			data: {
				allianceId: null,
				allianceRole: "member"
			}
		});

		return { success: true };
	}

	async updateHeadquarters(userId: number, input: UpdateAllianceHQInput) {
		const { latitude, longitude } = input;

		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.allianceId || user.allianceRole !== "admin") {
			throw new Error("Forbidden");
		}

		await this.prisma.alliance.update({
			where: { id: user.allianceId },
			data: {
				hqLatitude: latitude,
				hqLongitude: longitude
			}
		});

		return { success: true };
	}

	async getMembers(userId: number, page: number) {
		const pageSize = PAGINATION_CONSTANTS.PAGE_SIZE;

		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.allianceId || user.allianceRole !== "admin") {
			throw new Error("Forbidden");
		}

		const members = await this.prisma.user.findMany({
			where: { allianceId: user.allianceId },
			skip: page * pageSize,
			take: pageSize + 1,
			select: {
				id: true,
				name: true,
				allianceRole: true
			}
		});

		const hasNext = members.length > pageSize;
		const data = hasNext ? members.slice(0, -1) : members;

		return {
			data: data.map(member => ({
				id: member.id,
				name: member.name,
				role: member.allianceRole
			})),
			hasNext
		};
	}

	async getBannedMembers(userId: number, page: number) {
		const pageSize = PAGINATION_CONSTANTS.PAGE_SIZE;

		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.allianceId || user.allianceRole !== "admin") {
			throw new Error("Forbidden");
		}

		const bannedUsers = await this.prisma.bannedUser.findMany({
			where: { allianceId: user.allianceId },
			skip: page * pageSize,
			take: pageSize + 1
		});

		const hasNext = bannedUsers.length > pageSize;
		const data = hasNext ? bannedUsers.slice(0, -1) : bannedUsers;

		return {
			data: data.map(banned => ({
				id: banned.userId,
				name: `User ${banned.userId}`
			})),
			hasNext
		};
	}

	async promoteUser(userId: number, promotedUserId: number) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.allianceId || user.allianceRole !== "admin") {
			throw new Error("Forbidden");
		}

		await this.prisma.user.update({
			where: {
				id: promotedUserId,
				allianceId: user.allianceId
			},
			data: { allianceRole: "admin" }
		});
	}

	async banUser(userId: number, bannedUserId: number) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.allianceId || user.allianceRole !== "admin") {
			throw new Error("Forbidden");
		}

		await this.prisma.user.update({
			where: { id: bannedUserId },
			data: { allianceId: null, allianceRole: "member" }
		});

		await this.prisma.bannedUser.create({
			data: {
				userId: bannedUserId,
				allianceId: user.allianceId
			}
		});

		return { success: true };
	}

	async unbanUser(userId: number, unbannedUserId: number) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.allianceId || user.allianceRole !== "admin") {
			throw new Error("Forbidden");
		}

		await this.prisma.bannedUser.delete({
			where: {
				userId_allianceId: {
					userId: unbannedUserId,
					allianceId: user.allianceId
				}
			}
		});

		return { success: true };
	}

	async getLeaderboard(userId: number, _mode: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.allianceId) {
			throw new Error("Forbidden");
		}

		const members = await this.prisma.user.findMany({
			where: { allianceId: user.allianceId },
			orderBy: { pixelsPainted: "desc" },
			take: 50,
			select: {
				id: true,
				name: true,
				equippedFlag: true,
				pixelsPainted: true,
				showLastPixel: true
			}
		});

		return members.map(member => ({
			userId: member.id,
			name: member.name,
			equippedFlag: member.equippedFlag,
			pixelsPainted: member.pixelsPainted,
			...(member.showLastPixel && {
				lastLatitude: 22.527_739_206_672_393,
				lastLongitude: 114.027_626_953_124_97
			})
		}));
	}
}
