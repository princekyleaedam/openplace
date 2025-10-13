// prettier-ignore
const sortIdxs = [1, 2, 3, 32, 4, 5, 6, 33, 7, 34, 35, 8, 9, 10, 11, 37, 38, 39, 40, 41, 42, 12, 13, 14, 15, 16, 17, 43, 20, 44, 18, 19, 45, 46, 21, 22, 47, 48, 49, 23, 24, 25, 26, 27, 28, 53, 54, 55, 29, 30, 50, 56, 57, 36, 51, 31, 52, 61, 62, 63, 58, 59, 60, 0];

const colors = [
    {
        name: 'Transparent',
        rgb: [0, 0, 0, 0],
    },
    {
        name: 'Black',
        rgb: [0, 0, 0, 255],
    },
    {
        name: 'Dark Gray',
        rgb: [60, 60, 60, 255],
    },
    {
        name: 'Gray',
        rgb: [120, 120, 120, 255],
    },
    {
        name: 'Light Gray',
        rgb: [210, 210, 210, 255],
    },
    {
        name: 'White',
        rgb: [255, 255, 255, 255],
    },
    {
        name: 'Deep Red',
        rgb: [96, 0, 24, 255],
    },
    {
        name: 'Red',
        rgb: [237, 28, 36, 255],
    },
    {
        name: 'Orange',
        rgb: [255, 127, 39, 255],
    },
    {
        name: 'Gold',
        rgb: [246, 170, 9, 255],
    },
    {
        name: 'Yellow',
        rgb: [249, 221, 59, 255],
    },
    {
        name: 'Light Yellow',
        rgb: [255, 250, 188, 255],
    },
    {
        name: 'Dark Green',
        rgb: [14, 185, 104, 255],
    },
    {
        name: 'Green',
        rgb: [19, 230, 123, 255],
    },
    {
        name: 'Light Green',
        rgb: [135, 255, 94, 255],
    },
    {
        name: 'Dark Teal',
        rgb: [12, 129, 110, 255],
    },
    {
        name: 'Teal',
        rgb: [16, 174, 166, 255],
    },
    {
        name: 'Light Teal',
        rgb: [19, 225, 190, 255],
    },
    {
        name: 'Dark Blue',
        rgb: [40, 80, 158, 255],
    },
    {
        name: 'Blue',
        rgb: [64, 147, 228, 255],
    },
    {
        name: 'Cyan',
        rgb: [96, 247, 242, 255],
    },
    {
        name: 'Indigo',
        rgb: [107, 80, 246, 255],
    },
    {
        name: 'Light Indigo',
        rgb: [153, 177, 251, 255],
    },
    {
        name: 'Dark Purple',
        rgb: [120, 12, 153, 255],
    },
    {
        name: 'Purple',
        rgb: [170, 56, 185, 255],
    },
    {
        name: 'Light Purple',
        rgb: [224, 159, 249, 255],
    },
    {
        name: 'Dark Pink',
        rgb: [203, 0, 122, 255],
    },
    {
        name: 'Pink',
        rgb: [236, 31, 128, 255],
    },
    {
        name: 'Light Pink',
        rgb: [243, 141, 169, 255],
    },
    {
        name: 'Dark Brown',
        rgb: [104, 70, 52, 255],
    },
    {
        name: 'Brown',
        rgb: [149, 104, 42, 255],
    },
    {
        name: 'Beige',
        rgb: [248, 178, 119, 255],
    },
    {
        name: 'Medium Gray',
        rgb: [170, 170, 170, 255],
    },
    {
        name: 'Dark Red',
        rgb: [165, 14, 30, 255],
    },
    {
        name: 'Light Red',
        rgb: [250, 128, 114, 255],
    },
    {
        name: 'Dark Orange',
        rgb: [228, 92, 26, 255],
    },
    {
        name: 'Light Tan',
        rgb: [214, 181, 148, 255],
    },
    {
        name: 'Dark Goldenrod',
        rgb: [156, 132, 49, 255],
    },
    {
        name: 'Goldenrod',
        rgb: [197, 173, 49, 255],
    },
    {
        name: 'Light Goldenrod',
        rgb: [232, 212, 95, 255],
    },
    {
        name: 'Dark Olive',
        rgb: [74, 107, 58, 255],
    },
    {
        name: 'Olive',
        rgb: [90, 148, 74, 255],
    },
    {
        name: 'Light Olive',
        rgb: [132, 197, 115, 255],
    },
    {
        name: 'Dark Cyan',
        rgb: [15, 121, 159, 255],
    },
    {
        name: 'Light Cyan',
        rgb: [187, 250, 242, 255],
    },
    {
        name: 'Light Blue',
        rgb: [125, 199, 255, 255],
    },
    {
        name: 'Dark Indigo',
        rgb: [77, 49, 184, 255],
    },
    {
        name: 'Dark Slate Blue',
        rgb: [74, 66, 132, 255],
    },
    {
        name: 'Slate Blue',
        rgb: [122, 113, 196, 255],
    },
    {
        name: 'Light Slate Blue',
        rgb: [181, 174, 241, 255],
    },
    {
        name: 'Light Brown',
        rgb: [219, 164, 99, 255],
    },
    {
        name: 'Dark Beige',
        rgb: [209, 128, 81, 255],
    },
    {
        name: 'Light Beige',
        rgb: [255, 197, 165, 255],
    },
    {
        name: 'Dark Peach',
        rgb: [155, 82, 73, 255],
    },
    {
        name: 'Peach',
        rgb: [209, 128, 120, 255],
    },
    {
        name: 'Light Peach',
        rgb: [250, 182, 164, 255],
    },
    {
        name: 'Dark Tan',
        rgb: [123, 99, 82, 255],
    },
    {
        name: 'Tan',
        rgb: [156, 132, 107, 255],
    },
    {
        name: 'Dark Slate',
        rgb: [51, 57, 65, 255],
    },
    {
        name: 'Slate',
        rgb: [109, 117, 141, 255],
    },
    {
        name: 'Light Slate',
        rgb: [179, 185, 209, 255],
    },
    {
        name: 'Dark Stone',
        rgb: [109, 100, 63, 255],
    },
    {
        name: 'Stone',
        rgb: [148, 140, 107, 255],
    },
    {
        name: 'Light Stone',
        rgb: [205, 197, 158, 255],
    },
];

