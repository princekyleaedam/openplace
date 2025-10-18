import _ from 'lodash';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from "bcryptjs";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const amount = parseInt(body.amount ?? '0');
    if (Number.isNaN(amount) || amount <= 0) throw new Error('Amount is required and must be a positive integer');

    const prisma = new PrismaClient();
    for (let i = 0; i < amount; i++) {
        await prisma.user.create({
            data: {
                name: 'dummy_' + Math.random().toString(36).substring(2, 15),
                passwordHash: await bcrypt.hash('password', 10),
                country: 'US',
                role: 'user',
                droplets: 1000,
                currentCharges: 20,
                maxCharges: 20,
                pixelsPainted: 0,
                level: 1,
                extraColorsBitmap: 0,
                equippedFlag: 0,
                chargesLastUpdatedAt: new Date(),
            },
        });
    }
    setResponseStatus(event, 200);
});
