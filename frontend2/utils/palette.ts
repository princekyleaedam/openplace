type RGBA = [number, number, number, number];

interface PaletteColor {
	name: string;
	index: number;
	rgba: RGBA;
}

export const palette: PaletteColor[] = [
	{
		name: "Black",
		rgba: [0, 0, 0, 1],
		index: 1
	},
	{
		name: "Dark Gray",
		rgba: [60, 60, 60, 1],
		index: 2
	},
	{
		name: "Gray",
		rgba: [120, 120, 120, 1],
		index: 3
	},
	{
		name: "Medium Gray",
		rgba: [170, 170, 170, 1],
		index: 32
	},
	{
		name: "Light Gray",
		rgba: [210, 210, 210, 1],
		index: 4
	},
	{
		name: "White",
		rgba: [255, 255, 255, 1],
		index: 5
	},
	{
		name: "Deep Red",
		rgba: [96, 0, 24, 1],
		index: 6
	},
	{
		name: "Dark Red",
		rgba: [165, 14, 30, 1],
		index: 33
	},
	{
		name: "Red",
		rgba: [237, 28, 36, 1],
		index: 7
	},
	{
		name: "Light Red",
		rgba: [250, 128, 114, 1],
		index: 34
	},
	{
		name: "Dark Orange",
		rgba: [228, 92, 26, 1],
		index: 35
	},
	{
		name: "Orange",
		rgba: [255, 127, 39, 1],
		index: 8
	},
	{
		name: "Gold",
		rgba: [246, 170, 9, 1],
		index: 9
	},
	{
		name: "Yellow",
		rgba: [249, 221, 59, 1],
		index: 10
	},
	{
		name: "Light Yellow",
		rgba: [255, 250, 188, 1],
		index: 11
	},
	{
		name: "Dark Goldenrod",
		rgba: [156, 132, 49, 1],
		index: 37
	},
	{
		name: "Goldenrod",
		rgba: [197, 173, 49, 1],
		index: 38
	},
	{
		name: "Light Goldenrod",
		rgba: [232, 212, 95, 1],
		index: 39
	},
	{
		name: "Dark Olive",
		rgba: [74, 107, 58, 1],
		index: 40
	},
	{
		name: "Olive",
		rgba: [90, 148, 74, 1],
		index: 41
	},
	{
		name: "Light Olive",
		rgba: [132, 197, 115, 1],
		index: 42
	},
	{
		name: "Dark Green",
		rgba: [14, 185, 104, 1],
		index: 12
	},
	{
		name: "Green",
		rgba: [19, 230, 123, 1],
		index: 13
	},
	{
		name: "Light Green",
		rgba: [135, 255, 94, 1],
		index: 14
	},
	{
		name: "Dark Teal",
		rgba: [12, 129, 110, 1],
		index: 15
	},
	{
		name: "Teal",
		rgba: [16, 174, 166, 1],
		index: 16
	},
	{
		name: "Light Teal",
		rgba: [19, 225, 190, 1],
		index: 17
	},
	{
		name: "Dark Cyan",
		rgba: [15, 121, 159, 1],
		index: 43
	},
	{
		name: "Cyan",
		rgba: [96, 247, 242, 1],
		index: 20
	},
	{
		name: "Light Cyan",
		rgba: [187, 250, 242, 1],
		index: 44
	},
	{
		name: "Dark Blue",
		rgba: [40, 80, 158, 1],
		index: 18
	},
	{
		name: "Blue",
		rgba: [64, 147, 228, 1],
		index: 19
	},
	{
		name: "Light Blue",
		rgba: [125, 199, 255, 1],
		index: 45
	},
	{
		name: "Dark Indigo",
		rgba: [77, 49, 184, 1],
		index: 46
	},
	{
		name: "Indigo",
		rgba: [107, 80, 246, 1],
		index: 21
	},
	{
		name: "Light Indigo",
		rgba: [153, 177, 251, 1],
		index: 22
	},
	{
		name: "Dark Slate Blue",
		rgba: [74, 66, 132, 1],
		index: 47
	},
	{
		name: "Slate Blue",
		rgba: [122, 113, 196, 1],
		index: 48
	},
	{
		name: "Light Slate Blue",
		rgba: [181, 174, 241, 1],
		index: 49
	},
	{
		name: "Dark Purple",
		rgba: [120, 12, 153, 1],
		index: 23
	},
	{
		name: "Purple",
		rgba: [170, 56, 185, 1],
		index: 24
	},
	{
		name: "Light Purple",
		rgba: [224, 159, 249, 1],
		index: 25
	},
	{
		name: "Dark Pink",
		rgba: [203, 0, 122, 1],
		index: 26
	},
	{
		name: "Pink",
		rgba: [236, 31, 128, 1],
		index: 27
	},
	{
		name: "Light Pink",
		rgba: [243, 141, 169, 1],
		index: 28
	},
	{
		name: "Dark Peach",
		rgba: [155, 82, 73, 1],
		index: 53
	},
	{
		name: "Peach",
		rgba: [209, 128, 120, 1],
		index: 54
	},
	{
		name: "Light Peach",
		rgba: [250, 182, 164, 1],
		index: 55
	},
	{
		name: "Dark Brown",
		rgba: [104, 70, 52, 1],
		index: 29
	},
	{
		name: "Brown",
		rgba: [149, 104, 42, 1],
		index: 30
	},
	{
		name: "Light Brown",
		rgba: [219, 164, 99, 1],
		index: 50
	},
	{
		name: "Dark Tan",
		rgba: [123, 99, 82, 1],
		index: 56
	},
	{
		name: "Tan",
		rgba: [156, 132, 107, 1],
		index: 57
	},
	{
		name: "Light Tan",
		rgba: [214, 181, 148, 1],
		index: 36
	},
	{
		name: "Dark Beige",
		rgba: [209, 128, 81, 1],
		index: 51
	},
	{
		name: "Beige",
		rgba: [248, 178, 119, 1],
		index: 31
	},
	{
		name: "Light Beige",
		rgba: [255, 197, 165, 1],
		index: 52
	},
	{
		name: "Dark Stone",
		rgba: [109, 100, 63, 1],
		index: 61
	},
	{
		name: "Stone",
		rgba: [148, 140, 107, 1],
		index: 62
	},
	{
		name: "Light Stone",
		rgba: [205, 197, 158, 1],
		index: 63
	},
	{
		name: "Dark Slate",
		rgba: [51, 57, 65, 1],
		index: 58
	},
	{
		name: "Slate",
		rgba: [109, 117, 141, 1],
		index: 59
	},
	{
		name: "Light Slate",
		rgba: [179, 185, 209, 1],
		index: 60
	},
	{
		name: "Transparent",
		rgba: [0, 0, 0, 0],
		index: 0
	}
];

