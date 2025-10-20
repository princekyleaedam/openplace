import { PrismaClient } from "@prisma/client";
import { leaderboardService } from "../src/services/leaderboard.js";
import { RegionService } from "../src/services/region.js";

const prisma = new PrismaClient();
const regionService = new RegionService(prisma);


async function migrateToUserRegionStats() {
	console.log("Starting RAW SQL migration to UserRegionStats...");

	try {
        // Clear existing data
		console.log("Clearing existing UserRegionStats data...");
        await prisma.userRegionStats.deleteMany({});
		console.log("Clearing existing UserRegionStatsDaily data...");
        await prisma.userRegionStatsDaily.deleteMany({});

		// Check total pixels first
		const totalPixelCount = await prisma.pixel.count();
		console.log(`Total pixels in database: ${totalPixelCount.toLocaleString()}`);

		// Check pixels with region data
		const pixelsWithRegion = await prisma.pixel.count({
			where: {
				OR: [
					{ regionCityId: { not: null } },
					{ regionCountryId: { not: null } }
				]
			}
		});
		console.log(`Pixels with region data: ${pixelsWithRegion.toLocaleString()}`);

		// Check pixels without region data
		const pixelsWithoutRegion = await prisma.pixel.count({
			where: {
				AND: [
					{ regionCityId: null },
					{ regionCountryId: null }
				]
			}
		});
		console.log(`Pixels without region data: ${pixelsWithoutRegion.toLocaleString()}`);

		// Use raw SQL for maximum performance
		console.log("Using raw SQL for maximum performance...");

        // Build in day-sized batches to avoid lock explosion
		console.log("Scanning date range...");
        const range = await prisma.$queryRaw<{ minDate: Date | null; maxDate: Date | null }[]>`
            SELECT MIN(DATE(paintedAt)) AS minDate, MAX(DATE(paintedAt)) AS maxDate
            FROM Pixel
            WHERE regionCityId IS NOT NULL OR regionCountryId IS NOT NULL
        `;
        const bounds = range[0];
        if (!bounds || !bounds.minDate || !bounds.maxDate) {
            console.log("ℹ️ No dated pixels to process.");
        } else {
            const start = new Date(bounds.minDate as any);
            const end = new Date(bounds.maxDate as any);
            let cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            const oneDayMs = 24 * 60 * 60 * 1000;
            let dayIndex = 0;
            while (cur <= end) {
                const next = new Date(cur.getTime() + oneDayMs);
                const label = cur.toISOString().slice(0, 10);
				process.stdout.write(`\rProcessing ${label} ...   `);
                // Retry wrapper to handle lock errors transiently
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        // First, ensure duplicates are not accumulating for this day
                        await prisma.$executeRaw`
                            DELETE ur1 FROM UserRegionStats ur1
                            INNER JOIN UserRegionStats ur2
                            ON ur1.userId = ur2.userId
                            AND (ur1.regionCityId <=> ur2.regionCityId)
                            AND (ur1.regionCountryId <=> ur2.regionCountryId)
                            AND (ur1.allianceId <=> ur2.allianceId)
                            AND ur1.timePeriod = ur2.timePeriod
                            AND ur1.id < ur2.id
                            WHERE ur1.timePeriod = ${cur}
                        `;

                        // UserRegionStats for this day
                        await prisma.$executeRaw`
                            INSERT INTO UserRegionStats (userId, regionCityId, regionCountryId, allianceId, timePeriod, pixelsPainted, lastPaintedAt)
                            SELECT
                                p.paintedBy AS userId,
                                p.regionCityId,
                                p.regionCountryId,
                                u.allianceId,
                                ${cur} AS timePeriod,
                                COUNT(*) AS pixelsPainted,
                                MAX(p.paintedAt) AS lastPaintedAt
                            FROM Pixel p
                            LEFT JOIN User u ON p.paintedBy = u.id
                            WHERE (p.regionCityId IS NOT NULL OR p.regionCountryId IS NOT NULL)
                              AND p.paintedAt >= ${cur} AND p.paintedAt < ${next}
                            GROUP BY p.paintedBy, p.regionCityId, p.regionCountryId, u.allianceId
                            ON DUPLICATE KEY UPDATE
                                pixelsPainted = VALUES(pixelsPainted),
                                lastPaintedAt = VALUES(lastPaintedAt)
                        `;

                        // Daily rollup for this day
                        await prisma.$executeRaw`
                            INSERT INTO UserRegionStatsDaily (userId, regionCityId, regionCountryId, allianceId, date, pixelsPainted, lastPaintedAt)
                            SELECT
                                p.paintedBy AS userId,
                                p.regionCityId,
                                p.regionCountryId,
                                u.allianceId,
                                ${cur} AS date,
                                COUNT(*) AS pixelsPainted,
                                MAX(p.paintedAt) AS lastPaintedAt
                            FROM Pixel p
                            LEFT JOIN User u ON p.paintedBy = u.id
                            WHERE (p.regionCityId IS NOT NULL OR p.regionCountryId IS NOT NULL)
                              AND p.paintedAt >= ${cur} AND p.paintedAt < ${next}
                            GROUP BY p.paintedBy, p.regionCityId, p.regionCountryId, u.allianceId
                            ON DUPLICATE KEY UPDATE
                                pixelsPainted = VALUES(pixelsPainted),
                                lastPaintedAt = VALUES(lastPaintedAt)
                        `;
                        break; // jarvis help me destroy this
                    } catch (e: any) {
                        const msg = String(e?.message || e);
                        if (attempt < 3 && (msg.includes('lock') || msg.includes('1206') || msg.includes('deadlock'))) {
						const backoff = 200 + attempt * 300;
                            await new Promise(r => setTimeout(r, backoff));
                            continue;
                        }
                        throw e;
                    }
                }
                dayIndex++;
                if (dayIndex % 3 === 0) {
                    // brief pause between small batches to reduce pressure
                    await new Promise(r => setTimeout(r, 50));
                }
                cur = next;
            }
			process.stdout.write("\n");
        }

		console.log("Raw SQL migration completed successfully.");

		// Verify migration
        const totalRecords = await prisma.userRegionStats.count();
        const totalDailyRecords = await prisma.userRegionStatsDaily.count();
		const totalPixelsAgg = await prisma.userRegionStats.aggregate({
			_sum: { pixelsPainted: true }
		});
        const totalPixelsDailyAgg = await prisma.userRegionStatsDaily.aggregate({
            _sum: { pixelsPainted: true }
        });

		console.log(`Total UserRegionStats records: ${totalRecords.toLocaleString()}`);
		console.log(`Total UserRegionStatsDaily records: ${totalDailyRecords.toLocaleString()}`);
		console.log(`Total pixels (Stats): ${(totalPixelsAgg._sum.pixelsPainted || 0).toLocaleString()}`);
		console.log(`Total pixels (Daily): ${(totalPixelsDailyAgg._sum.pixelsPainted || 0).toLocaleString()}`);

		// Show some sample data
		const sampleData = await prisma.userRegionStats.findMany({
			take: 5,
			include: {
				user: {
					select: { name: true, allianceId: true }
				}
			},
			orderBy: { pixelsPainted: 'desc' }
		});

		console.log("\nSample data:");
		for (const record of sampleData) {
			console.log(`User: ${record.user.name}, Region: ${record.regionCityId}/${record.regionCountryId}, Alliance: ${record.allianceId}, Pixels: ${record.pixelsPainted}`);
		}

	} catch (error) {
	console.error("Migration failed:", error);
		throw error;
	}
}

