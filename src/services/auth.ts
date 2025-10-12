import { JwtPayload } from "jsonwebtoken";
import { BannedIP, Prisma, PrismaClient } from "@prisma/client";
import { BanReason } from "../types";

export interface AuthToken extends JwtPayload {
	userId: number;
	sessionId: string;
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

export class AuthService {
	constructor(private prisma: PrismaClient) {}

	async getIPBan(ip: string): Promise<BannedIP | null> {
		const isIPv6 = ip.includes(":");
		const ver = isIPv6 ? "6" : "4";
		const func = isIPv6 ? "INET6_ATON" : "INET_ATON";

		const query = await this.prisma.$queryRaw<Array<BannedIP>>`
			SELECT * FROM BannedIP
			WHERE ${Prisma.raw(func)}(${ip}) BETWEEN ipv${Prisma.raw(ver)}Min AND ipv${Prisma.raw(ver)}Max
			LIMIT 1
		`;

		return query[0] ?? null;
	}

	messageForBanReason(reason: BanReason): string {
		return banReasonMessages.get(reason) ?? "Other";
	}
}
