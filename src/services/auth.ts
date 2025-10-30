import { JwtPayload } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { BanReason } from "../types";
import { normalizeCidr, parseCidr } from "cidr-tools";
import { UserService } from "./user";

export interface AuthToken extends JwtPayload {
	userId: number;
	sessionId: string;
}

export interface Ban {
	reason: BanReason;
}

const banReasonMessages = new Map<BanReason, string>([
	[BanReason.InappropriateContent, "Inappropriate content"],
	[BanReason.HateSpeech, "Hate speech"],
	[BanReason.Doxxing, "Doxxing"],
	[BanReason.Bot, "Botting"],
	[BanReason.Griefing, "Griefing"],
	[BanReason.MultiAccounting, "Multi-accounting"],
	[BanReason.Other, "Other"],
	[BanReason.IPList, "VPNs are not permitted"]
]);

const BLOCK_TOR = process.env["BLOCK_TOR"] === "1";

function ipv6ToUint8Array(value: bigint): Uint8Array {
	const bytes = new Uint8Array(16);
	for (let i = 15; i >= 0; i--) {
		bytes[i] = Number(value & 0xFFn);
		value >>= 8n;
	}
	return bytes;
}

export class AuthService {
	private readonly userService: UserService;

	constructor(private prisma: PrismaClient, userService?: UserService) {
		this.userService = userService ?? new UserService(prisma);
	}

	async getBan({ ip, country }: { ip: string; country?: string }): Promise<Ban | null> {
		if (BLOCK_TOR && country === "T1") {
			return {
				reason: BanReason.IPList
			};
		}

		// Validate IP address format
		if (!ip || typeof ip !== "string" || ip.length < 7 || (!ip.includes(".") && !ip.includes(":"))) {
			console.warn(`Invalid IP address format: ${ip}`);
			return null;
		}

		const isIPv6 = ip.includes(":");
		const cidr = normalizeCidr(`${ip}/${isIPv6 ? "128" : "32"}`);
		const { start } = parseCidr(cidr);
		if (!start) {
			console.warn(`Failed to parse IP: ${ip}`);
			return null;
		}

		const range = isIPv6
			? {
					ipv6Min: ipv6ToUint8Array(start),
					ipv6Max: ipv6ToUint8Array(start)
				}
			: {
					ipv4Min: Number(start),
					ipv4Max: Number(start)
				};

		const bannedIP = await this.prisma.bannedIP.findFirst({
			where: {
				OR: [
					{
						userId: null,
						...range
					},
					{
						userId: { not: null },
						cidr,
						...range
					}
				]
			}
		});
		if (bannedIP) {
			return {
				reason: bannedIP.suspensionReason as BanReason
			};
		}

		return null;
	}

	async banUser(userId: number, state: boolean, reason: BanReason | null) {
		console.log(`${state ? "Banning" : "Unbanning"} IPs of user ${userId}`);

		if (state) {
			const user = await this.prisma.user.findUnique({
				where: { id: userId },
				select: {
					registrationIP: true,
					lastIP: true
				}
			});
			if (!user) {
				throw new Error("User not found");
			}

			const ips = [user.registrationIP, user.lastIP]
				.filter(Boolean) as string[];
			for (const ip of ips) {
				const isIPv6 = ip.includes(":");
				const cidr = normalizeCidr(`${ip}/${isIPv6 ? "128" : "32"}`);
				const { start } = parseCidr(cidr);
				if (!start) {
					console.warn("Attempted to ban invalid IP:", ip);
					continue;
				}

				const range = isIPv6
					? {
							ipv6Min: ipv6ToUint8Array(start),
							ipv6Max: ipv6ToUint8Array(start)
						}
					: {
							ipv4Min: Number(start),
							ipv4Max: Number(start)
						};

				const bannedIPs = await this.prisma.bannedIP.count({
					where: {
						userId,
						cidr,
						...range
					},
					take: 1
				});

				if (bannedIPs === 0) {
					console.log(`Banning ${cidr}`);
					await this.prisma.bannedIP.create({
						data: {
							cidr,
							suspensionReason: reason!,
							userId,
							...range
						}
					});
				}

				// Ban any users with this IP
				const usersWithIP = await this.prisma.user.findMany({
					where: {
						OR: [
							{ registrationIP: ip },
							{ lastIP: ip }
						],
						banned: false
					},
					select: {
						id: true,
						name: true,
						nickname: true
					}
				});

				for (const user of usersWithIP) {
					console.log(`Banning ${user.nickname || user.name}#${user.id} because they share an IP`);
					await this.userService.ban(user.id, true, reason, true);
				}
			}
		} else {
			const bannedIPs = await this.prisma.bannedIP.findMany({
				where: {
					userId
				}
			});

			// Unban all other instances of the same IP
			for (const bannedIP of bannedIPs) {
				console.log(`Unbanning ${bannedIP.cidr}`);
				const isIPv6 = bannedIP.ipv6Min !== null;
				await this.prisma.bannedIP.deleteMany({
					where: isIPv6
						? {
								ipv6Min: bannedIP.ipv6Min,
								ipv6Max: bannedIP.ipv6Max
							}
						: {
								ipv4Min: bannedIP.ipv4Min,
								ipv4Max: bannedIP.ipv4Max
							}
				});
			}
		}
	}

	messageForBanReason(reason: BanReason): string {
		return banReasonMessages.get(reason) ?? "Other";
	}
}