const freePalette = palette.filter(({ index }) => index < 32);
const transparentColor = palette.find(item => item.index === 0)!;

// Find the closest palette color to an arbitrary color
export function getClosestColor(color: RGBA, usePaidColors = false): PaletteColor {
	const [r, g, b, a] = color;

	// Round <= 50% alpha down to fully transparent
	if (a <= 128) {
		return transparentColor;
	}

	let minDistance = Number.POSITIVE_INFINITY;
	let closestColor = transparentColor;
	const usablePalette = usePaidColors ? palette : freePalette;

	for (const item of usablePalette) {
		if (item === transparentColor) {
			continue;
		}

		// Calculate Euclidean distance
		const [itemR, itemG, itemB] = item.rgba;
		const distance = Math.sqrt(
			Math.pow(r - itemR, 2) +
			Math.pow(g - itemG, 2) +
			Math.pow(b - itemB, 2)
		);

		if (distance < minDistance) {
			minDistance = distance;
			closestColor = item;
		}
	}

	return closestColor;
}

// Check if a color is unlocked for the user
export function isColorUnlocked(colorIndex: number, extraColorsBitmap: string | null): boolean {
	if (colorIndex < 32) {
		return true;
	}

	if (!extraColorsBitmap) {
		return false;
	}

	const bitmap = Number.parseInt(extraColorsBitmap, 10);
	if (Number.isNaN(bitmap)) {
		return false;
	}

	const mask = 1 << (colorIndex - 32);
	return (bitmap & mask) !== 0;
}
