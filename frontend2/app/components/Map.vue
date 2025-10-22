<template>
  <div class="map-container">
    <div
      ref="mapContainer"
      class="map"
    />
    <div
      v-if="isDev"
      class="debug-label"
    >
      <div>Zoom: {{ currentZoom.toFixed(2) }}</div>
      <div v-if="centerCoords">
        Center: Tx {{ centerCoords.tile[0] }},{{ centerCoords.tile[1] }} Px {{ centerCoords.pixel[0] }},{{ centerCoords.pixel[1] }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { GeoJSONSource, Map as MaplibreMap } from "maplibre-gl";
import type { TileCoords } from "~/utils/coordinates";
import { getPixelBounds, getPixelsBetween, type LatLng, latLngToTileCoords, ZOOM_LEVEL } from "~/utils/coordinates";

interface Pixel {
	id: string;
	tileCoords: TileCoords;
	color: string;
}

const props = defineProps<{
	pixels: Pixel[];
	isDrawing: boolean;
}>();

const emit = defineEmits<{
	mapClick: [event: LatLng];
	mapHover: [event: LatLng];
	drawPixels: [coords: TileCoords[]];
}>();

const TILE_RELOAD_INTERVAL = 15_000;
const LOCATION_SAVE_INTERVAL = 5000;

const isDev = process.env.NODE_ENV === "development";

const mapContainer = ref<HTMLDivElement | null>(null);
let map: MaplibreMap | null = null;

const hoverCoords = ref<TileCoords | null>(null);
const currentZoom = ref(11);
const lastDrawnCoords = ref<TileCoords | null>(null);
const isDrawingActive = ref(false);
const centerCoords = ref<TileCoords | null>(null);

let saveLocationTimeout: NodeJS.Timeout | null = null;
let tileReloadInterval: NodeJS.Timeout | null = null;

const darkMode = matchMedia("(prefers-color-scheme: dark)");
const darkModeChanged = () => {
	map!.setStyle(mapStyle.value);
};
const mapStyle = ref(`/maps/styles/${darkMode.matches ? "fiord" : "liberty"}`);

const setUpMapLayers = (mapInstance: MaplibreMap, savedZoom?: number) => {
	// Hide unwanted layers
	const hideLayers = /^poi_|^landuse|^building(-3d)?$/;
	for (const layer of mapInstance.getStyle().layers) {
		if (hideLayers.test(layer.id)) {
			mapInstance.setLayoutProperty(layer.id, "visibility", "none");
		}
	}

	mapInstance.setFilter("water", [
		"all",
		["!=", "brunnel", "tunnel"],
		["!=", "class", "swimming_pool"]
	]);

	if (!mapInstance.getSource("pixel-tiles")) {
		mapInstance.addSource("pixel-tiles", {
			type: "raster",
			// tiles: ["/api/files/s0/tiles/{z}/{x}/{y}.png"],
			tiles: ["/api/files/s0/tiles/{x}/{y}.png"],
			tileSize: 512,
			minzoom: 11,
			maxzoom: 11,
			scheme: "xyz"
		});
	}

	const zoom = savedZoom ?? mapInstance.getZoom();
	const resamplingMode = zoom >= 11 ? "nearest" : "linear";
	if (!mapInstance.getLayer("pixel-tiles-layer")) {
		mapInstance.addLayer({
			id: "pixel-tiles-layer",
			type: "raster",
			source: "pixel-tiles",
			paint: {
				"raster-opacity": 1,
				"raster-resampling": resamplingMode
			}
		});
	}

	if (!mapInstance.getSource("pixels")) {
		mapInstance.addSource("pixels", {
			type: "geojson",
			data: pixelGeoJSON.value as any
		});
	}

	if (!mapInstance.getLayer("pixel-squares")) {
		mapInstance.addLayer({
			id: "pixel-squares",
			type: "fill",
			source: "pixels",
			paint: {
				"fill-color": ["get", "color"],
				"fill-opacity": 1
			}
		});
	}

	if (!mapInstance.getLayer("pixel-borders")) {
		mapInstance.addLayer({
			id: "pixel-borders",
			type: "line",
			source: "pixels",
			paint: {
				"line-color": "#fff",
				"line-width": 3,
				"line-opacity": 0.3
			}
		});
	}

	if (!mapInstance.getSource("hover")) {
		mapInstance.addSource("hover", {
			type: "geojson",
			data: hoverGeoJSON.value as any
		});
	}

	if (!mapInstance.getLayer("hover-border")) {
		mapInstance.addLayer({
			id: "hover-border",
			type: "line",
			source: "hover",
			paint: {
				"line-color": "#fff",
				"line-width": 4,
				"line-opacity": 0.5
			}
		});
	}
};

const pixelGeoJSON = computed(() => ({
	type: "FeatureCollection",
	features: props.pixels.map(pixel => {
		const bounds = getPixelBounds(pixel.tileCoords);
		return {
			type: "Feature",
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						bounds.topLeft,
						bounds.topRight,
						bounds.bottomRight,
						bounds.bottomLeft,
						bounds.topLeft
					]
				]
			},
			properties: {
				id: pixel.id,
				color: pixel.color
			}
		};
	})
}));

