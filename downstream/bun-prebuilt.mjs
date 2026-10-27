import { mkdir, cp } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { InputConfigSchema } = await import(import.meta.resolve("@cloudflare/config", resolve("package.json")));
const { writeAssets, writeRootConfig, writeWorkerConfig, getWorkerBundleDir, readBuildOutput } =
  await import(import.meta.resolve("@cloudflare/build-output-utils", resolve("package.json")));

// Run under Bun. Existing output is refused; inputs are never cleaned or replaced.
export async function preparePrebuilt({ configFile, bundle, assets, output, modules = {}, mode = "test" }) {
  const config = InputConfigSchema.parse((await import(pathToFileURL(resolve(configFile)).href)).default);
  if (!config.worker) throw new Error("Worker configuration required");
  const project = resolve(output);
  await mkdir(project);
  const target = getWorkerBundleDir(project);
  await mkdir(target, { recursive: true });
  await cp(resolve(bundle), target, { recursive: true });
  await writeAssets({ root: project, sourceDirectory: resolve(assets) });
  await writeRootConfig(project, undefined, { mode, isPreview: false });
  await writeWorkerConfig({ root: project, config: config.worker,
    manifest: { type: "partial", mainModule: "worker.js", modules } });
  await readBuildOutput(project);
  return project;
}
