<template>
  <Button
    severity="info"
    size="large"
    rounded
    class="paint-button"
    @click="$emit('click')"
  >
    <Icon name="paint" />
    Paint {{ charges.toLocaleString() }}/{{ maxCharges.toLocaleString() }} ({{ timeUntilNext }})
  </Button>
</template>

<script setup lang="ts">
import Button from "primevue/button";

defineProps<{
	charges: number;
	maxCharges: number;
	isDrawing: boolean;
	timeUntilNext: string;
}>();

defineEmits<{
	click: [];
}>();
</script>

<style scoped>
.paint-button {
	position: fixed;
	bottom: 20px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 1000;
	padding: 0.75rem 1.5rem;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
