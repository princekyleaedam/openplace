import { prisma } from "../config/database.js";
import { COOLDOWN_MS } from "./user.js";

interface DiscordUser {
	id: string;
	username: string;
	discriminator: string;
	global_name?: string;
}

export default class DiscordService {
	private clientId: string | undefined;
	private clientSecret: string | undefined;
	private redirectUrl: string | undefined;

	constructor() {
		this.clientId = process.env["DISCORD_CLIENT_ID"];
		this.clientSecret = process.env["DISCORD_CLIENT_SECRET"];
		this.redirectUrl = process.env["DISCORD_REDIRECT_URL"];
	}

	get isConfigured(): boolean {
		return Boolean(this.clientId && this.clientSecret && this.redirectUrl);
	}

	getAuthorizationUrl(state: string): string {
		if (!this.isConfigured) {
			throw new Error("Discord auth not configured");
		}

		const params = new URLSearchParams({
			client_id: this.clientId!,
			redirect_uri: this.redirectUrl!,
			response_type: "code",
			scope: "identify",
			state
		});

		return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
	}

	async exchangeCodeForToken(code: string): Promise<string> {
		if (!this.isConfigured) {
			throw new Error("Discord auth not configured");
		}

		const params = new URLSearchParams({
			client_id: this.clientId!,
			client_secret: this.clientSecret!,
			grant_type: "authorization_code",
			code,
			redirect_uri: this.redirectUrl!
		});

		const response = await fetch("https://discord.com/api/oauth2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: params.toString()
		});

		if (!response.ok) {
			throw new Error(`Failed to exchange code for token: ${response.statusText}`);
		}

		const data = await response.json() as { access_token: string };
		return data.access_token;
	}

	async getDiscordUser(accessToken: string): Promise<DiscordUser> {
		const response = await fetch("https://discord.com/api/users/@me", {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to get Discord user: ${response.statusText}`);
		}

		return await response.json() as DiscordUser;
	}

	async linkDiscordAccount(userId: number, discordUser: DiscordUser): Promise<void> {
		const existingUser = await prisma.user.findFirst({
			where: {
				discordUserId: discordUser.id,
				id: { not: userId }
			}
		});

		if (existingUser) {
			throw new Error("This Discord account is already linked to another user");
		}

		await prisma.user.update({
			where: { id: userId },
			data: {
				discordUserId: discordUser.id,
				discord: discordUser.username
			}
		});
	}

	async unlinkDiscordAccount(userId: number): Promise<void> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				discordUserId: true
			}
		});

		await prisma.user.update({
			where: { id: userId },
			data: {
				discordUserId: null,
				chargesCooldownMs: COOLDOWN_MS
			}
		});

		console.log(`[Discord Bot] ${user?.name}#${user?.id} (discord id ${user?.discordUserId}) unlinked - cooldown reset to ${COOLDOWN_MS}ms`);
	}

	async isDiscordLinked(userId: number): Promise<boolean> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { discordUserId: true }
		});

		return Boolean(user?.discordUserId);
	}
}
