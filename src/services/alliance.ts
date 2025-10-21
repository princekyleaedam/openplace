import { PrismaClient } from "@prisma/client";
import { UserService } from "./user";
import { ValidationError } from "../utils/error";
import { RegionService } from "./region";
import { PixelService } from "./pixel";

type LeaderboardMode = "today" | "week" | "month" | "all-time";

function getDateFilter(mode: LeaderboardMode): any {
	const now = new Date();

	switch (mode) {
	case "today": {
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		startOfDay.setHours(0, 0, 0, 0);
		return { paintedAt: { gte: startOfDay } };
	}
	case "week": {
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - 7);
		startOfWeek.setHours(0, 0, 0, 0);
		return { paintedAt: { gte: startOfWeek } };
	}
	case "month": {
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		startOfMonth.setHours(0, 0, 0, 0);
		return { paintedAt: { gte: startOfMonth } };
	}
	case "all-time":
		return {};
	default:
		return {};
	}
}

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
	private pixelService: PixelService;

	constructor(private prisma: PrismaClient) {
		this.pixelService = new PixelService(prisma);
	}

	static isValidAllianceName(name: string): boolean {
		return name.length > 0 && name.length <= 16;
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

		const result = await this.prisma.$transaction(async (tx) => {
			// Create alliance with 0 pixels initially
			const alliance = await tx.alliance.create({
				data: {
					name,
					description: "",
					pixelsPainted: 0
				}
			});

			// Update user alliance info with join timestamp
			await tx.user.update({
				where: { id: userId },
				data: {
					allianceId: alliance.id,
					allianceRole: "admin",
					allianceJoinedAt: new Date()
				}
			});

			return { id: alliance.id };
		});

		// Update UserRegionStats with new alliance
		await this.pixelService.updateUserRegionStatsForAllianceChange(userId, null, result.id);

		return result;
	}

	private sanitizeDescription(desc: string): string {
		return desc.replaceAll(/["&'<>]/g, (char) => {
			const escapeMap: Record<string, string> = {
				"<": "&lt;",
				">": "&gt;",
				"'": "&#39;",
				"\"": "&quot;",
				"&": "&amp;"
			};
			return escapeMap[char] || char;
		})
			.trim();
	}

	async updateDescription(userId: number, input: UpdateAllianceDescriptionInput) {
		const { description } = input;

		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.allianceId || user.allianceRole !== "admin") {
			throw new Error("Forbidden");
		}

		if (description.length > 500) {
			throw new ValidationError("Description too long (max 500 characters)");
		}

		const sanitized = this.sanitizeDescription(description);

		await this.prisma.alliance.update({
			where: { id: user.allianceId },
			data: { description: sanitized }
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

		await this.prisma.$transaction(async (tx) => {
			// Update user alliance info with join timestamp
			await tx.user.update({
				where: { id: userId },
				data: {
					allianceId: inviteRecord.allianceId,
					allianceRole: "member",
					allianceJoinedAt: new Date()
				}
			});

			// Don't increment alliance pixels here - only count pixels painted after joining
		});

		// Update UserRegionStats with new alliance
		await this.pixelService.updateUserRegionStatsForAllianceChange(userId, null, inviteRecord.allianceId);

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

		await this.prisma.$transaction(async (tx) => {
			// Update user alliance info
			await tx.user.update({
				where: { id: userId },
				data: {
					allianceId: null,
					allianceRole: "member",
					allianceJoinedAt: null
				}
			});
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
				nickname: true,
				picture: true,
				allianceRole: true
			}
		});

		const hasNext = members.length > pageSize;
		const data = hasNext ? members.slice(0, -1) : members;

		return {
			data: data.map(member => ({
				id: member.id,
				name: member.nickname || member.name || "Unknown",
				...(member.picture && { picture: member.picture }),
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

		const userIds = bannedUsers.map(banned => banned.userId);
		const users = await this.prisma.user.findMany({
			where: { id: { in: userIds } },
			select: {
				id: true,
				nickname: true,
				name: true,
				picture: true
			}
		});

		const userMap = new Map(users.map(u => [u.id, u]));

		const hasNext = bannedUsers.length > pageSize;
		const data = hasNext ? bannedUsers.slice(0, -1) : bannedUsers;

		return {
			data: data.map(banned => {
				const user = userMap.get(banned.userId);
				return {
					id: banned.userId,
					name: user?.nickname || user?.name || "Unknown",
					picture: user?.picture || null
				};
			}),
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

		await this.prisma.$transaction(async (tx) => {
			await tx.user.update({
				where: { id: bannedUserId },
				data: { allianceId: null, allianceRole: "member" }
			});

			await tx.bannedUser.create({
				data: {
					userId: bannedUserId,
					allianceId: user.allianceId!
				}
			});

			// Check if alliance has any remaining members
			const remainingMembers = await tx.user.count({
				where: { allianceId: user.allianceId! }
			});

			// If no members left, delete the alliance
			if (remainingMembers === 0 && user.allianceId) {
				// Delete related data first
				await tx.allianceInvite.deleteMany({
					where: { allianceId: user.allianceId }
				});

				await tx.bannedUser.deleteMany({
					where: { allianceId: user.allianceId }
				});

				// Delete the alliance
				await tx.alliance.delete({
					where: { id: user.allianceId }
				});
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

	async getLeaderboard(userId: number, mode: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId }
		});

		if (!user || !user.allianceId) {
			throw new Error("Forbidden");
		}

		const dateFilter = getDateFilter(mode as LeaderboardMode);

		if (mode === "all-time") {
			// Get all members of this alliance
			const members = await this.prisma.user.findMany({
				where: { allianceId: user.allianceId },
				select: {
					id: true,
					name: true,
					nickname: true,
					picture: true,
					equippedFlag: true,
					showLastPixel: true,
					allianceJoinedAt: true
				}
			});

			// Calculate pixels painted by each member after joining alliance
			const memberStats = await Promise.all(members.map(async (member) => {
				if (!member.allianceJoinedAt) return null;

				const pixelsPainted = await this.prisma.pixel.count({
					where: {
						paintedBy: member.id,
						paintedAt: { gte: member.allianceJoinedAt }
					}
				});

				return {
					...member,
					pixelsPainted
				};
			}));

			// Filter out members with no pixels and sort by pixels painted
			const validMembers = memberStats
				.filter(m => m && m.pixelsPainted > 0)
				.sort((a, b) => b!.pixelsPainted - a!.pixelsPainted)
				.slice(0, 50);

			const lastPixels = new Map<number, { latitude: number; longitude: number }>();
			await Promise.all(validMembers.map(async (m) => {
				if (!m?.showLastPixel) return;

				const last = await this.prisma.pixel.findFirst({
					where: { paintedBy: m.id },
					orderBy: [{ paintedAt: "desc" }, { id: "desc" }],
					select: { tileX: true, tileY: true, x: true, y: true }
				});
				if (last) {
					const coords = RegionService.pixelsToCoordinates([last.tileX, last.tileY], [last.x, last.y]);
					lastPixels.set(m.id, coords);
				}
			}));

			return validMembers.map(member => {
				const memberLastPixels = member?.showLastPixel ? lastPixels.get(member.id) : undefined;
				return {
					userId: member!.id,
					name: member!.nickname || member!.name || "Unknown",
					...(member!.picture && { picture: member!.picture }),
					equippedFlag: member!.equippedFlag,
					pixelsPainted: member!.pixelsPainted,
					lastLatitude: memberLastPixels?.latitude,
					lastLongitude: memberLastPixels?.longitude
				};
			});
		}

		// Get all members of this alliance
		const members = await this.prisma.user.findMany({
			where: { allianceId: user.allianceId },
			select: {
				id: true,
				name: true,
				nickname: true,
				picture: true,
				equippedFlag: true,
				showLastPixel: true,
				allianceJoinedAt: true
			}
		});

		// Calculate pixels painted by each member after joining alliance within the time period
		const memberStats = await Promise.all(members.map(async (member) => {
			if (!member.allianceJoinedAt) return null;

			// Combine alliance join date with time period filter
			const paintedAtFilter: any = { gte: member.allianceJoinedAt };

			// Add time period filter if it exists (today/week/month)
			if (dateFilter && "paintedAt" in dateFilter && dateFilter.paintedAt) {
				// Use the later date between alliance join date and time period start
				const timePeriodStart = dateFilter.paintedAt.gte;
				if (timePeriodStart && timePeriodStart > member.allianceJoinedAt) {
					paintedAtFilter.gte = timePeriodStart;
				}
			}

			const pixelsPainted = await this.prisma.pixel.count({
				where: {
					paintedBy: member.id,
					paintedAt: paintedAtFilter
				}
			});

			return {
				...member,
				pixelsPainted
			};
		}));

		// Filter out members with no pixels and sort by pixels painted
		const validMembers = memberStats
			.filter(m => m && m.pixelsPainted > 0)
			.sort((a, b) => b!.pixelsPainted - a!.pixelsPainted)
			.slice(0, 50);

		const lastPixels = new Map<number, { latitude: number; longitude: number }>();
		await Promise.all(validMembers.map(async (m) => {
			if (!m?.showLastPixel) return;

			const last = await this.prisma.pixel.findFirst({
				where: { paintedBy: m.id },
				orderBy: [{ paintedAt: "desc" }, { id: "desc" }],
				select: { tileX: true, tileY: true, x: true, y: true }
			});
			if (last) {
				const coords = RegionService.pixelsToCoordinates([last.tileX, last.tileY], [last.x, last.y]);
				lastPixels.set(m.id, coords);
			}
		}));

		return validMembers.map(member => {
			const memberLastPixels = member?.showLastPixel ? lastPixels.get(member.id) : undefined;
			return {
				userId: member!.id,
				name: member!.nickname || member!.name || "Unknown",
				...(member!.picture && { picture: member!.picture }),
				equippedFlag: member!.equippedFlag,
				pixelsPainted: member!.pixelsPainted,
				lastLatitude: memberLastPixels?.latitude,
				lastLongitude: memberLastPixels?.longitude
			};
		});
	}
}
