import _ from 'lodash';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { palette } from '~~/utils/palette';

async function drawPixelsToTile(prisma: PrismaClient, pixels: { x: number; y: number; colorId: number }[], tileX: number, tileY: number, season: number = 0): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const canvas = createCanvas(1000, 1000);
        const ctx = canvas.getContext('2d');

        const tiles = await tx.$queryRaw<{ season: number; x: number; y: number; imageData: Buffer }[]>(
            Prisma.sql`SELECT season, x, y, imageData FROM Tile WHERE season = ${season} AND x = ${tileX} AND y = ${tileY} LIMIT 1 FOR UPDATE`
        );
        const tile = tiles[0];

        if (tile?.imageData) {
            const image = await loadImage(tile.imageData);
            ctx.drawImage(image, 0, 0);
        } else {
            ctx.clearRect(0, 0, 1000, 1000);
        }

        const imageData = ctx.getImageData(0, 0, 1000, 1000);
        const data = imageData.data;

        for (const pixel of pixels) {
            const color = palette.find((c) => c.idx === pixel.colorId);
            if (!color) continue;
            if (pixel.colorId === 0) continue;

            const index = (pixel.y * 1000 + pixel.x) * 4;
            data[index + 0] = color.r;
            data[index + 1] = color.g;
            data[index + 2] = color.b;
            data[index + 3] = color.a;
        }
        ctx.putImageData(imageData, 0, 0);

        const buffer = canvas.toBuffer('image/png');
        await tx.tile.upsert({
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
    });
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const amount = parseInt(body.amount ?? '0');
    if (Number.isNaN(amount) || amount <= 0) throw new Error('Amount is required and must be a positive integer');

    const prisma = new PrismaClient();

    const result = await prisma.user.aggregate({
        _max: { id: true },
    });
    const maxId = result._max.id;
    if (!maxId) throw new Error('No users found');

    for (let i = 0; i < amount; i++) {
        let randomUser = null;
        while (!randomUser) {
            const randomId = randomInt(1, maxId);
            randomUser = await prisma.user.findUnique({ where: { id: randomId } });
        }

        const season = 0;
        const tileX = randomInt(0, 2048);
        const tileY = randomInt(0, 2048);
        const pX = randomInt(0, 1000);
        const pY = randomInt(0, 1000);
        const colorId = randomInt(1, 64);

        await prisma.tile.upsert({
            where: {
                season_x_y: {
                    season: 0,
                    x: tileX,
                    y: tileY,
                },
            },
            create: {
                season: 0,
                x: tileX,
                y: tileY,
            },
            update: {},
        });

        await prisma.pixel.create({
            data: {
                season,
                tileX,
                tileY,
                x: pX,
                y: pY,
                colorId,
                paintedBy: randomUser.id,
                paintedAt: new Date(),
            },
        });

        await drawPixelsToTile(prisma, [{ x: pX, y: pY, colorId }], tileX, tileY, season);
    }

    setResponseStatus(event, 200);
});
