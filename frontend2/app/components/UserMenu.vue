<template>
  <Menu
    ref="menu"
    :model="menuItems"
    :popup="true"
  >
    <template #start>
      <div class="user-menu-header">
        <div class="user-info">
          <div class="avatar-container">
            <Avatar
              :label="user.username.charAt(0).toUpperCase()"
              :image="user.avatar"
              size="large"
              shape="circle"
              style="background-color: #4ade80;"
            />
            <Badge
              :value="user.level"
              severity="secondary"
              class="level-badge"
            />
          </div>
          <div class="user-details">
            <div class="user-name-row">
              <span class="user-name">{{ user.username }}</span>
              <span class="user-id">#{{ user.id }}</span>
              <span
                v-if="countryFlag"
                class="country-flag"
              >{{ countryFlag }}</span>
            </div>
            <div class="user-stat">
              <span>Pixels painted: {{ user.pixelsPainted }}</span>
            </div>
            <div class="user-stat">
              <span>Level {{ user.level }} ({{ user.levelProgress }}%)</span>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #item="{ item }">
      <a
        class="menu-item-link"
        @click="(event) => item.command?.({ originalEvent: event, item })"
      >
        <Icon
          v-if="item.icon"
          :name="item.icon"
        />
        <span>{{ item.label }}</span>
      </a>
    </template>
  </Menu>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Menu from "primevue/menu";
import Avatar from "primevue/avatar";
import Badge from "primevue/badge";
import { COUNTRIES } from "../../../src/utils/country";

const props = defineProps<{
	isOpen: boolean;
	user: {
		username: string;
		id: number;
		level: number;
		levelProgress: number;
		pixelsPainted: number;
		avatar: string;
		equippedFlag: number;
	};
}>();

const countryFlag = computed(() => {
	if (!props.user.equippedFlag) {
		return null;
	}
	const country = COUNTRIES.find(item => item.id === props.user.equippedFlag);
	return country?.flag ?? null;
});

const emit = defineEmits<{
	close: [];
	logout: [];
}>();

const menu = ref();

const menuItems = ref([
	{
		label: "Log out",
		command: () => {
			emit("logout");
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
.user-menu-header {
	padding: 1rem;
	border-bottom: 1px solid var(--p-surface-border);
}

.user-info {
	display: flex;
	align-items: center;
	gap: 0.75rem;
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

.user-details {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	flex: 1;
}

.user-name-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.user-name {
	font-weight: 600;
	font-size: 1.125rem;
}

.user-id {
	font-size: 0.9rem;
}

.user-stat {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	font-size: 0.875rem;
	color: var(--p-text-muted-color);
}

.user-stat i {
	font-size: 0.75rem;
}

.menu-item-link {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	cursor: pointer;
	text-decoration: none;
	color: inherit;
}

.menu-item-link:hover {
	background-color: var(--p-menuitem-hover-background);
}

.country-flag {
	font-size: 1.25rem;
}
</style>
