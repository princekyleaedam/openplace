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
import type { Map as MaplibreMap } from "maplibre-gl";
import { getPixelBounds, getPixelsBetween, getTileBounds, type LngLat, lngLatToTileCoords, TILE_SIZE, type TileCoords, ZOOM_LEVEL } from "~/utils/coordinates";

// Expose things for user scripts to access
declare global {
	interface Window {
		map: MaplibreMap;
	}
}

interface Pixel {
	id: string;
	tileCoords: TileCoords;
	color: string;
}

interface TileCanvas {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	sourceId: string;
	layerId: string;
	originalImageData: ImageData | null;
	isDirty: boolean;
}

export interface FavoriteLocation {
	id: number;
	name: string;
	latitude: number;
	longitude: number;
}

const props = defineProps<{
	pixels: Pixel[];
	isDrawing: boolean;
	isSatellite: boolean;
	favoriteLocations?: FavoriteLocation[];
	selectedPixelCoords?: TileCoords | null;
}>();

const emit = defineEmits<{
	mapClick: [event: LngLat];
	mapRightClick: [event: LngLat];
	mapHover: [event: LngLat];
	drawPixels: [coords: TileCoords[]];
	bearingChange: [bearing: number];
	favoriteClick: [favorite: FavoriteLocation];
}>();

const TILE_RELOAD_INTERVAL = 15_000;
const LOCATION_SAVE_INTERVAL = 5000;

const isDev = process.env.NODE_ENV === "development";

const mapContainer = ref<HTMLDivElement | null>(null);
let map: MaplibreMap | null = null;
// TODO: Fix type
const favoriteMarkers: unknown[] = [];

const hoverCoords = ref<TileCoords | null>(null);
const currentZoom = ref(11);
const lastDrawnCoords = ref<TileCoords | null>(null);
const isDrawingActive = ref(false);
const centerCoords = ref<TileCoords | null>(null);

let saveLocationTimeout: number | null = null;
let tileReloadInterval: number | null = null;
let lastTileRefreshTime = 0;

const tileCanvases = new Map<string, TileCanvas>();

const darkMode = matchMedia("(prefers-color-scheme: dark)");
const darkModeChanged = () => {
	map?.setStyle(mapStyle.value);
};
const mapStyle = ref(`/maps/styles/${darkMode.matches ? "fiord" : "liberty"}`);

const getTileCanvas = (tileX: number, tileY: number): TileCanvas => {
	const key = `${tileX}-${tileY}`;
	if (tileCanvases.has(key)) {
		return tileCanvases.get(key)!;
	}

	const canvas = document.createElement("canvas");
	canvas.width = TILE_SIZE;
	canvas.height = TILE_SIZE;

	const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
	ctx.imageSmoothingEnabled = false;

	const originalImageData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);

	const sourceId = `tile-canvas-${key}`;
	const layerId = `tile-canvas-layer-${key}`;

	const tileCanvas: TileCanvas = {
		canvas,
		ctx,
		sourceId,
		layerId,
		originalImageData,
		isDirty: false
	};

	tileCanvases.set(key, tileCanvas);

	if (map) {
		const bounds = getTileBounds(tileX, tileY);

		if (!map.getSource(sourceId)) {
			map.addSource(sourceId, {
				type: "canvas",
				canvas,
				coordinates: bounds,
				animate: false
			});
		}

		if (!map.getLayer(layerId)) {
			map.addLayer({
				id: layerId,
				type: "raster",
				source: sourceId,
				paint: {
					"raster-opacity": 1,
					"raster-resampling": currentZoom.value >= ZOOM_LEVEL ? "nearest" : "linear"
				}
			}, "hover-border");
		}
	}

	return tileCanvas;
};

const drawPixelOnCanvas = (coords: TileCoords, color: string) => {
	const [tileX, tileY] = coords.tile;
	const [x, y] = coords.pixel;

	const tileCanvas = getTileCanvas(tileX, tileY);
	const { ctx, sourceId } = tileCanvas;

	if (color === "rgba(0,0,0,0)") {
		// Drawing transparency - clear the pixel underneath
		ctx.clearRect(x, y, 1, 1);
	} else {
		ctx.fillStyle = color;
		ctx.fillRect(x, y, 1, 1);
	}

	tileCanvas.isDirty = true;

	// Trigger maplibre re-render of this source
	const source = map!.getSource(sourceId);
	if (source && "play" in source && typeof source.play === "function") {
		source.play();
		map!.triggerRepaint();
		setTimeout(() => {
			if ("pause" in source && typeof source.pause === "function") {
				source.pause();
			}
		}, 0);
	}
};

