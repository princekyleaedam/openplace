import { LeaderboardMode, leaderboardService, LeaderboardType } from "../src/services/leaderboard.js";

console.log("Initializing leaderboard data...");

console.log("Initializing regular leaderboards...");
const types: LeaderboardType[] = ["player", "alliance", "country", "region"];
const modes: LeaderboardMode[] = ["today", "week", "month", "all-time"];

for (const type of types) {
	console.log(`  - ${type} leaderboards...`);
	for (const mode of modes) {
		await leaderboardService.invalidateLeaderboard(type, mode);
	}
}

console.log("Leaderboard initialization completed successfully!");
