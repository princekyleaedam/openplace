export function calculateChargeRecharge(currentCharges: number, maxCharges: number, lastUpdate: Date, cooldownMs: number): number {
	if (currentCharges >= maxCharges) {
		return currentCharges;
	}

	const timeSinceLastUpdate = Date.now() - lastUpdate.getTime();
	const chargesGenerated = Math.floor(timeSinceLastUpdate / cooldownMs);

	return Math.min(maxCharges, currentCharges + chargesGenerated);
}
