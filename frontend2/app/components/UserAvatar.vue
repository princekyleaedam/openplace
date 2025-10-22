<template>
  <div
    style="position: fixed; top: 20px; right: 20px; z-index: 999; cursor: pointer;"
    @click="$emit('click', $event)"
  >
    <div style="position: relative;">
      <Avatar
        :label="user.username.charAt(0).toUpperCase()"
        :image="user.avatar || undefined"
        size="large"
        shape="circle"
        style="background-color: #4ade80; border: 3px solid white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
      />
      <Badge
        :value="user.level"
        severity="secondary"
        style="position: absolute; bottom: -5px; right: -5px; background-color: #a855f7; color: white; border: 2px solid white; min-width: 1.5rem;"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Avatar from "primevue/avatar";
import Badge from "primevue/badge";

defineProps<{
	user: {
		username: string;
		level: number;
		avatar: string;
	};
}>();

defineEmits<{
	click: [event: Event];
}>();
</script>
