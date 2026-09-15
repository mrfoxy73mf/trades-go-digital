interface Env {
 STRIPE_SECRET_KEY?: string;
 STRIPE_TEST_SECRET_KEY?: string;
 STRIPE_TEST_WEBHOOK_SECRET?: string;
 OPENAI_API_KEY?: string;
 SAFEWORK_MODEL?: string;
 SAFEWORK_MODE?: string;
 SAFEWORK_SALES_ENABLED?: string;
 SAFEWORK_PRICE_PENCE?: string;
 SAFEWORK_STANDARD_PRICE_PENCE?: string;
 SAFEWORK_BUNDLE_PRICE_PENCE?: string;
 SAFEWORK_MOTORWAY_TM_PRICE_PENCE?: string;
 SAFEWORK_TRAFFIC_LIGHT_PRICE_PENCE?: string;
	FULFILMENT_DB: D1Database;
	FULFILMENT_FILES: KVNamespace;
	STRIPE_WEBHOOK_SECRET: string;
	RESEND_API_KEY: string;
	ORDER_NOTIFICATION_EMAIL: string;
	INVITE_TOKEN: string;
	SITE_PASSWORD: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
