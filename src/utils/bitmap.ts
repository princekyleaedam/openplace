import { BitMap } from "../types/index.js";

export class WplaceBitMap implements BitMap {
	bytes: Uint8Array;

	constructor(bytes?: Uint8Array) {
		this.bytes = bytes ?? new Uint8Array(0);
	}

	set(index: number, value: boolean): void {
		const byteIndex = Math.floor(index / 8);
		const bitIndex = index % 8;

		if (byteIndex >= this.bytes.length) {
			const newBytes = new Uint8Array(byteIndex + 1);
			newBytes.set(this.bytes, newBytes.length - this.bytes.length);
			this.bytes = newBytes;
		}

		const realIndex = this.bytes.length - 1 - byteIndex;

		if (value) {
			this.bytes[realIndex]! |= (1 << bitIndex);
		} else {
			this.bytes[realIndex]! &= ~(1 << bitIndex);
		}
	}

	get(index: number): boolean {
		const byteIndex = Math.floor(index / 8);
		const bitIndex = index % 8;

		if (byteIndex >= this.bytes.length) {
			return false;
		}

		const realIndex = this.bytes.length - 1 - byteIndex;
		return (this.bytes[realIndex]! & (1 << bitIndex)) !== 0;
	}

	toBase64(): string {
		return Buffer.from(this.bytes)
			.toString("base64");
	}

	static fromBase64(base64: string): WplaceBitMap {
		const bytes = new Uint8Array(Buffer.from(base64, "base64"));
		return new WplaceBitMap(bytes);
	}
}
