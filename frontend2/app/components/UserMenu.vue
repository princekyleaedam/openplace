<template>
  <Menu
    ref="menu"
    :model="menuItems"
    :popup="true"
  >
    <template #start>
      <div class="user-menu-header">
        <div class="flex align-items-center gap-3">
          <div class="avatar-container">
            <Avatar
              :label="user.username.charAt(0).toUpperCase()"
              :image="user.avatar || undefined"
              size="large"
              shape="circle"
              style="background-color: #4ade80"
            />
            <Badge
              :value="user.level"
              severity="secondary"
              class="level-badge"
            />
          </div>
          <div class="flex flex-column gap-1">
            <div class="flex align-items-center gap-2">
              <span class="font-bold text-lg">{{ user.username }}</span>
              <span class="rank-badge">#{{ user.id }}</span>
              <Chip
                label="👑"
                class="crown-chip"
              />
            </div>
            <div class="flex align-items-center gap-1 text-sm text-color-secondary">
              <i
                class="pi pi-palette"
                style="font-size: 0.75rem"
              />
              <span>Pixels painted: <strong>{{ user.pixelsPainted }}</strong></span>
            </div>
            <div class="flex align-items-center gap-1 text-sm text-color-secondary">
              <i
                class="pi pi-arrow-up"
                style="font-size: 0.75rem"
              />
              <span>Level {{ user.level }} ({{ user.levelProgress }}%)</span>
              <Button
                icon="pi pi-question"
                text
                rounded
                size="small"
                severity="secondary"
                aria-label="Level info"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #item="{ item }">
      <a class="flex align-items-center gap-2 p-menuitem-link">
        <i
          :class="item.icon"
          :style="{ color: item.color }"
        />
        <span>{{ item.label }}</span>
      </a>
    </template>
    <template #end>
      <div class="p-3 flex gap-2">
        <Button
          icon="pi pi-globe"
          severity="secondary"
          text
          rounded
          aria-label="Language"
        />
        <Button
          icon="pi pi-volume-up"
          severity="secondary"
          text
          rounded
          aria-label="Sound"
        />
      </div>
    </template>
  </Menu>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Menu from "primevue/menu";
import Avatar from "primevue/avatar";
import Badge from "primevue/badge";
import Button from "primevue/button";
import Chip from "primevue/chip";

defineProps<{
	isOpen: boolean;
	user: {
		username: string;
		level: number;
		levelProgress: number;
		pixelsPainted: number;
		avatar: string;
	};
}>();

const emit = defineEmits<{
	close: [];
}>();

const menu = ref();

const menuItems = ref([
	{
		label: "Log out",
		command: () => {
			// TODO
			emit("close");
		}
	}
]);

defineExpose({
	toggle: (event: Event) => {
		menu.value.toggle(event);
	}
});
</script>

<style scoped>
.p-menu {
	min-width: 300px;
}

.user-menu-header {
	padding: 1rem;
	border-bottom: 1px solid var(--p-surface-border);
}

.avatar-container {
	position: relative;
}

.level-badge {
	position: absolute;
	bottom: -5px;
	right: -5px;
	background-color: #a855f7;
}

.rank-badge {
	color: #f97316;
	font-weight: 700;
}

.crown-chip {
	background-color: #f3e8ff;
	padding: 0.125rem 0.5rem;
	font-size: 0.75rem;
}
</style>
