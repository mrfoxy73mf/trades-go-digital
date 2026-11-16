import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicPages = [
  "/business-tools/",
  "/business-tools/pricing/",
  "/business-tools/feedback/",
  "/business-tools/support/",
  "/business-tools/terms/",
  "/pdf-maker/",
  "/logo-maker/",
];

test("the public homepage and business tools are available to search engines", async () => {
  const [workerSource, astroConfig, robots] = await Promise.all([
    readFile(new URL("../scripts/create-locked-worker.mjs", import.meta.url), "utf8"),
    readFile(new URL("../astro.config.mjs", import.meta.url), "utf8"),
    readFile(new URL("../public/robots.txt", import.meta.url), "utf8"),
  ]);

  for (const path of publicPages) {
    assert.match(workerSource, new RegExp(`"${path.replaceAll("/", "\\/")}"`), `${path} must bypass the password gate`);
    assert.match(astroConfig, new RegExp(`"${path.replaceAll("/", "\\/")}"`), `${path} must appear in the sitemap`);
  }

  assert.equal(publicPages.length, 7);
  assert.match(workerSource, /url\.pathname === "\/"/);
  assert.match(workerSource, /Response\.redirect\(new URL\("\/business-tools\/", url\), 301\)/);
  assert.doesNotMatch(workerSource, /^\s*"\/support\/?",\s*$/m, "the separate site support page must remain locked");

  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Allow:\s*\//i);
  assert.match(robots, /Sitemap:\s*https:\/\/trades-go-digital\.co\.uk\/sitemap-index\.xml/i);
});
