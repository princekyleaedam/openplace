<script setup lang="ts">
const items = ref([
	{
		label: "Dashboard",
		icon: "pi pi-home",
		route: "/admin/"
	},
	{
		label: "Reports",
		icon: "pi pi-flag",
		route: "/admin/reports"
	},
	{
		label: "User",
		icon: "pi pi-user",
		route: "/admin/user"
	},
	{
		label: "Alliance",
		icon: "pi pi-users",
		route: "/admin/alliance"
	},
	{
		label: "Moderators",
		icon: "pi pi-shield",
		route: "/admin/moderators"
	}
]);
</script>

<template>
	<div class="header-container">
		<div class="header-content">
			<Menubar :model="items">
				<template #start>
					<NuxtLink
						to="/admin/"
						class="logo-link"
					>
						<img
							src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAADqADAAQAAAABAAAADgAAAAC98Dn6AAAAlklEQVQoFWNkwA7+owkzovEZ0AXAGhwzH6Ko2z9dHsaHq4czgDL/0TXAVMNoqAFgPTCNBDWha2aCCZBKg2wk2jaY4SAns8A4z5/vhTHBtKSkMwofnQPXCFIY6SEFll++4xm6Ogw+XCNIhhgNMBMGJlRhtv/XDtoHY2Olr65zAomjJACYQnCSQzcAqgGuCYUB0wmlCSZyAMUpJtMVXyyIAAAAAElFTkSuQmCC"
							alt=""
							class="logo"
						>
						<span class="logo-text">openplace admin</span>
					</NuxtLink>
				</template>
				<template #item="{ item }">
					<NuxtLink
						v-if="item.route"
						:to="item.route"
						class="p-menubar-item-link"
					>
						<span :class="['menu-icon', item.icon]" />
						<span>{{ item.label }}</span>
					</NuxtLink>
				</template>
			</Menubar>
		</div>
	</div>
</template>

<style scoped>
.header-container {
	background-color: var(--p-surface-section);
	border-bottom: 1px solid var(--p-surface-border);
}

.header-content {
	max-width: 1320px;
	margin: 0 auto;
	padding: 0 1rem;
}

.logo-link {
	display: inline-flex;
	align-items: center;
	gap: 0.75rem;
	text-decoration: none;
	margin-right: 1rem;
}

.logo {
	width: 32px;
	height: 32px;
	image-rendering: pixelated;
}

.logo-text {
	font-weight: 700;
}

.menu-icon {
	margin-right: 0.5rem;
}
</style>
