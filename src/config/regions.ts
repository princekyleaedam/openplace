export interface Region {
	id: number;
	cityId: number;
	name: string;
	number: number;
	countryId: number;
	flagId: number;
}

export function getRegionForCoordinates(tileX: number, tileY: number, x: number, y: number): Region {
	// @ts-expect-error - for now
	const globalX = tileX * 1000 + x;
	// @ts-expect-error - for now
	const globalY = tileY * 1000 + y;
	// TODO: implement region lookup
	return {
		id: 114_594,
		cityId: 4263,
		name: "openplace",
		number: 1,
		countryId: 13,
		flagId: 13
	};
}
