import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface UserPixelUpdate {
	userId: number;
	userName: string;
	currentPixels: number;
	actualPixels: number;
	difference: number;
}

interface AlliancePixelUpdate {
	allianceId: number;
	allianceName: string;
	currentPixels: number;
	actualPixels: number;
	difference: number;
}

// Handle command line arguments
if (process.argv.includes("--help") || process.argv.includes("-h")) {
	console.log(`
Usage: npx tsx scripts/update-user-pixels-optimized.ts [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be updated without making changes

Examples:
  npx tsx scripts/update-user-pixels-optimized.ts
  npx tsx scripts/update-user-pixels-optimized.ts --dry-run
`);
}

console.log("🚀 Starting optimized user pixels update...");

const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes("--dry-run");

if (DRY_RUN) {
	console.log("🔍 DRY RUN MODE - No changes will be made");
}

try {
	// 1. Get total user count
	console.log("📊 Step 1: Getting user statistics...");

	const totalUsers = await prisma.user.count({
		where: { role: "user" }
	});

	const totalPixels = await prisma.pixel.count();

	console.log(`Found ${totalUsers} users and ${totalPixels} total pixels`);

	// 2. Process users in batches
	console.log("🔄 Step 2: Processing users in batches...");

	const userUpdates: UserPixelUpdate[] = [];
	let processedUsers = 0;
	let offset = 0;

	while (offset < totalUsers) {
		const users = await prisma.user.findMany({
			where: { role: "user" },
			select: { id: true, name: true, pixelsPainted: true },
			skip: offset,
			take: BATCH_SIZE
		});

		// Count pixels for this batch using raw SQL for better performance
		const userIds = users.map(u => u.id);
		const pixelCounts = await prisma.$queryRaw<Array<{paintedBy: number, count: bigint}>>`
			SELECT paintedBy, COUNT(*) as count
			FROM Pixel
			WHERE paintedBy IN (${Prisma.join(userIds)})
			GROUP BY paintedBy
		`;

		const pixelCountMap = new Map(
			pixelCounts.map(pc => [pc.paintedBy, Number(pc.count)])
		);

		// Check for differences
		for (const user of users) {
			const actualPixels = pixelCountMap.get(user.id) || 0;
			const difference = actualPixels - user.pixelsPainted;

			if (difference !== 0) {
				userUpdates.push({
					userId: user.id,
					userName: user.name,
					currentPixels: user.pixelsPainted,
					actualPixels,
					difference
				});
			}
		}

		processedUsers += users.length;
		offset += BATCH_SIZE;

		if (processedUsers % 1000 === 0) {
			console.log(`Processed ${processedUsers}/${totalUsers} users...`);
		}
	}

	console.log(`✅ Found ${userUpdates.length} users with pixel count differences`);

	// 3. Update users (if not dry run)
	if (!DRY_RUN && userUpdates.length > 0) {
		console.log("🔄 Step 3: Updating user pixel counts...");

		let updatedUsers = 0;
		const totalPixelDifference = userUpdates.reduce((sum, update) => sum + Math.abs(update.difference), 0);

		// Update in batches to avoid overwhelming the database
		for (let i = 0; i < userUpdates.length; i += BATCH_SIZE) {
			const batch = userUpdates.slice(i, i + BATCH_SIZE);

			await prisma.$transaction(async (tx) => {
				for (const update of batch) {
					await tx.user.update({
						where: { id: update.userId },
						data: { pixelsPainted: update.actualPixels }
					});
				}
			});

			updatedUsers += batch.length;
			console.log(`Updated ${updatedUsers}/${userUpdates.length} users...`);
		}

		console.log(`✅ Updated ${updatedUsers} users with total pixel difference of ${totalPixelDifference}`);
	} else if (DRY_RUN) {
		console.log("🔍 DRY RUN - Would update the following users:");
		for (const update of userUpdates.slice(0, 10)) {
			console.log(`  User ${update.userName} (ID: ${update.userId}): ${update.currentPixels} → ${update.actualPixels} (${update.difference > 0 ? "+" : ""}${update.difference})`);
		}
		if (userUpdates.length > 10) {
			console.log(`  ... and ${userUpdates.length - 10} more users`);
		}
	}

	// 4. Update alliances
	console.log("🔄 Step 4: Processing alliance pixel counts...");

	const alliances = await prisma.alliance.findMany({
		where: { pixelsPainted: { gt: 0 } },
		select: { id: true, name: true, pixelsPainted: true }
	});

	const allianceUpdates: AlliancePixelUpdate[] = [];

	for (const alliance of alliances) {
		try {
			// Get alliance pixels using optimized query
			const alliancePixelCount = await prisma.$queryRaw<Array<{total: bigint}>>`
				SELECT COALESCE(SUM(pixel_count), 0) as total
				FROM (
					SELECT COUNT(*) as pixel_count
					FROM Pixel p
					INNER JOIN User u ON p.paintedBy = u.id
					WHERE u.allianceId = ${alliance.id}
					AND u.allianceJoinedAt IS NOT NULL
					AND p.paintedAt >= u.allianceJoinedAt
				) as subquery
			`;

			const actualPixels = Number(alliancePixelCount[0]?.total || 0);
			const difference = actualPixels - alliance.pixelsPainted;

			if (difference !== 0) {
				allianceUpdates.push({
					allianceId: alliance.id,
					allianceName: alliance.name,
					currentPixels: alliance.pixelsPainted,
					actualPixels,
					difference
				});
			}
		} catch (error) {
			console.error(`Error processing alliance ${alliance.id}:`, error);
		}
	}

	console.log(`✅ Found ${allianceUpdates.length} alliances with pixel count differences`);

	// 5. Update alliances (if not dry run)
	if (!DRY_RUN && allianceUpdates.length > 0) {
		console.log("🔄 Step 5: Updating alliance pixel counts...");

		for (const update of allianceUpdates) {
			try {
				await prisma.alliance.update({
					where: { id: update.allianceId },
					data: { pixelsPainted: update.actualPixels }
				});

				console.log(`Alliance ${update.allianceName} (ID: ${update.allianceId}): ${update.currentPixels} → ${update.actualPixels} (${update.difference > 0 ? "+" : ""}${update.difference})`);
			} catch (error) {
				console.error(`Error updating alliance ${update.allianceId}:`, error);
			}
		}
	} else if (DRY_RUN) {
		console.log("🔍 DRY RUN - Would update the following alliances:");
		for (const update of allianceUpdates) {
			console.log(`  Alliance ${update.allianceName} (ID: ${update.allianceId}): ${update.currentPixels} → ${update.actualPixels} (${update.difference > 0 ? "+" : ""}${update.difference})`);
		}
	}

	// 6. Rebuild leaderboards (if not dry run)
	if (!DRY_RUN) {
		console.log("🔄 Step 6: Rebuilding leaderboard data...");

		try {
			// Clear all leaderboard data
			await prisma.leaderboardView.deleteMany({});
			console.log("✅ Cleared all leaderboard data");

			// Rebuild all-time leaderboards
			await prisma.$executeRaw`
				INSERT INTO LeaderboardView (type, mode, entityId, rank, pixelsPainted)
				SELECT 'player', 'all-time', id, ROW_NUMBER() OVER (ORDER BY pixelsPainted DESC), pixelsPainted
				FROM User
				WHERE role = 'user' AND pixelsPainted > 0
				ORDER BY pixelsPainted DESC
				LIMIT 50
			`;

			await prisma.$executeRaw`
				INSERT INTO LeaderboardView (type, mode, entityId, rank, pixelsPainted)
				SELECT 'alliance', 'all-time', id, ROW_NUMBER() OVER (ORDER BY pixelsPainted DESC), pixelsPainted
				FROM Alliance
				WHERE pixelsPainted > 0
				ORDER BY pixelsPainted DESC
				LIMIT 50
			`;

			console.log("✅ Rebuilt all-time leaderboards");
		} catch (error) {
			console.error("❌ Error rebuilding leaderboards:", error);
		}
	}

	// 7. Summary
	console.log("🎉 Optimized user pixels update completed!");
	console.log("📋 Summary:");
	console.log(`  - Processed ${totalUsers} users`);
	console.log(`  - Found ${userUpdates.length} users with pixel count differences`);
	console.log(`  - Found ${allianceUpdates.length} alliances with pixel count differences`);

	if (DRY_RUN) {
		console.log("  - DRY RUN: No changes were made");
	} else {
		console.log("  - All pixel counts have been updated");
		console.log("  - Leaderboard data has been rebuilt");
	}
} catch (error) {
	console.error("❌ Error during optimized user pixels update:", error);
} finally {
	await prisma.$disconnect();
}