async function migratePixelsWithoutRegion() {
	console.log("Migrating pixels without region data...");

	try {
		// Get pixels without region data in batches
		const batchSize = 1000;
		let offset = 0;
		let totalProcessed = 0;
		let totalUpdated = 0;

		while (true) {
			const pixels = await prisma.pixel.findMany({
				where: {
					AND: [
						{ regionCityId: null },
						{ regionCountryId: null }
					]
				},
				select: {
					id: true,
					season: true,
					tileX: true,
					tileY: true,
					x: true,
					y: true
				},
				take: batchSize,
				skip: offset
			});

			if (pixels.length === 0) break;

			console.log(`Processing batch ${Math.floor(offset / batchSize) + 1}: ${pixels.length} pixels`);

			for (const pixel of pixels) {
				try {
					// Convert pixel coordinates to region
					const region = await regionService.getRegionForCoordinates(
						[pixel.tileX, pixel.tileY],
						[pixel.x, pixel.y]
					);

					// Update pixel with region data
					await prisma.pixel.update({
						where: { id: pixel.id },
						data: {
							regionCityId: region.cityId,
							regionCountryId: region.countryId
						}
					});

					totalUpdated++;
				} catch (error) {
					console.error(`Error processing pixel ${pixel.id}:`, error);
				}
			}

			totalProcessed += pixels.length;
			offset += batchSize;

			console.log(`Processed ${totalProcessed} pixels, updated ${totalUpdated} with region data`);
		}

		console.log(`Migration completed: ${totalUpdated} pixels updated with region data`);
		return totalUpdated;

	} catch (error) {
		console.error("Migration failed:", error);
		throw error;
	}
}

