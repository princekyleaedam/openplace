import _ from 'lodash';
import { Prisma, PrismaClient } from '@prisma/client';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { palette, similarColor } from '~~/utils/palette';

type Pixel = {
    tileX: number;
    tileY: number;
    x: number;
    y: number;
    colorIdx: number;
};

async function updatePixelTile(prisma: PrismaClient, tileX: number, tileY: number, season: number = 0): Promise<{ buffer: Buffer; updatedAt: Date }> {
    const canvas = createCanvas(1000, 1000);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(1000, 1000);

    const pixels = await prisma.pixel.findMany({
        where: { tileX, tileY, season },
        select: {
            x: true,
            y: true,
            colorId: true,
        },
    });

    for (const pixel of pixels) {
        const color = palette.find((c) => c.idx === pixel.colorId);
        if (!color) continue;
        if (pixel.colorId === 0) continue;

        const index = (pixel.y * 1000 + pixel.x) * 4;
        imageData.data[index + 0] = color.r;
        imageData.data[index + 1] = color.g;
        imageData.data[index + 2] = color.b;
        imageData.data[index + 3] = color.a;
    }
    ctx.putImageData(imageData, 0, 0);

    const buffer = canvas.toBuffer('image/png');
    const { updatedAt } = await prisma.tile.upsert({
        where: {
            season_x_y: {
                season,
                x: tileX,
                y: tileY,
            },
        },
        create: {
            season,
            x: tileX,
            y: tileY,
            imageData: buffer,
        },
        update: {
            imageData: buffer,
        },
    });

    return { buffer, updatedAt };
}

export default defineEventHandler(async (event) => {
    const body = await readMultipartFormData(event);
    const prisma = new PrismaClient();

    let tileX: number | null = null;
    let tileY: number | null = null;
    let x: number | null = null;
    let y: number | null = null;
    let buffer: Buffer | null = null;

    for (const part of body ?? []) {
        if (part.name === 'tileX') tileX = parseInt(part.data.toString());
        if (part.name === 'tileY') tileY = parseInt(part.data.toString());
        if (part.name === 'x') x = parseInt(part.data.toString());
        if (part.name === 'y') y = parseInt(part.data.toString());
        if (part.name === 'image') buffer = part.data;
    }

    if (tileX === null || tileY === null || x === null || y === null) throw new Error('Coordinates not found');
    if (buffer === null) throw new Error('Image not found');

    const image = await loadImage(buffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const pixels: Pixel[] = [];
    for (let py = 0; py < image.height; py++) {
        for (let px = 0; px < image.width; px++) {
            const index = (py * image.width + px) * 4;
            const r = imageData.data[index + 0] ?? 0;
            const g = imageData.data[index + 1] ?? 0;
            const b = imageData.data[index + 2] ?? 0;
            const a = imageData.data[index + 3] ?? 0;

            const color = similarColor({ r, g, b, a }, true);
            if (color.idx === 0) continue;

            pixels.push({
                tileX: Math.floor(tileX + (x + px) / 1000),
                tileY: Math.floor(tileY + (y + py) / 1000),
                x: (x + px) % 1000,
                y: (y + py) % 1000,
                colorIdx: color.idx,
            });
        }
    }

    const pixelsByTiles = _.chain(pixels)
        .groupBy((p) => p.tileX + '-' + p.tileY)
        .values()
        .value();

    for (const pixels of pixelsByTiles) {
        const tile = {
            x: pixels[0].tileX,
            y: pixels[0].tileY,
        };

        await prisma.tile.upsert({
            where: {
                season_x_y: {
                    season: 0,
                    x: tile.x,
                    y: tile.y,
                },
            },
            create: {
                season: 0,
                x: tile.x,
                y: tile.y,
            },
            update: {},
        });

        for (let i = 0; i < pixels.length; i += 1000) {
            const batch = pixels.slice(i, i + 1000);
            await prisma.$executeRaw`
                INSERT INTO Pixel (season, tileX, tileY, x, y, colorId, paintedBy, paintedAt)
                VALUES ${Prisma.join(batch.map((v: Pixel) => Prisma.sql`(0, ${v.tileX}, ${v.tileY}, ${v.x}, ${v.y}, ${v.colorIdx}, 1, now())`))}
                ON DUPLICATE KEY UPDATE
                    colorId = VALUES(colorId),
                    paintedBy = VALUES(paintedBy),
                    paintedAt = VALUES(paintedAt)
            `;
        }

        await updatePixelTile(prisma, tile.x, tile.y);
    }

    setResponseStatus(event, 200);
});
