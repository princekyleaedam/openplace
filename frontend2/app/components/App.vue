<template>
  <div class="app-container">
    <Toast />
    <ClientOnly>
      <Map
        ref="mapRef"
        :pixels="pixels"
        :is-drawing="isPaintOpen"
        :is-satellite="isSatellite"
        :favorite-locations="userProfile?.favoriteLocations"
        @map-click="handleMapClick"
        @map-right-click="handleMapRightClick"
        @map-hover="handleMapHover"
        @draw-pixels="handleDrawPixels"
        @bearing-change="mapBearing = $event"
        @favorite-click="handleFavoriteClick"
      />
      <template #fallback>
        <div class="map-loading" />
      </template>
    </ClientOnly>

    <div class="app-overlays">
      <div class="app-overlays-zoom">
        <Button
          severity="secondary"
          raised
          rounded
          aria-label="Zoom in"
          @click="zoomIn"
        >
          <Icon name="zoom_in" />
        </Button>

        <Button
          severity="secondary"
          raised
          rounded
          aria-label="Zoom out"
          @click="zoomOut"
        >
          <Icon name="zoom_out" />
        </Button>

        <Button
          v-if="mapBearing !== 0"
          severity="secondary"
          raised
          rounded
          aria-label="Reset map rotation"
          @click="resetMapRotation"
        >
          <Icon name="compass" />
        </Button>
      </div>

      <div class="app-overlays-profile">
        <div v-if="isLoggedIn">
          <UserAvatar
            :user="user"
            @click="toggleUserMenu"
          />

          <UserMenu
            ref="userMenuRef"
            :is-open="isUserMenuOpen"
            :user="user"
            @close="isUserMenuOpen = false"
            @logout="handleLogout"
          />
        </div>

        <Button
          v-else
          severity="primary"
          raised
          rounded
          aria-label="Log in"
          @click="handleLogin"
        >
          Log in
        </Button>

        <Button
          severity="secondary"
          raised
          rounded
          aria-label="Toggle satellite"
          @click="toggleSatellite"
        >
          <Icon :name="isSatellite ? 'map_vector' : 'map_satellite'" />
        </Button>

        <Button
          severity="secondary"
          raised
          rounded
          aria-label="Go to random pixel"
          :loading="isLoadingRandom"
          @click="goToRandom"
        >
          <Icon name="explore" />
        </Button>
      </div>

      <div
        v-if="isLoggedIn"
        class="app-overlays-paint"
      >
        <PaintButton
          :charges="currentCharges ?? 0"
          :max-charges="maxCharges ?? 0"
          :is-drawing="isPaintOpen"
          :time-until-next="formattedTime"
          @click="isPaintOpen = !isPaintOpen"
        />
      </div>

      <div
        v-if="isLoggedIn"
        class="app-overlays-palette"
      >
        <ColorPalette
          :is-open="isPaintOpen"
          :selected-color="selectedColor"
          :is-eraser-mode="isEraserMode"
          :charges="currentCharges ?? 0"
          :max-charges="maxCharges ?? 0"
          :pixel-count="pixels.length"
          :time-until-next="formattedTime"
          :extra-colors-bitmap="userProfile?.extraColorsBitmap ?? null"
          @color-select="handleColorSelect"
          @close="handleClosePaint"
          @toggle-eraser="isEraserMode = !isEraserMode"
          @submit="handleSubmitPixels"
        />
      </div>
    </div>

    <PixelInfo
      :is-open="isPixelInfoOpen"
      :coords="selectedPixelCoords!"
      @close="isPixelInfoOpen = false"
      @report="handleReportPixel"
      @favorite-added="handleFavoriteChanged"
      @favorite-removed="handleFavoriteChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import Toast from "primevue/toast";
import { useToast } from "primevue/usetoast";
import Map from "~/components/Map.vue";
import PaintButton from "~/components/PaintButton.vue";
import ColorPalette from "~/components/ColorPalette.vue";
import UserAvatar from "~/components/UserAvatar.vue";
import UserMenu from "~/components/UserMenu.vue";
import PixelInfo from "~/components/PixelInfo.vue";
import { CLOSE_ZOOM_LEVEL, getPixelId, type LatLng, latLngToTileCoords, type TileCoords, tileCoordsToLatLng, ZOOM_LEVEL } from "~/utils/coordinates";
import { type UserProfile, useUserProfile } from "~/composables/useUserProfile";
import { useCharges } from "~/composables/useCharges";
import { usePaint } from "~/composables/usePaint";

interface Pixel {
	id: string;
	tileCoords: TileCoords;
	color: string;
}

const isPaintOpen = ref(false);
const isSatellite = ref(false);
const isUserMenuOpen = ref(false);
const isPixelInfoOpen = ref(false);
const selectedColor = ref("rgba(0,0,0,1)");
const isEraserMode = ref(false);
const pixels = ref<Pixel[]>([]);
const selectedPixelCoords = ref<TileCoords | null>(null);
const userProfile = ref<UserProfile | null>(null);
const isLoading = ref(true);
const userMenuRef = ref();
const mapRef = ref();
const mapBearing = ref(0);
const isLoadingRandom = ref(false);
const isAnimatingToRandom = ref(false);
const randomTargetCoords = ref<{ lat: number; lng: number; zoom: number } | null>(null);

