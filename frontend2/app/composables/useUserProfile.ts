export interface UserProfile {
	id: number;
	name: string;
	discord: string;
	country: string;
	banned: boolean;
	suspensionReason: string | null;
	timeoutUntil: string;
	charges: {
		cooldownMs: number;
		count: number;
		max: number;
	};
	droplets: number;
	equippedFlag: string | null;
	extraColorsBitmap: string | null;
	favoriteLocations: {
		id: number;
		name: string;
		latitude: number;
		longitude: number;
	}[];
	flagsBitmap: string;
	role: string;
	isCustomer: boolean;
	level: number;
	needsPhoneVerification: boolean;
	picture: string;
	pixelsPainted: number;
	showLastPixel: boolean;
	allianceId: number | null;
	allianceRole: string | null;
}

export const useUserProfile = () => {
	const config = useRuntimeConfig();
	const baseURL = config.public.backendUrl;

	const fetchUserProfile = async (): Promise<UserProfile> => {
		const response = await fetch(`${baseURL}/me`, {
			credentials: "include",
			headers: {
				"Content-Type": "application/json"
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch user profile: ${response.statusText}`);
		}

		return response.json();
	};

	return {
		fetchUserProfile
	};
};
