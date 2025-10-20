import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INDEXES_TO_DROP = [
    "Pixel_regionCityId_idx",
    "Pixel_regionCountryId_idx",
    "Pixel_paintedAt_idx",
    "Pixel_paintedAt_regionCityId_idx",
    "Pixel_paintedAt_regionCountryId_idx",
    "Pixel_regionCountryId_paintedAt_regionCityId_idx"
];


async function dropIndex(indexName: string): Promise<void> {
    console.log(`Dropping index ${indexName}...`);
    await prisma.$executeRawUnsafe(`ALTER TABLE Pixel DROP INDEX \`${indexName}\``);
    console.log(`Dropped ${indexName}`);
}

async function optimizePixel(): Promise<void> {
    console.log("Optimizing Pixel table (may take a while)...");
    await prisma.$executeRawUnsafe(`OPTIMIZE TABLE Pixel`);
    console.log("Optimize completed");
}

async function main() {
    try {
        console.log("Checking existing indexes on Pixel...");
        const showAll = await prisma.$queryRaw<any[]>`SHOW INDEX FROM Pixel`;
        const existing = new Set(showAll.map(r => r.Key_name as string));
        console.table(
            showAll.map(r => ({ Key: r.Key_name, Column: r.Column_name, Non_unique: r.Non_unique }))
        );

        const toDrop = INDEXES_TO_DROP.filter(name => existing.has(name));
        if (toDrop.length === 0) {
            console.log("No matching indexes to drop.");
        } else {
            for (const idx of toDrop) {
                try {
                    await dropIndex(idx);
                } catch (e) {
                    console.error(`Failed to drop ${idx}:`, e);
                }
            }
        }

        // Optional optimize
        const shouldOptimize = process.env["OPTIMIZE_AFTER_DROP"] === "1" || process.argv.includes("--optimize");
        if (shouldOptimize) {
            await optimizePixel();
        } else {
            console.log("Skipping OPTIMIZE (use --optimize flag or set OPTIMIZE_AFTER_DROP=1).");
        }

        console.log("Done.");
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});