const hoverGeoJSON = computed(() => {
	if (!hoverCoords.value) {
		return {
			type: "FeatureCollection",
			features: []
		};
	}

	const bounds = getPixelBounds(hoverCoords.value);
	return {
		type: "FeatureCollection",
		features: [
			{
				type: "Feature",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							bounds.topLeft,
							bounds.topRight,
							bounds.bottomRight,
							bounds.bottomLeft,
							bounds.topLeft
						]
					]
				},
				properties: {}
			}
		]
	};
});

onMounted(async () => {
	if (!mapContainer.value) {
		return;
	}

	// Dynamically import maplibre-gl as it can’t be SSR rendered
	const maplibregl = (await import("maplibre-gl")).default;

	let savedLocation = null;
	try {
		const locationStr = localStorage["location"];
		if (locationStr) {
			savedLocation = JSON.parse(locationStr);
		}
	} catch {
		// Ignore
	}

	map = new maplibregl.Map({
		container: mapContainer.value,
		style: mapStyle.value,
		center: savedLocation ? [savedLocation.lng, savedLocation.lat] : [135.4135, -30.5088],
		zoom: savedLocation?.zoom ?? 11,
		minZoom: 0,
		maxZoom: 22,
		doubleClickZoom: false
	});

	map.on("load", () => {
		setUpMapLayers(map!, savedLocation?.zoom ?? 11);
	});

	map.on("style.load", () => {
		setUpMapLayers(map!);
	});

	map.on("click", (e) => {
		emit("mapClick", [e.lngLat.lng, e.lngLat.lat]);
	});

	// Handle double-click to zoom to native size
	map.on("dblclick", (e) => {
		if (map!.getZoom() < ZOOM_LEVEL) {
			map!.flyTo({
				center: e.lngLat,
				zoom: ZOOM_LEVEL
			});
		}
	});

	map.on("mousemove", (e) => {
		if (props.isDrawing) {
			const coords = latLngToTileCoords([e.lngLat.lat, e.lngLat.lng]);
			hoverCoords.value = coords;

			// Spacebar held down
			if (isDrawingActive.value && lastDrawnCoords.value) {
				const pixelsToDraw = getPixelsBetween(lastDrawnCoords.value, coords);
				if (pixelsToDraw.length > 0) {
					emit("drawPixels", pixelsToDraw);
					lastDrawnCoords.value = coords;
				}
			}
		} else {
			hoverCoords.value = null;
		}

		emit("mapHover", [e.lngLat.lng, e.lngLat.lat]);
	});

	const handleKeyDown = (e: KeyboardEvent) => {
		// Lock drawing mode when spacebar held down
		if (e.code === "Space" && !e.repeat && props.isDrawing) {
			e.preventDefault();
			isDrawingActive.value = true;

			if (hoverCoords.value) {
				lastDrawnCoords.value = hoverCoords.value;
				emit("drawPixels", [hoverCoords.value]);
			}
		}
	};

	const handleKeyUp = (e: KeyboardEvent) => {
		if (e.code === "Space") {
			e.preventDefault();
			isDrawingActive.value = false;
			lastDrawnCoords.value = null;
		}
	};

	window.addEventListener("keydown", handleKeyDown);
	window.addEventListener("keyup", handleKeyUp);

	const updateCenterCoords = () => {
		if (map) {
			const center = map.getCenter();
			centerCoords.value = latLngToTileCoords([center.lat, center.lng]);
		}
	};

	const saveLocation = () => {
		if (map) {
			try {
				localStorage["location"] = JSON.stringify({
					...map.getCenter(),
					zoom: map.getZoom()
				});
			} catch {
				// Ignore?
			}
		}
	};

	const scheduleSaveLocation = () => {
		if (saveLocationTimeout) {
			clearTimeout(saveLocationTimeout);
		}
		saveLocationTimeout = setTimeout(saveLocation, LOCATION_SAVE_INTERVAL);
	};

	map.on("zoom", () => {
		currentZoom.value = map!.getZoom();

		// Switch to nearest neighbor when above native zoom level
		if (map!.getLayer("pixel-tiles-layer")) {
			const resamplingMode = currentZoom.value >= ZOOM_LEVEL ? "nearest" : "linear";
			map!.setPaintProperty("pixel-tiles-layer", "raster-resampling", resamplingMode);
		}
	});

	map.on("move", () => {
		updateCenterCoords();
		scheduleSaveLocation();
	});

	currentZoom.value = map.getZoom();
	updateCenterCoords();

	const updateCursor = () => {
		const canvas = map!.getCanvas();
		canvas.style.cursor = props.isDrawing ? "crosshair" : "grab";
	};

	map.on("mousedown", () => {
		if (!props.isDrawing) {
			const canvas = map!.getCanvas();
			canvas.style.cursor = "grabbing";
		}
	});

	map.on("mouseup", () => {
		updateCursor();
	});

	updateCursor();

	// Reload tiles every 15 seconds
	tileReloadInterval = setInterval(() => {
		if (map && map.getSource("pixel-tiles")) {
			const source = map.getSource("pixel-tiles");
			if (source && "reload" in source && typeof source.reload === "function") {
				source.reload();
			}
		}
	}, TILE_RELOAD_INTERVAL);

	darkMode.addEventListener("change", darkModeChanged);
});

