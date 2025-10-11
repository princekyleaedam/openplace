import { PrismaClient, Ticket } from "@prisma/client";
import { BanReason, TicketResolution } from "../types";
import { UserService } from "./user";

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
	private readonly userService: UserService;

	constructor(private prisma: PrismaClient) {
		this.userService = new UserService(this.prisma);
	}

	async reportUser(input: ReportUserInput): Promise<Ticket> {
		// TODO: Image upload is not working. milliparsec bug?
		let imageBuffer: Buffer | undefined;
		const anyImage: any = input.image as any;
		if (anyImage) {
			if (typeof anyImage.bytes === "function") {
				imageBuffer = await anyImage.bytes();
			} else if (typeof anyImage.arrayBuffer === "function") {
				const ab = await anyImage.arrayBuffer();
				imageBuffer = Buffer.from(ab);
			} else if (anyImage.buffer instanceof Buffer) {
				imageBuffer = anyImage.buffer as Buffer;
			}
		}

		return await this.prisma.ticket.create({
			data: {
				userId: input.reportingUserId,
				reportedUserId: input.reportedUserId,
				latitude: input.latitude,
				longitude: input.longitude,
				zoom: input.zoom,
				reason: input.reason,
				notes: input.notes,
				image: imageBuffer || null
			}
		});
	}

	async resolve(ticketId: string, moderatorUser: number, resolution: TicketResolution) {
		const ticket = await this.prisma.ticket.update({
			where: { id: ticketId },
			data: {
				resolution,
				moderatorUserId: moderatorUser
			}
		});

		switch (resolution) {
		case TicketResolution.Ignore:
			break;

		case TicketResolution.Timeout:
			await this.userService.timeout(ticket.reportedUserId, true);
			break;

		case TicketResolution.Ban:
			await this.userService.ban(ticket.reportedUserId, true, ticket.reason as BanReason);
			break;
		}
	}
}