const toast = useToast();

const {
	currentCharges,
	maxCharges,
	formattedTime,
	decrementCharge,
	incrementCharge,
	initialize
} = useCharges();

const isLoggedIn = computed(() => userProfile.value !== null);

const user = computed<UserProfile | null>(() => {
	const value = userProfile.value;
	if (!value) {
		return null;
	}

	const levelProgress = Math.round((value.level - Math.floor(value.level)) * 100);

	return {
		...value,
		username: value.name,
		level: Math.floor(value.level),
		levelProgress,
		pixelsPainted: Math.floor(value.pixelsPainted),
		avatar: value.picture
	};
});

const { fetchUserProfile, logout, login } = useUserProfile();
const { submitPixels } = usePaint();

const handlePopState = () => {
	// Handle browser back/forward navigation
	const urlParams = new URLSearchParams(globalThis.location.search);
	const lat = urlParams.get("lat");
	const lng = urlParams.get("lng");
	const zoom = urlParams.get("zoom");

	if (lat && lng && mapRef.value) {
		const latitude = Number.parseFloat(lat);
		const longitude = Number.parseFloat(lng);
		const zoomLevel = zoom ? Number.parseFloat(zoom) : 15;

		if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
			// Fly with animation on back/forward navigation
			mapRef.value.flyToLocation(latitude, longitude, zoomLevel);
		}
	}
};

onMounted(async () => {
	try {
		userProfile.value = await fetchUserProfile();
		if (userProfile.value) {
			initialize(
				userProfile.value.charges.count,
				userProfile.value.charges.max,
				userProfile.value.charges.cooldownMs
			);
		}
	} catch (error) {
		console.error("Failed to fetch user profile:", error);
	}

	isLoading.value = false;

	// Jump to url params
	const params = new URLSearchParams(globalThis.location.search);
	const latStr = params.get("lat");
	const lngStr = params.get("lng");
	const zoomStr = params.get("zoom");

	if (latStr && lngStr && mapRef.value) {
		const [lat, lng] = [Number.parseFloat(latStr), Number.parseFloat(lngStr)];
		const zoom = Number.parseFloat(zoomStr || "") || 15;

		if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
			mapRef.value.jumpToLocation(lat, lng, zoom);
		}
	}

	globalThis.addEventListener("popstate", handlePopState);
	document.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
	globalThis.removeEventListener("popstate", handlePopState);
	document.removeEventListener("keydown", handleKeyDown);
});

const clearPendingPixels = () => {
	const pixelCount = pixels.value.length;
	pixels.value = [];
	for (let i = 0; i < pixelCount; i++) {
		incrementCharge();
	}

	mapRef.value?.cancelPaint();
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
		// Toggle eraser
		isEraserMode.value = !isEraserMode.value;
	}
};

