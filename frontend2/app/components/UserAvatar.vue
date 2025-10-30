<template>
	<button
		class="avatar-button"
		@click="$emit('click', $event)"
	>
		<div style="position: relative;">
			<Avatar
				:label="user.username.charAt(0).toUpperCase()"
				:image="user.avatar || undefined"
				size="large"
				shape="circle"
				class="avatar-button-avatar"
			/>
			<Badge
				:value="user.level"
				severity="secondary"
				class="avatar-button-badge"
			/>
		</div>
	</button>
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

<style scoped>
.avatar-button {
	position: relative;
	background: transparent;
	padding: 0;
	margin: 0;
	border: 0;
}

.avatar-button-avatar {
	background-color: #4ade80;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.avatar-button-badge {
	position: absolute;
	bottom: -5px;
	right: -5px;
	background-color: #a855f7;
	color: white;
}
</style>
