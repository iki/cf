import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { preparePrebuilt } from "./bun-prebuilt.mjs";

await test("writes validated v1 output for a Worker with assets and preserves existing output", async () => {
  const require = createRequire(import.meta.url);
  const reader = await import(import.meta.resolve("@cloudflare/build-output-utils", require.resolve("cf/package.json")));
  const root = await mkdtemp(join(tmpdir(), "cf prebuilt-"));
  try {
    const bundle = join(root, "bundle"), assets = join(root, "assets");
    await mkdir(bundle);
    await mkdir(assets);
    await writeFile(join(bundle, "worker.js"), "export default { fetch() { return new Response('ok'); } };");
    await writeFile(join(assets, "index.html"), "fixture");
    for (const kind of ["object", "function"]) {
      const configFile = join(root, kind + ".config.ts"), output = join(root, kind);
      const worker = "{ worker: { name: 'prebuilt-probe', entrypoint: 'worker.js', compatibilityDate: '2026-10-01' } }";
      const expression = kind === "function" ? "ctx => ctx.mode === 'preview' ? " + worker + " : {}" : worker;
      await writeFile(configFile, "export default " + expression + ";");
      const input = { configFile, bundle, assets, output, mode: "preview" };
      assert.equal(await preparePrebuilt(input), output);
      const configPath = join(output, ".cloudflare/output/v1/config.json");
      const before = await readFile(configPath, "utf8");
      assert.deepEqual(JSON.parse(before).buildContext, { mode: "preview", isPreview: false });
      const readBack = await reader.readBuildOutput(output);
      assert.equal(readBack.version, "v1");
      assert.equal(readBack.workers.default.config.manifest.mainModule, "worker.js");
      await assert.rejects(() => preparePrebuilt(input), { code: "EEXIST" });
      assert.equal(await readFile(configPath, "utf8"), before);
    }
    const configFile = join(root, "invalid.config.ts"), output = join(root, "invalid");
    await writeFile(configFile, "export default { worker: { name: 42 } };");
    await assert.rejects(() => preparePrebuilt({ configFile, bundle, assets, output }));
    await assert.rejects(() => access(output), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