type Color = {
    name: string;
    r: number;
    g: number;
    b: number;
    a: number;
    idx: number;
};

export const palette = sortIdxs.map((idx) => {
    return {
        name: colors[idx]!.name,
        r: colors[idx]!.rgb[0]!,
        g: colors[idx]!.rgb[1]!,
        b: colors[idx]!.rgb[2]!,
        a: colors[idx]!.rgb[3]!,
        idx,
    };
});

/**
 * Similar color
 * @param {Color} color
 * @param {boolean} usePaidColors
 * @returns {Color}
 */
export function similarColor(color: { r: number; g: number; b: number; a: number }, usePaidColors = false): Color {
    // Nếu màu đầu vào là transparent (alpha = 0), trả về màu transparent
    if (color.a <= 128) {
        return palette.find((c) => c.idx == 0)!; // Transparent color
    }

    let minDistance = Infinity;
    let closestColor: Color = palette.find((c) => c.idx == 0)!;

    const filteredPalette = usePaidColors ? palette : palette.filter((c) => c.idx < 32);

    // Duyệt qua tất cả màu trong palette
    for (let i = 0; i < filteredPalette.length; i++) {
        const paletteColor = filteredPalette[i];
        if (!paletteColor || paletteColor.idx == 0) continue;

        // Tính khoảng cách Euclidean trong không gian RGB
        const distance = Math.sqrt(Math.pow(color.r - paletteColor.r, 2) + Math.pow(color.g - paletteColor.g, 2) + Math.pow(color.b - paletteColor.b, 2));

        // Cập nhật màu gần nhất nếu khoảng cách nhỏ hơn
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = paletteColor;
        }
    }

    return closestColor;
}
