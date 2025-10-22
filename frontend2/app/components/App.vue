<template>
  <div class="app-container">
    <ClientOnly>
      <Map
        :pixels="pixels"
        :is-drawing="isPaintOpen"
        :is-satellite="isSatellite"
        @map-click="handleMapClick"
        @map-hover="handleMapHover"
        @draw-pixels="handleDrawPixels"
      />
      <template #fallback>
        <div class="map-loading" />
      </template>
    </ClientOnly>

    <div class="app-overlays">
      <div class="app-overlays-profile">
        <div>
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
        </div>

        <Button
          severity="secondary"
          raised
          rounded
          aria-label="Toggle satellite"
          @click="toggleSatellite"
        >
          <Icon :name="isSatellite ? 'map_vector' : 'map_satellite'" />
        </Button>
      </div>

      <div class="app-overlays-paint">
        <PaintButton
          :charges="currentCharges"
          :max-charges="maxCharges"
          :is-drawing="isPaintOpen"
          :time-until-next="formattedTime"
          @click="isPaintOpen = !isPaintOpen"
        />
      </div>

      <div class="app-overlays-palette">
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
    </div>
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
const isSatellite = ref(false);
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
			id: 0,
			level: 0,
			levelProgress: 0,
			pixelsPainted: 0,
			avatar: ""
		};
	}

	return {
		username: value.name,
		id: value.id,
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

const toggleSatellite = () => {
	isSatellite.value = !isSatellite.value;
};
</script>

<style scoped>
.app-container {
	width: 100vw;
	height: 100vh;
	overflow: hidden;
	user-select: none;
}

.map-loading {
	width: 100vw;
	height: 100vh;
}

.app-overlays {
	display: grid;
	grid-template-areas:
		"top-left . top-right"
		". . ."
		"paint paint paint";
	grid-template-rows: auto 1fr auto;
	grid-template-columns: auto 1fr auto;
	position: absolute;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	z-index: 10;
	pointer-events: none;
}

.app-overlays > * {
	pointer-events: auto;
}

.app-overlays-profile {
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	align-self: end;
	justify-self: end;
	gap: var(--p-card-body-padding);
	grid-area: top-right;
	margin: var(--p-card-body-padding);
}

.app-overlays-paint {
	grid-area: paint;
	align-self: end;
	justify-self: center;
	position: relative;
	z-index: 11;
	margin-bottom: var(--p-card-body-padding);
}

.app-overlays-palette {
	grid-area: paint;
	align-self: end;
	justify-self: stretch;
	position: relative;
	z-index: 12;
}
</style>
