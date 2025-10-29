<template>
  <div
    v-if="isOpen"
    class="pixel-info-container"
  >
    <Card class="pixel-info-card">
      <template #header>
        <div class="pixel-info-header">
          <h3>Pixel Info</h3>
          <Button
            text
            rounded
            size="small"
            severity="secondary"
            aria-label="Close"
            @click="$emit('close')"
          >
            <Icon name="close" />
          </Button>
        </div>
      </template>

      <template #content>
        <div
          v-if="loading"
          class="pixel-info-loading"
        >
          <ProgressSpinner />
        </div>

        <div
          v-else-if="pixelData"
          class="pixel-info-content"
        >
          <div class="pixel-info-section">
            <h4>Location</h4>
            <div class="pixel-info-row">
              <span class="pixel-info-label">Tile:</span>
              <span>{{ coords.tile[0] }}, {{ coords.tile[1] }}</span>
            </div>
            <div class="pixel-info-row">
              <span class="pixel-info-label">Pixel:</span>
              <span>{{ coords.pixel[0] }}, {{ coords.pixel[1] }}</span>
            </div>
            <div class="pixel-info-row">
              <span class="pixel-info-label">Region:</span>
              <span>{{ pixelData.region.name }}</span>
            </div>
          </div>

          <div
            v-if="pixelData.paintedBy.id !== 0"
            class="pixel-info-section"
          >
            <h4>Painted By</h4>
            <div class="pixel-info-row">
              <span class="pixel-info-label">User:</span>
              <span>{{ pixelData.paintedBy.name }}#{{ pixelData.paintedBy.id }}</span>
							<span
								v-if="pixelData.paintedBy.verified"
								v-tooltip.top="'This player has been verified by an administrator of this instance.'">
								<Icon name="verified" />
							</span>
            </div>
            <div
              v-if="pixelData.paintedBy.discord"
              class="pixel-info-row"
            >
              <span class="pixel-info-label">Discord:</span>
              <span>{{ pixelData.paintedBy.discord }}</span>
            </div>
            <div
              v-if="pixelData.paintedBy.allianceName"
              class="pixel-info-row"
            >
              <span class="pixel-info-label">Alliance:</span>
              <span>{{ pixelData.paintedBy.allianceName }}</span>
            </div>
          </div>

          <div
            v-else
            class="pixel-info-section"
          >
            <p class="pixel-info-empty">
              This pixel has not been painted yet.
            </p>
          </div>

          <div class="pixel-info-actions">
            <Button
              :severity="isFavorite ? 'danger' : 'secondary'"
              :outlined="!isFavorite"
              @click="toggleFavorite"
            >
              <Icon :name="isFavorite ? 'favorite_off' : 'favorite_on'" />
              {{ isFavorite ? 'Unfavorite' : 'Favorite' }}
            </Button>
            <Button
              severity="danger"
              outlined
              @click="$emit('report')"
            >
              <Icon name="report" />
              Report
            </Button>
          </div>
        </div>

        <div
          v-else-if="error"
          class="pixel-info-error"
        >
          <p>Failed to load pixel information</p>
          <p class="error-message">
            {{ error }}
          </p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Card from "primevue/card";
import Button from "primevue/button";
import ProgressSpinner from "primevue/progressspinner";
import type { TileCoords } from "~/utils/coordinates";
import { tileCoordsToLatLng } from "~/utils/coordinates";
import { useFavorites } from "~/composables/useFavorites";
import { useUserProfile } from "~/composables/useUserProfile";

interface PixelData {
	paintedBy: {
		id: number;
		name: string;
		allianceId: number;
		allianceName: string;
		equippedFlag: number;
		discord?: string;
	};
	region: {
		id: number;
		cityId: number;
		name: string;
		number: number;
		countryId: number;
	};
}

const props = defineProps<{
	isOpen: boolean;
	coords: TileCoords;
}>();

const emit = defineEmits<{
	close: [];
	report: [];
	favoriteAdded: [];
	favoriteRemoved: [];
}>();

