import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, rm, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { preparePrebuilt } from "./bun-prebuilt.mjs";

await test("Bun config produces validated prebuilt output and preserves existing directories", async () => {
  const parent = resolve(".cache/cf-prebuilt-tests");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(join(parent, "adapter-"));
  try {
    const bundle = join(root, "bundle"), assets = join(root, "assets"), output = join(root, "output");
    await mkdir(bundle); await mkdir(assets);
    await writeFile(join(bundle, "worker.js"), 'export default { fetch() { return new Response("ok"); } };');
    await writeFile(join(assets, "index.html"), "fixture");
    const configFile = join(root, "cloudflare.config.ts");
    await writeFile(configFile, 'export default { worker: { name: "prebuilt-probe", entrypoint: "worker.js", compatibilityDate: "2026-10-01" } };');
    const input = { configFile, bundle, assets, output };
    assert.equal(await preparePrebuilt(input), output);
    await access(join(output, ".cloudflare/output/v0/config.json"));
    await assert.rejects(() => preparePrebuilt(input), /EEXIST/);
    const invalidConfig = join(root, "invalid.config.ts");
    await writeFile(invalidConfig, 'export default { worker: { name: 42 } };');
    const invalidOutput = join(root, "invalid-output");
    await assert.rejects(() => preparePrebuilt({ ...input, configFile: invalidConfig, output: invalidOutput }));
    await assert.rejects(() => access(invalidOutput), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

