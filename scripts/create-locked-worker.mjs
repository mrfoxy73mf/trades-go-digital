import { writeFileSync } from "node:fs";
import { join } from "node:path";

const workerPath = join(process.cwd(), "dist", "locked-worker.js");

const worker = String.raw`import astroWorker from "./_worker.js/index.js";

export default {
	fetch(request, env, ctx) {
		return astroWorker.fetch(request, env, ctx);
	},
};
`;

writeFileSync(workerPath, worker);
