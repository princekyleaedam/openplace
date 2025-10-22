<template>
  <Button
    severity="info"
    size="large"
    raised
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
