<template>
  <div
    v-if="isOpen"
    class="palette-container"
  >
    <Card class="palette-card">
      <template #header>
        <div class="palette-header">
          <div>
            <Icon name="paint" />
            Paint pixel ({{ pixelCount }} pixels, {{ charges }} charges)
          </div>

          <div>
            <Button
              :severity="isEraserMode ? 'danger' : 'secondary'"
              size="small"
              :outlined="!isEraserMode"
              :aria-label="isEraserMode ? 'Switch to painting' : 'Switch to eraser'"
              @click="$emit('toggleEraser')"
            >
              <Icon name="eraser" />
            </Button>
            <Button
              severity="secondary"
              size="small"
              text
              aria-label="Close"
              @click="$emit('close')"
            >
              <Icon name="close" />
            </Button>
          </div>
        </div>
      </template>

      <template #content>
        <div class="color-grid">
          <Button
            v-for="item in palette"
            :key="item.index"
            :class="['color-button', {
              'color-button-selected': selectedColor === `rgba(${item.rgba.join(',')})`
            }]"
            :style="{ backgroundColor: `rgba(${item.rgba.join(',')})` }"
            aria-label="Select color"
            @click="$emit('colorSelect', `rgba(${item.rgba.join(',')})`)"
          />
        </div>

        <PaintButton
          class="palette-paint-button"
          :charges="charges"
          :max-charges="maxCharges"
          :time-until-next="timeUntilNext"
          :is-drawing="true"
        />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { palette } from "../../utils/palette";
import Card from "primevue/card";
import Button from "primevue/button";

defineProps<{
	isOpen: boolean;
	selectedColor: string;
	isEraserMode: boolean;
	charges: number;
	maxCharges: number;
	pixelCount: number;
	timeUntilNext: string;
}>();

defineEmits<{
	colorSelect: [color: string];
	close: [];
	toggleEraser: [];
}>();
</script>

<style scoped>
.palette-container {
	position: fixed;
	bottom: 0;
	left: 0;
	width: 100%;
	z-index: 1001;
}

.palette-card {
	box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

.palette-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0.75rem;
	border-bottom: 1px solid var(--p-surface-border);
}

.color-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
	gap: 0.5rem;
	margin-bottom: 1rem;
}

.color-button {
	min-width: 30px;
	aspect-ratio: 1;
	padding: 0;
	min-width: 30px;
	border: 1px solid var(--p-surface-border);
	border-radius: 6px;
}

.color-button-selected {
	border: 3px solid var(--p-primary-color);
}

.palette-paint-button {
	position: static;
	width: 100%;
	transform: none;
}
</style>
