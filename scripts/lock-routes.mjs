import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const routesPath = join(process.cwd(), "dist", "_routes.json");
const routes = {
	version: 1,
	include: ["/*"],
	exclude: [],
};

mkdirSync(dirname(routesPath), { recursive: true });
writeFileSync(routesPath, `${JSON.stringify(routes, null, 2)}\n`);