async function verifyRegionStats() {
    console.log("Verifying UserRegionStats data...");

	try {
		const totalStats = await prisma.userRegionStats.count();
		console.log(`Total UserRegionStats records: ${totalStats.toLocaleString()}`);

		const statsByLastPaintedAt = await prisma.userRegionStats.groupBy({
			by: ['lastPaintedAt'],
			_count: { id: true }
		});

		console.log("Records by lastPaintedAt (sample):");
		const sortedStats = statsByLastPaintedAt.sort((a, b) => (b.lastPaintedAt as any) - (a.lastPaintedAt as any)).slice(0, 10);
		for (const stat of sortedStats) {
			console.log(`  ${new Date(stat.lastPaintedAt as any).toISOString()}: ${stat._count.id.toLocaleString()}`);
		}

		const statsByAlliance = await prisma.userRegionStats.groupBy({
			by: ['allianceId'],
			_count: { id: true }
		});

		const withAlliance = statsByAlliance.filter(s => s.allianceId !== null).reduce((sum, s) => sum + s._count.id, 0);
		const withoutAlliance = statsByAlliance.find(s => s.allianceId === null)?._count.id || 0;

		console.log(`Records with alliance: ${withAlliance.toLocaleString()}`);
		console.log(`Records without alliance: ${withoutAlliance.toLocaleString()}`);

		// Check total pixels tracked
		const totalPixelsAgg = await prisma.userRegionStats.aggregate({
			_sum: { pixelsPainted: true }
		});
		console.log(`Total pixels tracked: ${(totalPixelsAgg._sum.pixelsPainted || 0).toLocaleString()}`);

		// Verify against original pixel data
		console.log("\nVerifying against original pixel data...");

		const originalPixelCount = await prisma.pixel.count({
			where: {
				OR: [
					{ regionCityId: { not: null } },
					{ regionCountryId: { not: null } }
				]
			}
		});

		console.log(`Original pixels with region data: ${originalPixelCount.toLocaleString()}`);
		console.log(`UserRegionStats total pixels: ${(totalPixelsAgg._sum.pixelsPainted || 0).toLocaleString()}`);

		if (originalPixelCount === (totalPixelsAgg._sum.pixelsPainted || 0)) {
			console.log("Pixel counts match.");
		} else {
			console.log("Pixel counts don't match - there might be some pixels without region data");
		}

		console.log("Verification completed.");
	} catch (error) {
	console.error("Verification failed:", error);
		throw error;
	}
}

async function initializeLeaderboards() {
	console.log("Initializing leaderboards...");

	try {
		await leaderboardService.initializeAllLeaderboards();
		console.log("Leaderboards initialized successfully.");
	} catch (error) {
	console.error("Leaderboard initialization failed:", error);
		throw error;
	}
}

async function setupRegionStats() {
	console.log("Setting up UserRegionStats system...");

	try {
        // Step 1: Check if tables exist
		console.log("\nStep 1: Checking database schema...");
		try {
			await prisma.userRegionStats.count();
			console.log("UserRegionStats table exists");
		} catch (error) {
			console.log("UserRegionStats table not found. Please run 'npx prisma db push' first.");
			process.exit(1);
		}

        try {
            await prisma.userRegionStatsDaily.count();
			console.log("UserRegionStatsDaily table exists");
        } catch (error) {
			console.log("UserRegionStatsDaily table not found. Please run 'npx prisma db push' first.");
            process.exit(1);
        }

		// Step 2: Migrate pixels without region data first
		console.log("\nStep 2: Migrating pixels without region data...");
		const migratedPixels = await migratePixelsWithoutRegion();
		console.log(`Migrated ${migratedPixels} pixels with region data`);

		// Step 3: Migrate existing pixel data to UserRegionStats
		console.log("\nStep 3: Migrating existing pixel data to UserRegionStats...");
		await migrateToUserRegionStats();

		// Step 4: Verify migration
		console.log("\nStep 4: Verifying migration...");
		await verifyRegionStats();

		// Step 5: Initialize leaderboards
		console.log("\nStep 5: Initializing leaderboards...");
		await initializeLeaderboards();

		console.log("\nSetup completed successfully.");
		console.log("\nWhat was done:");
		console.log(`  - Migrated ${migratedPixels} pixels without region data`);
		console.log("  - Migrated all existing pixel data to UserRegionStats using RAW SQL");
		console.log("  - Verified data integrity");
		console.log("  - Initialized leaderboards");
		console.log("\nNow you can use real-time region leaderboards.");

	} catch (error) {
	console.error("Setup failed:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

setupRegionStats();

//jarvis help me translate to English