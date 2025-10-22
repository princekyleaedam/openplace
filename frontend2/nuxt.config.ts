// https://nuxt.com/docs/api/configuration/nuxt-config
import Aura from "@primeuix/themes/aura";

export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",

	devtools: {
		enabled: true
	},

	app: {
		baseURL: "/"
	},

	devServer: {
		host: "0.0.0.0",
		port: Number.parseInt(process.env["FRONTEND_PORT"]!) || 3001
	},

	runtimeConfig: {
		public: {
			backendUrl: process.env["BACKEND_URL"] ?? ""
		}
	},

	modules: ["@primevue/nuxt-module"],

	primevue: {
		options: {
			theme: {
				preset: Aura
			}
		}
	},

	css: [
		"bootstrap/dist/css/bootstrap-reboot.min.css",
		"bootstrap/dist/css/bootstrap-utilities.min.css",
		"bootstrap/dist/css/bootstrap-grid.min.css",
		"maplibre-gl/dist/maplibre-gl.css",
		"~/assets/common.scss"
	]
});
