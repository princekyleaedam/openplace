import { PrismaClient } from "@prisma/client";
import { BanReason } from "../types";

interface ReportUserInput {
	reportingUserId: number;
	reportedUserId: number;
	latitude: number;
	longitude: number;
	zoom: number;
	reason: BanReason;
	notes: string;
	image: File;
}

export class TicketService {
	constructor(private prisma: PrismaClient) {}

	async reportUser(input: ReportUserInput) {
		await this.prisma.ticket.create({
			data: {
				userId: input.reportingUserId,
				reportedUserId: input.reportedUserId,
				latitude: input.latitude,
				longitude: input.longitude,
				zoom: input.zoom,
				reason: input.reason,
				notes: input.notes,
				image: await input.image.bytes()
			}
		});
	}
}
