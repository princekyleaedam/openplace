import { Request } from "@tinyhttp/app";

export interface AuthenticatedRequest extends Request {
	user?: {
		id: number;
		sessionId: string;
	};
	file?: {
		filename: string;
		path: string;
		mimetype: string;
		size: number;
	};
}

export type ColorPalette = Record<number, {
		rgb: [number, number, number];
		paid: boolean;
	}>;

export interface BitMap {
	bytes: Uint8Array;
	set(index: number, value: boolean): void;
	get(index: number): boolean;
	toBase64(): string;
}

export enum UserRole {
	User = "user",
	Admin = "admin",
	Moderator = "moderator",
	GlobalModerator = "global_moderator"
}

export enum BanReason {
	InappropriateContent = "inappropriate-content",
	HateSpeech = "hate-speech",
	Doxxing = "doxxing",
	Bot = "bot",
	Griefing = "griefing",
	MultiAccounting = "multi-accounting",
	Other = "other",
	IPList = "ip-list"
}

export enum TicketResolution {
	Ignore = "ignore",
	Timeout = "timeout",
	Ban = "ban"
}
