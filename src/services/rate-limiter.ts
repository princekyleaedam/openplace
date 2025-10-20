interface RateLimitEntry {
	count: number;
	firstAttempt: number;
	lastAttempt: number;
	blocked: boolean;
	blockUntil?: number;
}

export class RateLimiter {
	private attempts = new Map<string, RateLimitEntry>();
	private cleanupInterval: NodeJS.Timeout;

	constructor() {
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 60000);
	}

	private cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.attempts.entries()) {
			if (now - entry.lastAttempt > 300000) {
				this.attempts.delete(key);
			}
		}
	}

	checkRateLimit(ip: string, maxAttempts: number = 5, windowMs: number = 300000): {
		allowed: boolean;
		remaining: number;
		resetTime: number;
	} {
		const now = Date.now();
		const key = ip;
		let entry = this.attempts.get(key);

		if (!entry) {
			entry = {
				count: 0,
				firstAttempt: now,
				lastAttempt: now,
				blocked: false
			};
			this.attempts.set(key, entry);
		}

		if (entry.blocked && entry.blockUntil && now < entry.blockUntil) {
			return {
				allowed: false,
				remaining: 0,
				resetTime: entry.blockUntil
			};
		}

		if (entry.blocked && entry.blockUntil && now >= entry.blockUntil) {
			entry.blocked = false;
			entry.count = 0;
			entry.firstAttempt = now;
		}

		if (now - entry.firstAttempt > windowMs) {
			entry.count = 0;
			entry.firstAttempt = now;
		}

		entry.count++;
		entry.lastAttempt = now;

		if (entry.count > maxAttempts) {
			entry.blocked = true;
			entry.blockUntil = now + (windowMs * 2);
			return {
				allowed: false,
				remaining: 0,
				resetTime: entry.blockUntil
			};
		}

		return {
			allowed: true,
			remaining: maxAttempts - entry.count,
			resetTime: entry.firstAttempt + windowMs
		};
	}

	recordAttempt(ip: string, success: boolean): void {
		const entry = this.attempts.get(ip);
		if (entry && success) {
			entry.count = Math.max(0, entry.count - 1);
		}
	}

	getStats(): { totalIPs: number; blockedIPs: number } {
		let blockedIPs = 0;
		for (const entry of this.attempts.values()) {
			if (entry.blocked) blockedIPs++;
		}
		return {
			totalIPs: this.attempts.size,
			blockedIPs
		};
	}

	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}
}

export const rateLimiter = new RateLimiter();