const drawPixelAtCoords = (tileCoords: TileCoords) => {
	if (!isPaintOpen.value || !currentCharges.value || currentCharges.value <= 0) {
		return;
	}

	const pixelId = getPixelId(tileCoords);
	const existingPixelIndex = pixels.value.findIndex(item => item.id === pixelId);

	if (isEraserMode.value) {
		if (existingPixelIndex !== -1) {
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

		if (existingPixelIndex === -1) {
			pixels.value.push(newPixel);
			decrementCharge();
		} else {
			pixels.value[existingPixelIndex] = newPixel;
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

let lastClickTime = 0;
const DOUBLE_CLICK_THRESHOLD = 300;

const handleMapClick = (event: LatLng) => {
	if (isPaintOpen.value) {
		drawPixel(event);
	} else {
		// Figure out if this is a double click
		const now = Date.now();
		lastClickTime = now;

		if (now - lastClickTime < DOUBLE_CLICK_THRESHOLD && isPixelInfoOpen.value) {
			// Double-click to zoom - dismiss pixel info
			isPixelInfoOpen.value = false;
			return;
		}

		if (mapRef.value?.getZoom() < ZOOM_LEVEL) {
			toast.add({
				severity: "info",
				summary: "Zoom in to view pixels",
				life: 3000
			});
			return;
		}

		// Show pixel info
		const tileCoords = latLngToTileCoords([event[1], event[0]]);
		selectedPixelCoords.value = tileCoords;
		isPixelInfoOpen.value = true;

		if (mapRef.value) {
			const currentZoom = mapRef.value.getZoom();
			const [lng, lat] = event;
			const url = new URL(globalThis.location.href);
			url.searchParams.set("lat", lat.toFixed(6));
			url.searchParams.set("lng", lng.toFixed(6));
			url.searchParams.set("zoom", currentZoom.toFixed(2));
			globalThis.history.pushState({}, "", url);
		}
	}
};

const handleMapRightClick = (event: LatLng) => {
	if (!isPaintOpen.value) {
		return;
	}

	// Right-click in paint mode to erase
	const tileCoords = latLngToTileCoords([event[1], event[0]]);
	const pixelId = getPixelId(tileCoords);
	const existingPixelIndex = pixels.value.findIndex(item => item.id === pixelId);

	if (existingPixelIndex !== -1) {
		pixels.value = pixels.value.filter((_, index) => index !== existingPixelIndex);
		incrementCharge();
		mapRef.value?.drawPixelOnCanvas(tileCoords, "rgba(0,0,0,0)");
	}
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

const resetMapRotation = () => {
	if (mapRef.value) {
		mapRef.value.resetBearing();
	}
};

const handleSubmitPixels = async () => {
	if (pixels.value.length === 0) {
		return;
	}

	try {
		// TODO: Tidy up
		const paintPixels = pixels.value.map(p => ({
			tileCoords: p.tileCoords,
			color: p.color
		}));
		const results = await submitPixels(paintPixels);

		// Commit the painted pixels to our local canvas
		mapRef.value?.commitCanvases();

		// Reset state
		pixels.value = [];
		isPaintOpen.value = false;
	} catch (error: unknown) {
		console.error("Failed to submit pixels:", error);
		const message = error instanceof Error ? error.message : String(error);
	}
};

const handleLogin = () => {
	login();
};

const handleLogout = async () => {
	await logout();
	location.reload();
};

const handleReportPixel = () => {
	// TODO
};

const handleFavoriteChanged = async () => {
	// TODO
	try {
		userProfile.value = await fetchUserProfile();
	} catch (error: unknown) {
		console.error("Failed to refresh user profile:", error);
	}
};

const handleFavoriteClick = (favorite: { id: number; name: string; latitude: number; longitude: number }) => {
	const zoom = Math.max(mapRef.value.getZoom(), CLOSE_ZOOM_LEVEL);
	mapRef.value.flyToLocation(favorite.latitude, favorite.longitude, zoom);

	// Open pixel info
	const tileCoords = latLngToTileCoords([favorite.latitude, favorite.longitude]);
	selectedPixelCoords.value = tileCoords;
	isPixelInfoOpen.value = true;

	// TODO: Make shared function for this
	const url = new URL(globalThis.location.href);
	url.searchParams.set("lat", favorite.latitude.toFixed(6));
	url.searchParams.set("lng", favorite.longitude.toFixed(6));
	url.searchParams.set("zoom", zoom.toFixed(2));
	globalThis.history.pushState({}, "", url);
};

const zoomIn = () => mapRef.value?.zoomIn();
const zoomOut = () => mapRef.value?.zoomOut();

const goToRandom = async () => {
	// If already animating, jump instantly to the target
	if (isAnimatingToRandom.value && randomTargetCoords.value) {
		mapRef.value.jumpToLocation(
			randomTargetCoords.value.lat,
			randomTargetCoords.value.lng,
			randomTargetCoords.value.zoom
		);

		isAnimatingToRandom.value = false;
		randomTargetCoords.value = null;
		return;
	}

	isLoadingRandom.value = true;

	const config = useRuntimeConfig();
	const response = await fetch(`${config.public.backendUrl}/s0/tile/random`, {
		credentials: "include"
	});

	const data = await response.json() as {
		pixel: { x: number; y: number };
		tile: { x: number; y: number };
	};
	const tileCoords: TileCoords = {
		tile: [data.tile.x, data.tile.y],
		pixel: [data.pixel.x, data.pixel.y]
	};
	const [lat, lng] = tileCoordsToLatLng(tileCoords);

	randomTargetCoords.value = { lat, lng, zoom: CLOSE_ZOOM_LEVEL };
	isAnimatingToRandom.value = true;
	mapRef.value?.flyToLocation(lat, lng, CLOSE_ZOOM_LEVEL);

	// To support skipping the animation by clicking the button again
	setTimeout(() => {
		isAnimatingToRandom.value = false;
		randomTargetCoords.value = null;
	}, 4000);

	isLoadingRandom.value = false;
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
		". . right"
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

.app-overlays-zoom {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 0.75rem;
	grid-area: top-left;
	padding: 1rem;
}

.app-overlays-random {
	display: flex;
	flex-direction: column;
	align-self: center;
	justify-self: end;
	gap: 0.75rem;
	grid-area: right;
	padding: 1rem;
}

.app-overlays-profile {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	justify-content: flex-end;
	align-self: end;
	justify-self: end;
	gap: 0.75rem;
	grid-area: top-right;
	padding: 1rem;
}

.app-overlays-paint {
	grid-area: paint;
	align-self: end;
	justify-self: center;
	position: relative;
	z-index: 11;
	padding-bottom: 1rem;
}

.app-overlays-palette {
	grid-area: paint;
	align-self: end;
	justify-self: stretch;
	position: relative;
	z-index: 12;
}
</style>
