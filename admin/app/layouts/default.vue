<script setup lang="ts">
    import '~/assets/common.scss';
</script>

<template>
    <Header />
    <div class="py-3">
        <slot />
    </div>
    <Footer />
</template>
