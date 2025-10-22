import { computed, onMounted, onUnmounted, ref } from "vue";

export const useCharges = (initialCharges: number, maxCharges: number, cooldownMs: number) => {
	const currentCharges = ref(initialCharges);
	const max = ref(maxCharges);
	const cooldown = ref(cooldownMs);
	let interval: NodeJS.Timeout | null = null;

	// Calculate time until next charge in seconds
	const timeUntilNextCharge = ref(0);
	let lastRechargeTime = Date.now();

	const startChargeTimer = () => {
		if (interval) {
			clearInterval(interval);
		}

		lastRechargeTime = Date.now();
		if (currentCharges.value < max.value) {
			timeUntilNextCharge.value = Math.ceil(cooldown.value / 1000);
		}

		interval = setInterval(() => {
			if (currentCharges.value < max.value) {
				const elapsed = Date.now() - lastRechargeTime;
				const remaining = cooldown.value - elapsed;

				if (remaining <= 0) {
					currentCharges.value = Math.floor(Math.min(currentCharges.value + 1, max.value));
					lastRechargeTime = Date.now();

					timeUntilNextCharge.value = currentCharges.value < max.value ? Math.ceil(cooldown.value / 1000) : 0;
				} else {
					timeUntilNextCharge.value = Math.ceil(remaining / 1000);
				}
			} else {
				timeUntilNextCharge.value = 0;
			}
		}, 1000);
	};

	const decrementCharge = () => {
		if (currentCharges.value > 0) {
			currentCharges.value = Math.floor(currentCharges.value - 1);
			if (currentCharges.value === max.value - 1) {
				startChargeTimer();
			}
		}
	};

	const incrementCharge = () => {
		if (currentCharges.value < max.value) {
			currentCharges.value = Math.floor(currentCharges.value + 1);
		}
	};

	const formattedTime = computed(() => {
		const minutes = Math.floor(timeUntilNextCharge.value / 60);
		const seconds = timeUntilNextCharge.value % 60;
		return `${minutes}:${`${seconds}`.padStart(2, "0")}`;
	});

	onMounted(() => {
		// If charging up, start the timer
		if (currentCharges.value < max.value) {
			startChargeTimer();
		}
	});

	onUnmounted(() => {
		if (interval) {
			clearInterval(interval);
		}
	});

	return {
		currentCharges,
		maxCharges: max,
		cooldownMs: cooldown,
		timeUntilNextCharge,
		formattedTime,
		decrementCharge,
		incrementCharge,
		startChargeTimer
	};
};
