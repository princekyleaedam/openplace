import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

console.log("Updating allianceJoinedAt for existing alliance members...");

try {
	// Get all users who are in alliances but don't have allianceJoinedAt set
	const usersInAlliances = await prisma.user.findMany({
		where: {
			allianceId: { not: null },
			allianceJoinedAt: null
		},
		select: {
			id: true,
			allianceId: true,
			createdAt: true
		}
	});

	console.log(`Found ${usersInAlliances.length} users in alliances without allianceJoinedAt`);

	// Update each user with their account creation date as allianceJoinedAt
	// This is a reasonable approximation since we don't have exact join dates
	for (const user of usersInAlliances) {
		await prisma.user.update({
			where: { id: user.id },
			data: {
				allianceJoinedAt: user.createdAt // Use account creation date as approximation
			}
		});
	}

	console.log(`Updated allianceJoinedAt for ${usersInAlliances.length} users`);

	console.log("Alliance joined date update complete!");
} catch (error) {
	console.error("Error updating alliance joined dates:", error);
} finally {
	await prisma.$disconnect();
}
