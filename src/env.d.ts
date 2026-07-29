interface Env {
	INVITE_TOKEN: string;
	SITE_PASSWORD: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
