import { Client, EmbedBuilder, Events, GatewayIntentBits, GuildMember } from "discord.js";
import { prisma } from "../config/database.js";
import { ACTIVE_COOLDOWN_MS, BOOSTER_COOLDOWN_MS, COOLDOWN_MS } from "../services/user.js";

class DiscordBot {
	private client: Client | null = null;

	private botToken: string | undefined;
	private serverId: string | undefined;

	private activeRoleIds = new Set<string>();
	private boosterRoleIds = new Set<string>();

	constructor() {
		this.botToken = process.env["DISCORD_BOT_TOKEN"];
		this.serverId = process.env["DISCORD_SERVER_ID"];

		const activeRoleIds = process.env["DISCORD_ACTIVE_ROLE_IDS"]?.split(",");
		if (activeRoleIds) {
			for (const id of activeRoleIds) {
				this.activeRoleIds.add(id.trim());
			}
		}

		const boosterRoleIds = process.env["DISCORD_BOOSTER_ROLE_IDS"]?.split(",");
		if (boosterRoleIds) {
			for (const id of boosterRoleIds) {
				this.boosterRoleIds.add(id.trim());
			}
		}
	}

	get isConfigured(): boolean {
		return Boolean(this.botToken && this.serverId);
	}

	async start(): Promise<void> {
		if (!this.isConfigured) {
			console.log("[Discord Bot] Not configured");
			return;
		}

		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMembers
			]
		});

		this.client.once(Events.ClientReady, async client => {
			console.log(`[Discord Bot] Ready! Logged in as ${client.user.tag}`);
			await this.syncAllUsers();
		});

		this.client.on(Events.GuildMemberUpdate, async (_oldMember, newMember) => {
			if (newMember.guild.id !== this.serverId) {
				return;
			}

			await this.updateUser(newMember);
		});

		this.client.on(Events.GuildMemberRemove, async member => {
			if (member.guild.id !== this.serverId) {
				return;
			}

			await this.updateUser(await member.fetch());
		});

		this.client.on(Events.Error, (error) => {
			console.error("[Discord Bot] Error:", error);
		});

		try {
			await this.client.login(this.botToken);
		} catch (error) {
			console.error("[Discord Bot] Failed to start:", error);
		}
	}

	private hasActiveRole(member: GuildMember): boolean {
		return member.roles.cache.some((role) => this.activeRoleIds.has(role.id));
	}

	private hasBoosterRole(member: GuildMember): boolean {
		return member.roles.cache.some((role) => this.boosterRoleIds.has(role.id));
	}

	private async updateCooldown(user: { id: number; name: string; chargesCooldownMs: number; discordUserId: string | null; }, cooldown: number) {
		if (user.chargesCooldownMs !== cooldown) {
			await prisma.user.update({
				where: { id: user.id },
				data: { chargesCooldownMs: cooldown }
			});

			console.log(`[Discord Bot] ${user.name}#${user.id} (discord id ${user.discordUserId}) updated with cooldown ${cooldown}ms`);
		}
	}

	private async updateUser(member: GuildMember): Promise<number | null> {
		try {
			const user = await prisma.user.findFirst({
				where: { discordUserId: member.id },
				select: {
					id: true,
					name: true,
					discordUserId: true,
					chargesCooldownMs: true
				}
			});
			if (!user) {
				return null;
			}

			let cooldown = COOLDOWN_MS;
			if (this.hasActiveRole(member)) {
				cooldown = ACTIVE_COOLDOWN_MS;
			}
			if (this.hasBoosterRole(member)) {
				cooldown = BOOSTER_COOLDOWN_MS;
			}

			await this.updateCooldown(user, cooldown);
			return cooldown;
		} catch (error) {
			console.error("[Discord Bot] Error handling role change:", error);
			return null;
		}
	}

	async updateUserId(discordUserId: string): Promise<number | null> {
		if (!this.isConfigured || !this.client || !this.serverId) {
			return null;
		}

		try {
			const guild = await this.client.guilds.fetch(this.serverId);
			if (!guild) {
				return null;
			}

			const member = await guild.members.fetch(discordUserId)
				.catch(() => null);
			if (!member) {
				return null;
			}

			return await this.updateUser(member);
		} catch (error) {
			console.error("[Discord Bot] Error checking user roles:", error);
			return null;
		}
	}

	private async syncAllUsers(): Promise<void> {
		if (!this.isConfigured || !this.client || !this.serverId) {
			return;
		}

		try {
			console.log("[Discord Bot] Syncing all users");

			const guild = await this.client.guilds.fetch(this.serverId);
			if (!guild) {
				console.error("[Discord Bot] Could not find configured server");
				return;
			}

			const linkedUsers = await prisma.user.findMany({
				where: {
					discordUserId: { not: null }
				},
				select: {
					id: true,
					name: true,
					discordUserId: true,
					discord: true,
					chargesCooldownMs: true
				}
			});

			await guild.members.fetch();

			for (const user of linkedUsers) {
				if (!user.discordUserId) {
					continue;
				}

				try {
					const member = await guild.members.fetch(user.discordUserId)
						.catch(() => null);
					if (member) {
						this.updateUser(member);
					}
				} catch (error) {
					console.error(`[Discord Bot] Error syncing user ${user.name}#${user.id}:`, error);
				}
			}
		} catch (error) {
			console.error("[Discord Bot] Error during sync:", error);
		}
	}

	async stop(): Promise<void> {
		if (!this.client) {
			return;
		}

		this.client.destroy();
		this.client = null;
	}

	async sendDM(discordUserId: string, message: string): Promise<void> {
		if (!this.isConfigured || !this.client) {
			return;
		}

		try {
			const user = await this.client.users.fetch(discordUserId);
			if (!user) {
				return;
			}

			const embed = new EmbedBuilder()
				.setColor(0x41_69_E2)
				.setAuthor({
					name: "openplace",
					iconURL: "https://openplace.live/img/favicon-96x96.png"
				})
				.setDescription(message);

			await user.send({ embeds: [embed] });
		} catch (error) {
			console.error("[Discord Bot] Error sending DM:", error);
		}
	}
}

export const discordBot = new DiscordBot();
