<script setup lang="ts">
    import { alert } from '~~/utils/helpers';

    const loading = ref(false);
    const amount = ref(1000);

    async function create() {
        loading.value = true;
        try {
            await $fetch('/api/dummy-pixel', {
                method: 'POST',
                body: JSON.stringify({ amount: amount.value }),
            });
            await alert('Success', 'Dummy pixels painted successfully', 'success');
        } catch (error: any) {
            await alert('Error', error.message, 'error');
        }

        loading.value = false;
    }
</script>

<template>
    <div class="card bg-dark">
        <div class="card-header">
            <div class="card-title fs-5 fw-bold">
                <i class="fa-solid fa-user"></i>
                Dummy Pixel
            </div>
        </div>
        <div class="card-body">
            <div class="mb-3">
                <label for="amount">Amount</label>
                <input type="number" class="form-control" id="amount" v-model="amount" :disabled="loading" />
            </div>
            <button class="btn btn-primary" :disabled="loading" @click="create">
                <i class="fa-solid fa-plus"></i>
                Create
            </button>
        </div>
    </div>
</template>
