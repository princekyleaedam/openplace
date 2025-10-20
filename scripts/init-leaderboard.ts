import { leaderboardService } from "../src/services/leaderboard.js";

async function initializeLeaderboards() {
  console.log("Initializing leaderboard data...");
  
  try {
    console.log("Initializing regular leaderboards...");
    const types = ["player", "alliance", "country", "region"];
    const modes = ["today", "week", "month", "all-time"];

    for (const type of types) {
      console.log(`  - ${type} leaderboards...`);
      for (const mode of modes) {
        await leaderboardService.invalidateLeaderboard(type as any, mode as any);
      }
    }

    console.log("Leaderboard initialization completed successfully!");
  } catch (error) {
    console.error("Error initializing leaderboards:", error);
    process.exit(1);
  }
}

initializeLeaderboards();
