#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import { Region, RegionService } from "../src/services/region";

const prisma = new PrismaClient();
const regionService = new RegionService(prisma);

let cursor: number | undefined;
let hasMore = true;
let done = 0;

const count = await prisma.pixel.count({
	where: {
		regionCityId: null
	}
});

console.log(`Total pixels to migrate: ${count}`);

const regionCache = new Map<string, Region>();

while (hasMore) {
	const pixels = await prisma.pixel.findMany({
		where: {
			regionCityId: null
		},
		take: 100,
		orderBy: { id: "asc" },
		...(cursor ? { cursor: { id: cursor } } : {})
	});

	if (pixels.length === 0) {
		hasMore = false;
		break;
	}

	process.stdout.write(`\rUpdating pixels ${done + 1} to ${done + pixels.length}`);

	// Get regions first (slow - can time out the transaction)
	for (const pixel of pixels) {
		const { x, y, tileX, tileY } = pixel;

		const coordKey = `${tileX},${tileY},${x},${y}`;
		if (!regionCache.has(coordKey)) {
			regionCache.set(coordKey, await regionService.getRegionForCoordinates([tileX, tileY], [x, y]));
		}
	}

	// Update pixels with regions
	await prisma.$transaction(async (tx) => {
		for (const pixel of pixels) {
			const { id, x, y, tileX, tileY } = pixel;
			const coordKey = `${tileX},${tileY},${x},${y}`;
			const region = regionCache.get(coordKey)!;

			if (region) {
				await tx.pixel.update({
					where: { id },
					data: {
						regionCityId: region.cityId,
						regionCountryId: region.countryId
					}
				});
			}
		}
	});

	done += pixels.length;
	cursor = pixels.at(-1)?.id;
}

console.log("\nDone");
