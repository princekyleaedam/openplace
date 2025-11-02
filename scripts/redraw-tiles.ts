import { PrismaClient } from "@prisma/client";
import { PixelService } from "../src/services/pixel";

const prisma = new PrismaClient();
const pixelService = new PixelService(prisma);

const tiles = await prisma.tile.findMany();

for (const tile of tiles) {
	process.stdout.write(`\rRedrawing ${`${tile.x}`.padStart(4)},${`${tile.y}`.padStart(4)}`);
	await pixelService.updatePixelTile(tile.x, tile.y);
}
