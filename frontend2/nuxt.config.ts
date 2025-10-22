// https://nuxt.com/docs/api/configuration/nuxt-config
import Aura from "@primeuix/themes/aura";

export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",

	devtools: {
		enabled: true
	},

	app: {
		baseURL: "/",

		head: {
			title: "openplace",

			htmlAttrs: {
				lang: "en"
			},

			meta: [
				{
					name: "viewport",
					content: "width=device-width, initial-scale=1"
				},
				{
					name: "color-scheme",
					content: "light dark"
				},
				{
					name: "twitter:card",
					content: "summary_large_image"
				},
				{
					property: "og:type",
					content: "website"
				},
				{
					property: "og:site_name",
					content: "openplace"
				},
				{
					property: "og:title",
					content: "openplace"
				},
				{
					property: "og:image",
					content: "/img/og-image.png"
				},
				{
					name: "description",
					content: "openplace is a free unofficial open source backend for wplace."
				},
				{
					name: "og:description",
					property: "og:description",
					content: "openplace is a free unofficial open source backend for wplace."
				}
			],

			link: [
				{
					rel: "preconnect",
					href: "https://tiles.openfreemap.org"
				},
				{
					rel: "icon",
					sizes: "96x96",
					href: "/img/favicon-96x96.png"
				},
				{
					rel: "apple-touch-icon",
					sizes: "180x180",
					href: "/img/apple-touch-icon.png"
				},
				{
					rel: "manifest",
					href: "/site.webmanifest"
				}
			]
		}
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
