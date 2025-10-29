export interface FavoriteLocation {
	id: number;
	name: string;
	latitude: number;
	longitude: number;
}

export const useFavorites = () => {
	const config = useRuntimeConfig();

	const addFavorite = async (latitude: number, longitude: number): Promise<{ id: number; success: boolean }> => {
		const response = await fetch(`${config.public.backendUrl}/favorite-location`, {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ latitude, longitude })
		});

		if (!response.ok) {
			throw new Error(await response.json());
		}

		return response.json();
	};

	const removeFavorite = async (id: number): Promise<{ success: boolean }> => {
		const response = await fetch(`${config.public.backendUrl}/favorite-location/delete`, {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ id })
		});

		if (!response.ok) {
			throw new Error(await response.json());
		}

		return response.json();
	};

	return {
		addFavorite,
		removeFavorite
	};
};
