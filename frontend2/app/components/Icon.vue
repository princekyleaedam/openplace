<script setup lang="ts">
interface Props {
	name: string;
}

const props = defineProps<Props>();
const iconPath = computed(() => `/icons/${props.name}.svg`);
const svgContent = ref("");

onMounted(async () => {
	const response = await fetch(iconPath.value);
	let svg = await response.text();

	// TODO: 🤢
	svg = svg.replaceAll(/(fill|stroke)="[^"]*"/g, "$1=\"currentColor\"");
	svg = svg.replace(/<svg/, "<svg style=\"width: 1em; height: 1em; display: inline-block; vertical-align: -0.125em;\"");

	svgContent.value = svg;
});
</script>

<template>
  <span v-html="svgContent" />
</template>
