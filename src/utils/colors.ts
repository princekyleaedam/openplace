import { ColorPalette } from "../types/index.js";

export const COLOR_PALETTE: ColorPalette = {
	0: { rgb: [0, 0, 0], paid: false }, // Transparent
	1: { rgb: [0, 0, 0], paid: false },
	2: { rgb: [60, 60, 60], paid: false },
	3: { rgb: [120, 120, 120], paid: false },
	4: { rgb: [210, 210, 210], paid: false },
	5: { rgb: [255, 255, 255], paid: false },
	6: { rgb: [96, 0, 24], paid: false },
	7: { rgb: [237, 28, 36], paid: false },
	8: { rgb: [255, 127, 39], paid: false },
	9: { rgb: [246, 170, 9], paid: false },
	10: { rgb: [249, 221, 59], paid: false },
	11: { rgb: [255, 250, 188], paid: false },
	12: { rgb: [14, 185, 104], paid: false },
	13: { rgb: [19, 230, 123], paid: false },
	14: { rgb: [135, 255, 94], paid: false },
	15: { rgb: [12, 129, 110], paid: false },
	16: { rgb: [16, 174, 166], paid: false },
	17: { rgb: [19, 225, 190], paid: false },
	18: { rgb: [40, 80, 158], paid: false },
	19: { rgb: [64, 147, 228], paid: false },
	20: { rgb: [96, 247, 242], paid: false },
	21: { rgb: [107, 80, 246], paid: false },
	22: { rgb: [153, 177, 251], paid: false },
	23: { rgb: [120, 12, 153], paid: false },
	24: { rgb: [170, 56, 185], paid: false },
	25: { rgb: [224, 159, 249], paid: false },
	26: { rgb: [203, 0, 122], paid: false },
	27: { rgb: [236, 31, 128], paid: false },
	28: { rgb: [243, 141, 169], paid: false },
	29: { rgb: [104, 70, 52], paid: false },
	30: { rgb: [149, 104, 42], paid: false },
	31: { rgb: [248, 178, 119], paid: false },
	32: { rgb: [170, 170, 170], paid: true },
	33: { rgb: [165, 14, 30], paid: true },
	34: { rgb: [250, 128, 114], paid: true },
	35: { rgb: [228, 92, 26], paid: true },
	36: { rgb: [214, 181, 148], paid: true },
	37: { rgb: [156, 132, 49], paid: true },
	38: { rgb: [197, 173, 49], paid: true },
	39: { rgb: [232, 212, 95], paid: true },
	40: { rgb: [74, 107, 58], paid: true },
	41: { rgb: [90, 148, 74], paid: true },
	42: { rgb: [132, 197, 115], paid: true },
	43: { rgb: [15, 121, 159], paid: true },
	44: { rgb: [187, 250, 242], paid: true },
	45: { rgb: [125, 199, 255], paid: true },
	46: { rgb: [77, 49, 184], paid: true },
	47: { rgb: [74, 66, 132], paid: true },
	48: { rgb: [122, 113, 196], paid: true },
	49: { rgb: [181, 174, 241], paid: true },
	50: { rgb: [219, 164, 99], paid: true },
	51: { rgb: [209, 128, 81], paid: true },
	52: { rgb: [255, 197, 165], paid: true },
	53: { rgb: [155, 82, 73], paid: true },
	54: { rgb: [209, 128, 120], paid: true },
	55: { rgb: [250, 182, 164], paid: true },
	56: { rgb: [123, 99, 82], paid: true },
	57: { rgb: [156, 132, 107], paid: true },
	58: { rgb: [51, 57, 65], paid: true },
	59: { rgb: [109, 117, 141], paid: true },
	60: { rgb: [179, 185, 209], paid: true },
	61: { rgb: [109, 100, 63], paid: true },
	62: { rgb: [148, 140, 107], paid: true },
	63: { rgb: [205, 197, 158], paid: true }
};

export const checkColorUnlocked = (colorId: number, extraColorsBitmap: number): boolean => {
	if (colorId < 32) {
		return true;
	}

	const mask = 1 << (colorId - 32);
	return (extraColorsBitmap & mask) !== 0;
};
