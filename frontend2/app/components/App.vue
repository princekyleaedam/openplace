<template>
  <div class="app-container">
    <ClientOnly>
      <Map
        :pixels="pixels"
        :is-drawing="isPaintOpen"
        @map-click="handleMapClick"
        @map-hover="handleMapHover"
        @draw-pixels="handleDrawPixels"
      />
      <template #fallback>
        <div class="map-loading" />
      </template>
    </ClientOnly>

    <UserAvatar
      :user="user"
      @click="toggleUserMenu"
    />

    <UserMenu
      ref="userMenuRef"
      :is-open="isUserMenuOpen"
      :user="user"
      @close="isUserMenuOpen = false"
    />

    <PaintButton
      :charges="currentCharges"
      :max-charges="maxCharges"
      :is-drawing="isPaintOpen"
      :time-until-next="formattedTime"
      @click="isPaintOpen = !isPaintOpen"
    />

    <ColorPalette
      :is-open="isPaintOpen"
      :selected-color="selectedColor"
      :is-eraser-mode="isEraserMode"
      :charges="currentCharges"
      :max-charges="maxCharges"
      :pixel-count="pixels.length"
      :time-until-next="formattedTime"
      @color-select="handleColorSelect"
      @close="handleClosePaint"
      @toggle-eraser="isEraserMode = !isEraserMode"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import Map from "~/components/Map.vue";
import PaintButton from "~/components/PaintButton.vue";
import ColorPalette from "~/components/ColorPalette.vue";
import UserAvatar from "~/components/UserAvatar.vue";
import UserMenu from "~/components/UserMenu.vue";
import { getPixelId, type LatLng, latLngToTileCoords, type TileCoords } from "~/utils/coordinates";
import { type UserProfile, useUserProfile } from "~/composables/useUserProfile";
import { useCharges } from "~/composables/useCharges";

interface Pixel {
	id: string;
	tileCoords: TileCoords;
	color: string;
}

const isPaintOpen = ref(false);
const isUserMenuOpen = ref(false);
const selectedColor = ref("rgba(0,0,0,1)");
const isEraserMode = ref(false);
const pixels = ref<Pixel[]>([]);
const userProfile = ref<UserProfile | null>(null);
const isLoading = ref(true);
const userMenuRef = ref();

const {
	currentCharges,
	maxCharges,
	formattedTime,
	decrementCharge,
	incrementCharge
} = useCharges(0, 100, 30_000);

const user = computed(() => {
	const value = userProfile.value;
	if (!value) {
		return {
			username: "Loading...",
			level: 0,
			levelProgress: 0,
			pixelsPainted: 0,
			avatar: ""
		};
	}

	return {
		username: value.name,
		level: Math.floor(value.level),
		levelProgress: 0, // TODO
		pixelsPainted: Math.floor(value.pixelsPainted),
		avatar: value.picture
	};
});

const { fetchUserProfile } = useUserProfile();

onMounted(async () => {
	try {
		userProfile.value = await fetchUserProfile();
		currentCharges.value = Math.floor(userProfile.value.charges.count);
		maxCharges.value = Math.floor(userProfile.value.charges.max);
	} catch (error) {
		console.error("Failed to fetch user profile:", error);
	}

	isLoading.value = false;

	document.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
	document.removeEventListener("keydown", handleKeyDown);
});

const clearPendingPixels = () => {
	const pixelCount = pixels.value.length;
	pixels.value = [];
	for (let i = 0; i < pixelCount; i++) {
		incrementCharge();
	}
};

const handleClosePaint = () => {
	clearPendingPixels();
	isPaintOpen.value = false;
};

const handleColorSelect = (color: string) => {
	selectedColor.value = color;
};

const handleKeyDown = (event: KeyboardEvent) => {
	if (event.code === "KeyE") {
		isEraserMode.value = !isEraserMode.value;
	}
};

const drawPixelAtCoords = (tileCoords: TileCoords) => {
	if (!isPaintOpen.value || currentCharges.value <= 0) {
		return;
	}

	const pixelId = getPixelId(tileCoords);

	const existingPixelIndex = pixels.value.findIndex(p => p.id === pixelId);

	if (isEraserMode.value) {
		if (existingPixelIndex >= 0) {
			pixels.value = pixels.value.filter((_, index) => index !== existingPixelIndex);
			incrementCharge();
		}
	} else {
		const color = selectedColor.value;
		const newPixel: Pixel = {
			id: pixelId,
			tileCoords,
			color
		};

		if (existingPixelIndex >= 0) {
			pixels.value[existingPixelIndex] = newPixel;
		} else {
			pixels.value.push(newPixel);
			decrementCharge();
		}
	}
};

const drawPixel = (coords: LatLng) => {
	// TODO: This is messed up
	const tileCoords = latLngToTileCoords([coords[1], coords[0]]);
	drawPixelAtCoords(tileCoords);
};

const handleDrawPixels = (coords: TileCoords[]) => {
	for (const coord of coords) {
		drawPixelAtCoords(coord);
	}
};

const handleMapClick = (event: LatLng) => {
	drawPixel(event);
};

const handleMapHover = (_event: LatLng) => {
	// TODO
};

const toggleUserMenu = (event: Event) => {
	if (userMenuRef.value) {
		userMenuRef.value.toggle(event);
	}
};
</script>

<style scoped>
.app-container {
	width: 100vw;
	height: 100vh;
	overflow: hidden;
}

.map-loading {
	width: 100vw;
	height: 100vh;
	background: #f5f5f5;
}
</style>
