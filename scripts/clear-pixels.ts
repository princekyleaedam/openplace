#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import inquirer from "inquirer";
import { PixelService } from "../src/services/pixel.js";
import { TicketService } from "../src/services/ticket.js";
import { BanReason, TicketResolution } from "../src/types/index.js";

const prisma = new PrismaClient();
const pixelService = new PixelService(prisma);
const ticketService = new TicketService(prisma);

interface PixelStat {
	userId: number;
	userName: string;
	count: number;
	allianceId: number | null;
}

function parseCoordinates(input: string): { x: number; y: number } | null {
	const parts = input.split(",")
		.map(s => s.trim());
	if (parts.length !== 2) {
		return null;
	}

	const [x, y] = [Number.parseInt(parts[0]), Number.parseInt(parts[1])];
	if (Number.isNaN(x) || Number.isNaN(y)) {
		return null;
	}

	return { x, y };
}

try {
	const tileAnswers = await inquirer.prompt([
		{
			type: "input",
			name: "topLeftTile",
			message: "Enter top-left tile coordinates (tileX,tileY):",
			validate: (input: string) => {
				const coords = parseCoordinates(input);
				if (!coords) {
					return "Invalid format";
				}
				if (coords.x < 0 || coords.y < 0) {
					return "Invalid tile coordinates";
				}
				return true;
			}
		},

		{
			type: "input",
			name: "topLeftPixel",
			message: "Enter top-left pixel coordinates within tile (x,y):",
			validate: (input: string) => {
				const coords = parseCoordinates(input);
				if (!coords) {
					return "Invalid format";
				}
				if (coords.x < 0 || coords.x >= 1000 || coords.y < 0 || coords.y >= 1000) {
					return "Invalid pixel coordinates";
				}
				return true;
			}
		},

		{
			type: "input",
			name: "bottomRightTile",
			message: "Enter bottom-right tile coordinates (tileX,tileY):",
			validate: (input: string) => {
				const coords = parseCoordinates(input);
				if (!coords) {
					return "Invalid format";
				}
				if (coords.x < 0 || coords.y < 0) {
					return "Invalid tile coordinates";
				}
				return true;
			}
		},

		{
			type: "input",
			name: "bottomRightPixel",
			message: "Enter bottom-right pixel coordinates within tile (x,y):",
			validate: (input: string) => {
				const coords = parseCoordinates(input);
				if (!coords) {
					return "Invalid format";
				}
				if (coords.x < 0 || coords.x >= 1000 || coords.y < 0 || coords.y >= 1000) {
					return "Invalid pixel coordinates";
				}
				return true;
			}
		}
	]);

	const topLeftTile = parseCoordinates(tileAnswers.topLeftTile)!;
	const topLeftPixel = parseCoordinates(tileAnswers.topLeftPixel)!;
	const bottomRightTile = parseCoordinates(tileAnswers.bottomRightTile)!;
	const bottomRightPixel = parseCoordinates(tileAnswers.bottomRightPixel)!;

	if (topLeftTile.x > bottomRightTile.x || topLeftTile.y > bottomRightTile.y) {
		throw new Error("Invalid tile range");
	}

	if (topLeftTile.x === bottomRightTile.x && topLeftTile.y === bottomRightTile.y &&
		(topLeftPixel.x > bottomRightPixel.x || topLeftPixel.y > bottomRightPixel.y)) {
		throw new Error("Invalid tile range");
	}

	const season = 0;

	console.log(`\nSearching for pixels:`);
	console.log(`  From: Tile (${topLeftTile.x},${topLeftTile.y}) Pixel (${topLeftPixel.x},${topLeftPixel.y})`);
	console.log(`  To:   Tile (${bottomRightTile.x},${bottomRightTile.y}) Pixel (${bottomRightPixel.x},${bottomRightPixel.y})\n`);

	const tileQueries = [];
	for (let tileY = topLeftTile.y; tileY <= bottomRightTile.y; tileY++) {
		for (let tileX = topLeftTile.x; tileX <= bottomRightTile.x; tileX++) {
			let x0InTile: number;
			let y0InTile: number;
			let x1InTile: number;
			let y1InTile: number;

			// X range for this tile
			if (tileX === topLeftTile.x && tileX === bottomRightTile.x) {
				// Same tile for start and end X
				x0InTile = topLeftPixel.x;
				x1InTile = bottomRightPixel.x;
			} else if (tileX === topLeftTile.x) {
				// First tile in X range
				x0InTile = topLeftPixel.x;
				x1InTile = 999;
			} else if (tileX === bottomRightTile.x) {
				// Last tile in X range
				x0InTile = 0;
				x1InTile = bottomRightPixel.x;
			} else {
				// Middle tile in X range
				x0InTile = 0;
				x1InTile = 999;
			}

			// Y range for this tile
			if (tileY === topLeftTile.y && tileY === bottomRightTile.y) {
				// Same tile for start and end Y
				y0InTile = topLeftPixel.y;
				y1InTile = bottomRightPixel.y;
			} else if (tileY === topLeftTile.y) {
				// First tile in Y range
				y0InTile = topLeftPixel.y;
				y1InTile = 999;
			} else if (tileY === bottomRightTile.y) {
				// Last tile in Y range
				y0InTile = 0;
				y1InTile = bottomRightPixel.y;
			} else {
				// Middle tile in Y range
				y0InTile = 0;
				y1InTile = 999;
			}

			const query = {
				season,
				tileX,
				tileY,
				x: { gte: x0InTile, lte: x1InTile },
				y: { gte: y0InTile, lte: y1InTile }
			};
			tileQueries.push(query);
			console.log(`  Query: Tile (${tileX},${tileY}) x:[${x0InTile}-${x1InTile}] y:[${y0InTile}-${y1InTile}]`);
		}
	}
	console.log("");

	const pixels = await prisma.pixel.findMany({
		where: {
			OR: tileQueries
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					allianceId: true
				}
			}
		}
	});

	console.log(`${pixels.length} pixels`);

	if (pixels.length === 0) {
		throw new Error("No pixels found in the specified region.");
	}

	const userStats = new Map<number, PixelStat>();
	for (const pixel of pixels) {
		const userId = pixel.user.id;
		const existing = userStats.get(userId);
		if (existing) {
			existing.count++;
		} else {
			userStats.set(userId, {
				userId,
				userName: pixel.user.name,
				count: 1,
				allianceId: pixel.user.allianceId
			});
		}
	}

	const sortedStats = [...userStats.values()].sort((a, b) => b.count - a.count);
	console.log(`${pixels.length} pixels drawn by ${sortedStats.length} users\n`);

	for (const stat of sortedStats) {
		console.log(`  User ${stat.userName}#${stat.userId}: ${stat.count} pixels`);
	}

	console.log("");

	const answer = await inquirer.prompt([
		{
			type: "confirm",
			name: "confirmed",
			message: `Delete ${pixels.length} pixels?`,
			default: false
		}
	]);

	if (!answer.confirmed) {
		throw new Error("Cancelled.");
	}

	console.log("\nDeleting pixels...");

	const deleteResult = await prisma.pixel.deleteMany({
		where: {
			OR: tileQueries
		}
	});

	console.log(`Deleted ${deleteResult.count} pixel(s).`);

	if (deleteResult.count !== pixels.length) {
		console.warn(`Warning: Found ${pixels.length} pixels but deleted ${deleteResult.count}. Using deleted count for user updates.`);

		const deletedPixelsByUser = new Map<number, number>();
		for (const pixel of pixels) {
			const userId = pixel.user.id;
			deletedPixelsByUser.set(userId, (deletedPixelsByUser.get(userId) || 0) + 1);
		}

		for (const [userId, count] of deletedPixelsByUser) {
			const stat = userStats.get(userId);
			if (stat) {
				stat.count = count;
			}
		}
	}

	console.log("Updating user pixel counts...");
	for (const [userId, stat] of userStats) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { pixelsPainted: true, name: true }
		});

		if (user) {
			const newCount = user.pixelsPainted - stat.count;
			await prisma.user.update({
				where: { id: userId },
				data: {
					pixelsPainted: newCount
				}
			});
			console.log(`  Deducted ${stat.count} pixels from ${stat.userName}#${userId} [${user.pixelsPainted} -> ${newCount}]`);
		}
	}

	const allianceStats = new Map<number, number>();
	for (const stat of userStats.values()) {
		if (stat.allianceId) {
			const current = allianceStats.get(stat.allianceId) || 0;
			allianceStats.set(stat.allianceId, current + stat.count);
		}
	}

	if (allianceStats.size > 0) {
		console.log("Updating alliance pixel counts...");
		for (const [allianceId, count] of allianceStats) {
			const alliance = await prisma.alliance.findUnique({
				where: { id: allianceId },
				select: { pixelsPainted: true, name: true }
			});

			if (alliance) {
				const newCount = Math.max(0, alliance.pixelsPainted - count);
				await prisma.alliance.update({
					where: { id: allianceId },
					data: {
						pixelsPainted: newCount
					}
				});
				console.log(`  Deducted ${count} pixels from alliance ${alliance.name}#${allianceId} [${alliance.pixelsPainted} -> ${newCount}]`);
			}
		}
	}

	console.log("Redrawing tiles...");
	const affectedTiles = new Set<string>();
	for (const query of tileQueries) {
		affectedTiles.add(`${query.tileX},${query.tileY}`);
	}

	let tileCount = 0;
	for (const tileKey of affectedTiles) {
		const [tileX, tileY] = tileKey.split(",")
			.map(Number);
		await pixelService.updatePixelTile(tileX, tileY, season);
		tileCount++;
	}

	const banAnswer = await inquirer.prompt([
		{
			type: "confirm",
			name: "shouldBan",
			message: "Ban users?",
			default: false
		}
	]);

	if (!banAnswer.shouldBan) {
		const userChoices = sortedStats.map(stat => ({
			name: `User ${stat.userId} (${stat.userName}) - ${stat.count} pixel(s)`,
			value: stat.userId
		}));

		const selectedUsers = await inquirer.prompt([
			{
				type: "checkbox",
				name: "users",
				message: "Users to ban:",
				choices: userChoices
			}
		]);

		if (selectedUsers.users.length > 0) {
			const banReasonAnswer = await inquirer.prompt([
				{
					type: "list",
					name: "reason",
					message: "Ban reason:",
					choices: Object.entries(BanReason)
						.map(([key, value]) => ({ name: key, value }))
				}
			]);

			const notesAnswer = await inquirer.prompt([
				{
					type: "input",
					name: "notes",
					message: "Ban notes (minimum 5 characters):",
					validate: (input: string) => {
						if (input.length < 5) {
							return "Notes must be at least 5 characters";
						}
						return true;
					}
				}
			]);

			const adminAnswer = await inquirer.prompt([
				{
					type: "input",
					name: "adminId",
					message: "Enter your admin user ID:",
					validate: (input: string) => {
						const id = Number.parseInt(input);
						if (Number.isNaN(id) || id <= 0) {
							return "Invaild user";
						}
						return true;
					}
				}
			]);

			const adminUserId = Number.parseInt(adminAnswer.adminId);

			console.log("Banning users...");
			for (const userId of selectedUsers.users) {
				const user = sortedStats.find(s => s.userId === userId);
				if (!user) {
					continue;
				}

				console.log(`  Banning ${user.userName}#${userId}`);

				const latitude = (Math.floor((topLeftTile.y + bottomRightTile.y) / 2) / 2048) * 360 - 180;
				const longitude = (Math.floor((topLeftTile.x + bottomRightTile.x) / 2) / 2048) * 180 - 90;

				const ticket = await ticketService.reportUser({
					reportingUserId: adminUserId,
					reportedUserId: userId,
					latitude,
					longitude,
					zoom: 10,
					reason: banReasonAnswer.reason,
					notes: notesAnswer.notes,
					image: new File([], "")
				});

				await ticketService.resolve(ticket.id, adminUserId, TicketResolution.Ban);

				await prisma.userNote.create({
					data: {
						userId: adminUserId,
						reportedUserId: userId,
						content: `Banned via clear-pixels script: ${notesAnswer.notes} (Reason: ${banReasonAnswer.reason})`
					}
				});

				console.log(`  ✓ ${user.userName}#${userId} banned`);
			}
		}
	}

	await prisma.$disconnect();
} catch (error) {
	console.error(error);
	await prisma.$disconnect();
	process.exit(1);
}
