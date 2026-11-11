// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
	site: "https://trades-go-digital.co.uk",
	integrations: [sitemap({
		filter: (page) => [
			"/business-tools/",
			"/business-tools/pricing/",
			"/business-tools/feedback/",
			"/business-tools/support/",
			"/business-tools/terms/",
			"/logo-maker/",
			"/pdf-maker/",
		].some((path) => page === `https://trades-go-digital.co.uk${path}`),
	})],
	adapter: cloudflare({ platformProxy: { enabled: true } }),
});