const cancelPaint = () => {
	for (const tileCanvas of tileCanvases.values()) {
		if (tileCanvas.originalImageData) {
			tileCanvas.ctx.putImageData(tileCanvas.originalImageData, 0, 0);
			tileCanvas.isDirty = false;

			// Trigger update
			if (map && map.getSource(tileCanvas.sourceId)) {
				const source = map.getSource(tileCanvas.sourceId);
				if (source && "play" in source && typeof source.play === "function") {
					source.play();
					map?.triggerRepaint();
					setTimeout(() => {
						if ("pause" in source && typeof source.pause === "function") {
							source.pause();
						}
					}, 0);
				}
			}
		}
	}
};

// Make changes drawn by the user permanent, after submitting paint to server
const commitCanvases = () => {
	for (const tileCanvas of tileCanvases.values()) {
		if (tileCanvas.isDirty) {
			tileCanvas.originalImageData = tileCanvas.ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
			tileCanvas.isDirty = false;
		}
	}
};

const removeAllCanvases = () => {
	for (const tileCanvas of tileCanvases.values()) {
		if (map?.getLayer(tileCanvas.layerId)) {
			map.removeLayer(tileCanvas.layerId);
		}
		if (map?.getSource(tileCanvas.sourceId)) {
			map.removeSource(tileCanvas.sourceId);
		}
	}
	tileCanvases.clear();
};

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

	// Add satellite
	if (!mapInstance.getSource("satellite")) {
		mapInstance.addSource("satellite", {
			type: "raster",
			tiles: [
				"https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}.jpeg"
			],
			tileSize: 256
		});
	}

	if (props.isSatellite) {
		if (!mapInstance.getLayer("satellite")) {
			mapInstance.addLayer({
				id: "satellite",
				type: "raster",
				source: "satellite"
			}, "building");
		}
	} else {
		if (mapInstance.getLayer("satellite")) {
			mapInstance.removeLayer("satellite");
		}
	}

	if (!mapInstance.getSource("pixel-tiles")) {
		mapInstance.addSource("pixel-tiles", {
			type: "raster",
			tiles: [],
			tileSize: TILE_SIZE,
			minzoom: ZOOM_LEVEL,
			maxzoom: ZOOM_LEVEL,
			scheme: "xyz"
		});
	}

	const zoom = savedZoom ?? mapInstance.getZoom();
	const resamplingMode = zoom >= ZOOM_LEVEL ? "nearest" : "linear";
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
			data: pixelGeoJSON.value
		});
	}

	if (!mapInstance.getSource("hover")) {
		mapInstance.addSource("hover", {
			type: "geojson",
			data: hoverGeoJSON.value
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
	type: "FeatureCollection" as const,
	features: props.pixels.map(pixel => {
		const bounds = getPixelBounds(pixel.tileCoords);
		return {
			type: "Feature" as const,
			geometry: {
				type: "Polygon" as const,
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
	const coords = props.selectedPixelCoords ?? hoverCoords.value;
	if (!coords) {
		return {
			type: "FeatureCollection" as const,
			features: []
		};
	}

	const bounds = getPixelBounds(coords);
	return {
		type: "FeatureCollection" as const,
		features: [
			{
				type: "Feature" as const,
				geometry: {
					type: "Polygon" as const,
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

const updateFavoriteMarkers = async () => {
	if (!map) {
		return;
	}

	// Dynamically import maplibre-gl
	const maplibregl = (await import("maplibre-gl")).default;

	// Remove all existing markers
	for (const marker of favoriteMarkers) {
		if (marker && typeof (marker as { remove: () => void }).remove === "function") {
			(marker as { remove: () => void }).remove();
		}
	}
	favoriteMarkers.length = 0;

	for (const favorite of props.favoriteLocations ?? []) {
		// TODO: Tidy this up
		const star = document.createElement("div");
		star.className = "favorite-marker";
		star.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="#ffb300" d="m6.128 21 1.548-6.65-5.181-4.484 6.835-.587L11.995 3l2.675 6.279 6.835.587-5.181 4.484L17.872 21l-5.877-3.533z"/></svg>`;
		star.style.cssText = "cursor: pointer;";
		star.title = "Click to visit favorite location";
		star.addEventListener("click", (e) => {
			e.stopPropagation();
			emit("favoriteClick", favorite);
		});

		const marker = new maplibregl.Marker({ element: star as HTMLElement })
			.setLngLat([favorite.longitude, favorite.latitude])
			.addTo(map);

		favoriteMarkers.push(marker);
	}
};

const refreshTiles = () => {
	if (map && map.getSource("pixel-tiles")) {
		const config = useRuntimeConfig();
		const source = map.getSource("pixel-tiles");
		// TODO: Types?
		if (source && "setTiles" in source && typeof source.setTiles === "function") {
			// Force maplibre to fetch again by using a fragment
			// source.setTiles([`${config.public.backendUrl}/files/s0/tiles/{z}/{x}/{y}.png#${Date.now()}`]);
			source.setTiles([`${config.public.backendUrl}/files/s0/tiles/{x}/{y}.png#${Date.now()}`]);
			lastTileRefreshTime = Date.now();
		}
	}
};

const startTileReloadTimer = () => {
	stopTileReloadTimer();
	tileReloadInterval = setInterval(refreshTiles, TILE_RELOAD_INTERVAL);

	if (Date.now() - lastTileRefreshTime >= TILE_RELOAD_INTERVAL) {
		refreshTiles();
	}
};

const stopTileReloadTimer = () => {
	if (tileReloadInterval) {
		clearInterval(tileReloadInterval);
		tileReloadInterval = null;
	}
};

const updateCursor = () => {
	const canvas = map!.getCanvas();
	canvas.style.cursor = props.isDrawing || map!.getZoom() >= ZOOM_LEVEL ? "crosshair" : "grab";
};

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
		// TODO: Fix type
		container: mapContainer.value as any,
		style: mapStyle.value,
		center: savedLocation ? [savedLocation.lng, savedLocation.lat] : [151.208, -33.852],
		zoom: savedLocation?.zoom ?? CLOSE_ZOOM_LEVEL,
		minZoom: 0,
		maxZoom: 22,
		doubleClickZoom: false,
		attributionControl: false
	});

	// Expose map on window
	globalThis.map = map;

	// Gestures
	let isRotating = false;
	let rotateStart: { x: number; y: number } | null = null;

	const canvas = map.getCanvas();
	canvas.addEventListener("mousedown", (e: MouseEvent) => {
		// Support rotation with right-click + shift or alt
		if (e.button === 2 && (e.shiftKey || e.altKey)) {
			isRotating = true;
			rotateStart = { x: e.clientX, y: e.clientY };
			e.preventDefault();
		}
	});

	canvas.addEventListener("mousemove", (e: MouseEvent) => {
		if (isRotating && rotateStart) {
			const dx = e.clientX - rotateStart.x;
			const bearing = map!.getBearing() - dx * 0.5;
			map!.setBearing(bearing);
			rotateStart = { x: e.clientX, y: e.clientY };
		}
	});

	canvas.addEventListener("mouseup", (e: MouseEvent) => {
		if (e.button === 2) {
			isRotating = false;
			rotateStart = null;
		}
	});

	// Disable default right-click rotation
	map.dragRotate.disable();

	map.on("load", () => {
		setUpMapLayers(map!, savedLocation?.zoom ?? CLOSE_ZOOM_LEVEL);
		updateFavoriteMarkers();
	});

	map.on("style.load", () => {
		setUpMapLayers(map!);
		updateFavoriteMarkers();
	});

	map.on("click", e => {
		emit("mapClick", [e.lngLat.lng, e.lngLat.lat]);
	});

	map.on("contextmenu", e => {
		e.preventDefault();

		// Only emit right-click event if shift is not held
		if (!e.originalEvent.shiftKey) {
			emit("mapRightClick", [e.lngLat.lng, e.lngLat.lat]);
		}
	});

	// Handle double-click to zoom to native size
	map.on("dblclick", e => {
		if (map!.getZoom() < CLOSE_ZOOM_LEVEL) {
			map!.flyTo({
				center: e.lngLat,
				zoom: CLOSE_ZOOM_LEVEL
			});
		}
	});

	map.on("mousemove", e => {
		const { lng, lat } = e.lngLat;
		const coords = lngLatToTileCoords([lng, lat]);
		hoverCoords.value = coords;

		if (props.isDrawing && isDrawingActive.value && lastDrawnCoords.value) {
			const pixelsToDraw = getPixelsBetween(lastDrawnCoords.value, coords);
			if (pixelsToDraw.length > 0) {
				emit("drawPixels", pixelsToDraw);
				lastDrawnCoords.value = coords;
			}
		}

		emit("mapHover", [lng, lat]);
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

	globalThis.addEventListener("keydown", handleKeyDown);
	globalThis.addEventListener("keyup", handleKeyUp);

	const updateCenterCoords = () => {
		if (map) {
			const { lng, lat } = map.getCenter();
			centerCoords.value = lngLatToTileCoords([lng, lat]);
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

		updateCursor();
	});

	map.on("move", () => {
		updateCenterCoords();
		scheduleSaveLocation();
	});

	map.on("rotate", () => {
		emit("bearingChange", Math.round(map!.getBearing()));
	});

	currentZoom.value = map.getZoom();
	updateCenterCoords();

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
	startTileReloadTimer();

	globalThis.addEventListener("blur", stopTileReloadTimer);
	globalThis.addEventListener("focus", startTileReloadTimer);

	darkMode.addEventListener("change", darkModeChanged);
});

watch(() => props.pixels, newPixels => {
	// Draw pixels on canvas
	for (const pixel of newPixels) {
		drawPixelOnCanvas(pixel.tileCoords, pixel.color);
	}
}, { deep: true });

watch(hoverGeoJSON, () => {
	const pixels = map?.getSource("hover");
	if (pixels && "setData" in pixels && typeof pixels.setData === "function") {
		pixels.setData(hoverGeoJSON.value);
	}
}, { deep: true });

watch(() => props.isDrawing, () => {
	updateCursor();
});

watch(() => props.isSatellite, () => {
	if (map) {
		setUpMapLayers(map);
	}
});

watch(() => props.favoriteLocations, () => {
	updateFavoriteMarkers();
}, { deep: true });

onUnmounted(() => {
	for (const marker of favoriteMarkers) {
		if (marker && typeof (marker as { remove: () => void }).remove === "function") {
			(marker as { remove: () => void }).remove();
		}
	}
	favoriteMarkers.length = 0;

	stopTileReloadTimer();
	if (saveLocationTimeout) {
		clearTimeout(saveLocationTimeout);
	}

	globalThis.removeEventListener("blur", stopTileReloadTimer);
	globalThis.removeEventListener("focus", startTileReloadTimer);

	darkMode.removeEventListener("change", darkModeChanged);
	removeAllCanvases();
});

// Reset map bearing to 0
const resetBearing = () => {
	if (map) {
		map.easeTo({ bearing: 0, duration: 300 });
	}
};

const flyToLocation = (latitude: number, longitude: number, zoom = ZOOM_LEVEL) => {
	if (map) {
		map.flyTo({
			center: [longitude, latitude],
			zoom,
			duration: 4000
		});
	}
};

const jumpToLocation = (latitude: number, longitude: number, zoom = ZOOM_LEVEL) => {
	if (map) {
		map.jumpTo({
			center: [longitude, latitude],
			zoom
		});
	}
};

const zoomIn = () => map?.zoomIn();
const zoomOut = () => map?.zoomOut();
const getZoom = () => map?.getZoom() ?? ZOOM_LEVEL;

defineExpose({
	cancelPaint,
	commitCanvases,
	drawPixelOnCanvas,
	resetBearing,
	flyToLocation,
	jumpToLocation,
	zoomIn,
	zoomOut,
	getZoom
});
</script>

<style scoped>
.map-container {
	width: 100vw;
	height: 100dvh;
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