watch(() => props.pixels, () => {
	const pixels = map?.getSource("pixels") as GeoJSONSource;
	if (pixels) {
		// TODO: Don’t use as any!
		pixels.setData(pixelGeoJSON.value as any);
	}
}, { deep: true });

watch(hoverGeoJSON, () => {
	const pixels = map?.getSource("hover") as GeoJSONSource;
	if (pixels) {
		// TODO: Don’t use as any!
		pixels.setData(hoverGeoJSON.value as any);
	}
}, { deep: true });

watch(() => props.isDrawing, () => {
	const canvas = map!.getCanvas();

	// Drawing mode cursor
	canvas.style.cursor = props.isDrawing ? "crosshair" : "grab";
});

onUnmounted(() => {
	if (tileReloadInterval) {
		clearInterval(tileReloadInterval);
	}
	if (saveLocationTimeout) {
		clearTimeout(saveLocationTimeout);
	}
	darkMode.removeEventListener("change", darkModeChanged);
});
</script>

<style scoped>
.map-container {
	width: 100vw;
	height: 100vh;
	position: relative;
}

.map {
	width: 100%;
	height: 100%;
}

.debug-label {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 1000;
	padding: 6px 8px;
	border-bottom-right-radius: 8px;
	background: rgba(0, 0, 0, 0.7);
	color: white;
	font-family: ui-monospace, monospace;
	font-size: 12px;
	line-height: 1.5;
	pointer-events: none;
}
</style>
