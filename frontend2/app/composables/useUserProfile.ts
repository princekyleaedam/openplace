export interface UserProfile {
	id: number;
	name: string;
	discord: string;
	country: number;
	banned: boolean;
	suspensionReason: string | null;
	timeoutUntil: string;
	charges: {
		cooldownMs: number;
		count: number;
		max: number;
	};
	droplets: number;
	equippedFlag: number | null;
	extraColorsBitmap: number | null;
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

	const fetchUserProfile = async (): Promise<UserProfile | null> => {
		const response = await fetch(`${baseURL}/me`, {
			credentials: "include",
			headers: {
				"Content-Type": "application/json"
			}
		});

		if (response.status === 401) {
			// Logged out
			return null;
		}

		if (!response.ok) {
			throw new Error(`Failed to fetch user profile: ${response.statusText}`);
		}

		return response.json();
	};

	const logout = async (): Promise<void> => {
		const response = await fetch(`${baseURL}/logout`, {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json"
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to logout: ${response.statusText}`);
		}
	};

	const login = () => globalThis.location.href = `${baseURL}/login`;

	return {
		fetchUserProfile,
		logout,
		login
	};
};
