import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export function addPrismaToRequest(req: any, _res: any, next: any) {
	req.prisma = prisma;
	return next?.();
}
