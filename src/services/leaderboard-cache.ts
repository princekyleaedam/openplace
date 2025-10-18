type CacheEntry<T> = {
  value: T
  expiresAt: number
}

// TODO: move to redis maybe xD?
export class LeaderboardMemoryCache {
	private store = new Map<string, CacheEntry<unknown>>();
	private defaultTtlMs: number;

	constructor(ttlSeconds?: number) {
		const envTtl = Number.parseInt(process.env["LEADERBOARD_CACHE_TTL_SECONDS"] || "", 10); // hmm xD
		const ttl = Number.isFinite(envTtl) && envTtl > 0 ? envTtl : (ttlSeconds ?? 30);
		this.defaultTtlMs = ttl * 1000;
	}

	get<T>(key: string): T | undefined {
		const entry = this.store.get(key);
		if (!entry) return undefined;
		if (Date.now() >= entry.expiresAt) {
			this.store.delete(key);
			return undefined;
		}
		return entry.value as T;
	}

	set<T>(key: string, value: T, ttlSeconds?: number): void {
		const ttlMs = (ttlSeconds && ttlSeconds > 0 ? ttlSeconds * 1000 : this.defaultTtlMs);
		this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
	}

	clear(): void {
		this.store.clear();
	}
}

export const leaderboardCache = new LeaderboardMemoryCache();


