<script setup lang="ts">
    import _ from 'lodash';
    import { alert } from '~~/utils/helpers';
    import { similarColor } from '~~/utils/palette';

    const imageInput = useTemplateRef('imageInput');
    const canvas = useTemplateRef('canvas');

    const loading = ref(false);
    const coords = ref({
        tileX: '',
        tileY: '',
        x: '',
        y: '',
    });
    const file = ref<File | null>(null);
    const dithering = ref(true);

    function chooseImage() {
        imageInput.value?.click();
    }

    async function handleImageChange(event: Event) {
        const el = event.target as HTMLInputElement;
        file.value = el.files?.[0] ?? null;
        if (!file.value) return;

        loading.value = true;

        try {
            const matches = file.value.name.match(/place34-(\d+)-(\d+)-(\d+)-(\d+)\.\w+$/);
            if (matches) {
                coords.value.tileX = matches[1]!;
                coords.value.tileY = matches[2]!;
                coords.value.x = matches[3]!;
                coords.value.y = matches[4]!;
            }

            await drawFileToCanvas();
        } catch (ex) {
            console.error(ex);
            await alert('Error', (ex as Error).message, 'error');
        }

        loading.value = false;

        el.value = '';
    }

    function applyFloydSteinbergDithering(imageData: ImageData, width: number, height: number) {
        const data = imageData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;

                // Lấy màu hiện tại
                const oldR = data[index + 0] ?? 0;
                const oldG = data[index + 1] ?? 0;
                const oldB = data[index + 2] ?? 0;
                const oldA = data[index + 3] ?? 0;

                // Tìm màu gần nhất trong palette
                const newColor = similarColor({ r: oldR, g: oldG, b: oldB, a: oldA }, true);

                // Đặt màu mới
                data[index + 0] = newColor.r;
                data[index + 1] = newColor.g;
                data[index + 2] = newColor.b;
                data[index + 3] = newColor.a;

                // Tính toán lỗi (error)
                const errorR = oldR - newColor.r;
                const errorG = oldG - newColor.g;
                const errorB = oldB - newColor.b;

                // Phân phối lỗi cho các pixel lân cận theo Floyd-Steinberg
                // Pixel bên phải (x+1, y)
                if (x + 1 < width) {
                    const rightIndex = (y * width + (x + 1)) * 4;
                    data[rightIndex + 0] = Math.max(0, Math.min(255, data[rightIndex + 0]! + (errorR * 7) / 16));
                    data[rightIndex + 1] = Math.max(0, Math.min(255, data[rightIndex + 1]! + (errorG * 7) / 16));
                    data[rightIndex + 2] = Math.max(0, Math.min(255, data[rightIndex + 2]! + (errorB * 7) / 16));
                }

                // Pixel dưới bên trái (x-1, y+1)
                if (x - 1 >= 0 && y + 1 < height) {
                    const bottomLeftIndex = ((y + 1) * width + (x - 1)) * 4;
                    data[bottomLeftIndex + 0] = Math.max(0, Math.min(255, data[bottomLeftIndex + 0]! + (errorR * 3) / 16));
                    data[bottomLeftIndex + 1] = Math.max(0, Math.min(255, data[bottomLeftIndex + 1]! + (errorG * 3) / 16));
                    data[bottomLeftIndex + 2] = Math.max(0, Math.min(255, data[bottomLeftIndex + 2]! + (errorB * 3) / 16));
                }

                // Pixel dưới (x, y+1)
                if (y + 1 < height) {
                    const bottomIndex = ((y + 1) * width + x) * 4;
                    data[bottomIndex + 0] = Math.max(0, Math.min(255, data[bottomIndex + 0]! + (errorR * 5) / 16));
                    data[bottomIndex + 1] = Math.max(0, Math.min(255, data[bottomIndex + 1]! + (errorG * 5) / 16));
                    data[bottomIndex + 2] = Math.max(0, Math.min(255, data[bottomIndex + 2]! + (errorB * 5) / 16));
                }

                // Pixel dưới bên phải (x+1, y+1)
                if (x + 1 < width && y + 1 < height) {
                    const bottomRightIndex = ((y + 1) * width + (x + 1)) * 4;
                    data[bottomRightIndex + 0] = Math.max(0, Math.min(255, data[bottomRightIndex + 0]! + (errorR * 1) / 16));
                    data[bottomRightIndex + 1] = Math.max(0, Math.min(255, data[bottomRightIndex + 1]! + (errorG * 1) / 16));
                    data[bottomRightIndex + 2] = Math.max(0, Math.min(255, data[bottomRightIndex + 2]! + (errorB * 1) / 16));
                }
            }
        }
    }

    async function drawFileToCanvas() {
        if (!canvas.value) throw new Error('Canvas not found');
        if (!file.value) throw new Error('File not found');

        const imgSrc = URL.createObjectURL(file.value);

        try {
            const image = new Image();
            image.src = imgSrc;
            await image.decode();

            canvas.value.width = image.width;
            canvas.value.height = image.height;

            const ctx = canvas.value.getContext('2d');
            if (!ctx) throw new Error('Canvas context not found');

            ctx.drawImage(image, 0, 0);

            const imageData = ctx.getImageData(0, 0, image.width, image.height);
            if (!imageData) throw new Error('Image data not found');

            if (dithering.value) {
                // Áp dụng Floyd-Steinberg dithering
                applyFloydSteinbergDithering(imageData, image.width, image.height);
            } else {
                for (let y = 0; y < image.height; y++) {
                    for (let x = 0; x < image.width; x++) {
                        const index = (y * image.width + x) * 4;
                        const r = imageData.data[index + 0] ?? 0;
                        const g = imageData.data[index + 1] ?? 0;
                        const b = imageData.data[index + 2] ?? 0;
                        const a = imageData.data[index + 3] ?? 0;

                        const color = similarColor({ r, g, b, a }, true);
                        imageData.data[index + 0] = color.r;
                        imageData.data[index + 1] = color.g;
                        imageData.data[index + 2] = color.b;
                        imageData.data[index + 3] = color.a;
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
        } catch (error) {
            throw error;
        } finally {
            URL.revokeObjectURL(imgSrc);
        }
    }

    async function submit() {
        if (!file.value) return;
        if (!canvas.value) return;

        loading.value = true;

        try {
            const blob = await new Promise<Blob>((resolve) => {
                canvas.value!.toBlob((b) => resolve(b!), 'image/png', 1.0);
            });

            const formData = new FormData();
            formData.append('image', blob, 'image.png');
            formData.append('tileX', coords.value.tileX);
            formData.append('tileY', coords.value.tileY);
            formData.append('x', coords.value.x);
            formData.append('y', coords.value.y);

            await $fetch('/api/paint', {
                method: 'POST',
                body: formData,
            });

            await alert('Success', 'Image drawn to map successfully', 'success');
        } catch (error: any) {
            console.error(error);

            try {
                await alert('Error', error.response._data.message, 'error');
            } catch {
                await alert('Error', error.message, 'error');
            }
        }

        loading.value = false;
    }

    async function handleDitheringChange() {
        loading.value = true;

        try {
            await drawFileToCanvas();
        } catch (error) {
            console.error(error);
        }

        loading.value = false;
    }
</script>

<template>
    <div class="card bg-dark">
        <div class="card-header">
            <div class="card-title fs-5 fw-bold">
                <i class="fa-solid fa-image"></i>
                Draw Image to Map
            </div>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-12">Location:</div>
                <div class="col-3">
                    <input type="text" v-model="coords.tileX" class="form-control" placeholder="Tile X" :disabled="loading" />
                </div>
                <div class="col-3">
                    <input type="text" v-model="coords.tileY" class="form-control" placeholder="Tile Y" :disabled="loading" />
                </div>
                <div class="col-3">
                    <input type="text" v-model="coords.x" class="form-control" placeholder="X" :disabled="loading" />
                </div>
                <div class="col-3">
                    <input type="text" v-model="coords.y" class="form-control" placeholder="Y" :disabled="loading" />
                </div>
            </div>

            <div class="mb-3"></div>

            <div>
                <input type="file" class="d-none" ref="imageInput" @change="handleImageChange" />
                <div class="d-flex align-items-center gap-2">
                    <span>Image:</span>
                    <button class="btn btn-outline-primary btn-sm" @click="chooseImage" :disabled="loading">
                        <i class="fa-solid fa-image"></i>
                        Choose Image
                    </button>
                </div>
                <div class="mb-1"></div>
                <div class="ratio ratio-4x3">
                    <canvas ref="canvas" class="border" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated" />
                </div>
            </div>

            <div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="dithering" v-model="dithering" :disabled="loading" @change="handleDitheringChange" />
                    <label class="form-check-label" for="dithering">Dithering</label>
                </div>
            </div>

            <div class="mb-3"></div>

            <div class="d-flex justify-content-between align-items-center">
                <button class="btn btn-success" :disabled="loading" @click="submit">
                    <i class="fa-solid fa-circle-up"></i>
                    Draw to Map
                </button>
            </div>
        </div>
    </div>
</template>
