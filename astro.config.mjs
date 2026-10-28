// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";

const publicPages = new Set(["/tgd", "/contact", "/terms-and-conditions"]);

export default defineConfig({
	site: "https://trades-go-digital.co.uk",
	integrations: [sitemap({ filter: (page) => publicPages.has(new URL(page).pathname.replace(/\/$/, "") || "/") })],
	adapter: cloudflare({ platformProxy: { enabled: true } }),
});
