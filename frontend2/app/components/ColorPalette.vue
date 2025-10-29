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
            Paint {{ pixelCount.toLocaleString() }} {{ pixelCount === 1 ? "pixel" : "pixels" }}
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
            v-tooltip.top="item.name"
            :class="['color-button', {
              'color-button-selected': selectedColor === `rgba(${item.rgba.join(',')})`
            }]"
            :style="{ backgroundColor: `rgba(${item.rgba.join(',')})` }"
            :raised="selectedColor === `rgba(${item.rgba.join(',')})`"
            :disabled="!isColorUnlocked(item.index, extraColorsBitmap)"
            :aria-label="isColorUnlocked(item.index, extraColorsBitmap) ? 'Select color' : 'Color locked'"
            @click="$emit('colorSelect', `rgba(${item.rgba.join(',')})`)"
          />
        </div>

        <PaintButton
          class="palette-paint-button"
          :charges="charges"
          :max-charges="maxCharges"
          :time-until-next="timeUntilNext"
          :is-drawing="true"
          :pending-pixels="pixelCount"
          @click="$emit('submit')"
        />
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { isColorUnlocked, palette } from "../../utils/palette";
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
  extraColorsBitmap: number;
}>();

defineEmits<{
  colorSelect: [color: string];
  close: [];
  toggleEraser: [];
  submit: [];
}>();
</script>

<style scoped>
.palette-container {
  width: 100%;
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

.color-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  position: relative;
}

/* TODO: Make this nicer */
.color-button:disabled::after {
  content: "🔒";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.8));
}

.palette-paint-button {
  width: 100%;
}
</style>
