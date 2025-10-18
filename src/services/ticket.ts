import { PrismaClient, Ticket } from "@prisma/client";
import { BanReason, TicketResolution } from "../types";
import { UserService } from "./user";
import { createCanvas, loadImage } from "@napi-rs/canvas";

interface ReportUserInput {
	reportingUserId: number;
	reportedUserId: number;
	latitude: number;
	longitude: number;
	zoom: number;
	reason: BanReason;
	notes: string;
	image: Express.Multer.File;
}

export class TicketService {
	private readonly userService: UserService;

	constructor(private prisma: PrismaClient) {
		this.userService = new UserService(this.prisma);
	}

	async reportUser(input: ReportUserInput): Promise<Ticket> {
		const image = await loadImage(input.image.buffer);
		const canvas = createCanvas(image.width, image.height);
		const ctx = canvas.getContext("2d");
		ctx.drawImage(image, 0, 0);
		const buffer = canvas.toBuffer("image/jpeg");

		return await this.prisma.ticket.create({
			data: {
				userId: input.reportingUserId,
				reportedUserId: input.reportedUserId,
				latitude: input.latitude,
				longitude: input.longitude,
				zoom: input.zoom,
				reason: input.reason,
				notes: input.notes,
				image: buffer
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