const pixelData = ref<PixelData | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const favoriteId = ref<number | null>(null);

const { addFavorite, removeFavorite } = useFavorites();
const { fetchUserProfile } = useUserProfile();

const isFavorite = computed(() => favoriteId.value !== null);

const checkIfFavorite = async () => {
	try {
		const userProfile = await fetchUserProfile();
		if (!userProfile) {
			favoriteId.value = null;
			return;
		}

		const [lat, lng] = tileCoordsToLatLng(props.coords);

		// Is this a favorite?
		const tolerance = 0.0001;
		const favorite = userProfile.favoriteLocations.find(
			item => Math.abs(item.latitude - lat) < tolerance && Math.abs(item.longitude - lng) < tolerance
		);

		favoriteId.value = favorite ? favorite.id : null;
	} catch (error: unknown) {
		console.error("Failed to check favorite status:", error);
		favoriteId.value = null;
	}
};

const fetchPixelData = async () => {
	const [tileX, tileY] = props.coords.tile;
	const [x, y] = props.coords.pixel;

	loading.value = true;
	error.value = null;

	try {
		const config = useRuntimeConfig();
		const response = await fetch(`${config.public.backendUrl}/s0/pixel/${tileX}/${tileY}?x=${x}&y=${y}`, { credentials: "include" });

		if (!response.ok) {
			throw new Error(`Failed to fetch pixel data: ${response.statusText}`);
		}

		pixelData.value = await response.json();

		// Check if this pixel is favorited
		await checkIfFavorite();
	} catch (error_: any) {
		error.value = error_?.toString();
		console.error("Failed to fetch pixel data:", error_);
	} finally {
		loading.value = false;
	}
};

const toggleFavorite = async () => {
	try {
		const [lat, lng] = tileCoordsToLatLng(props.coords);

		if (isFavorite.value && favoriteId.value !== null) {
			await removeFavorite(favoriteId.value);
			favoriteId.value = null;
			emit("favoriteRemoved");
		} else {
			const result = await addFavorite(lat, lng);
			favoriteId.value = result.id;
			emit("favoriteAdded");
		}
	} catch (error_: any) {
		console.error("Failed to toggle favorite:", error_?.toString());
	}
};

watch(() => props.isOpen, (newValue) => {
	if (newValue) {
		fetchPixelData();
	} else {
		pixelData.value = null;
		error.value = null;
	}
});

watch(() => props.coords, () => {
	if (props.isOpen) {
		fetchPixelData();
	}
}, { deep: true });
</script>

<style scoped>
.pixel-info-container {
	position: fixed;
	bottom: 1rem;
	left: 50%;
	transform: translateX(-50%);
	z-index: 1000;
	max-width: 500px;
	width: calc(100vw - 2rem);
}

.pixel-info-card {
	box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

.pixel-info-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 1rem;
	border-bottom: 1px solid var(--p-surface-border);
}

.pixel-info-header h3 {
	margin: 0;
	font-size: 1.25rem;
	font-weight: 600;
}

.pixel-info-loading {
	display: flex;
	justify-content: center;
	padding: 2rem;
}

.pixel-info-content {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.pixel-info-section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.pixel-info-section h4 {
	margin: 0;
	font-size: 1rem;
	font-weight: 600;
	color: var(--p-text-color);
}

.pixel-info-row {
	display: flex;
	gap: 0.5rem;
	font-size: 0.875rem;
}

.pixel-info-label {
	font-weight: 600;
	min-width: 80px;
	color: var(--p-text-muted-color);
}

.pixel-info-empty {
	color: var(--p-text-muted-color);
	font-style: italic;
	margin: 0;
}

.pixel-info-error {
	padding: 1rem;
	text-align: center;
	color: var(--p-red-500);
}

.error-message {
	font-size: 0.875rem;
	margin-top: 0.5rem;
	opacity: 0.8;
}

.pixel-info-actions {
	display: flex;
	gap: 0.5rem;
	margin-top: 0.5rem;
}

.pixel-info-actions button {
	flex: 1;
}
</style>
