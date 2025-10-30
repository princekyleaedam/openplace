<script setup lang="ts">
import { defineAsyncComponent, shallowRef, watch } from "vue";

interface Props {
	name: string;
}

const props = defineProps<Props>();
const IconComponent = shallowRef();

const loadIcon = async (name: string) => {
	const componentName = name
		.split(/[_-]/)
		.map(part => part.charAt(0)
			.toUpperCase() + part.slice(1))
		.join("");

	try {
		const component = defineAsyncComponent(() => import(`./icons/${componentName}.vue`));
		IconComponent.value = component;
	} catch (error) {
		console.error(`Failed to load icon: ${name}`, error);
	}
};

watch(
	() => props.name,
	(name) => loadIcon(name),
	{ immediate: true }
);
</script>

<template>
	<component :is="IconComponent" />
</template>
