import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveAndParseConfig } from "@cloudflare/config";
import {
  getWorkerBundleDir, readBuildOutput, writeAssets, writeRootConfig, writeWorkerConfig,
} from "@cloudflare/build-output-utils";

export async function preparePrebuilt({ configFile, bundle, assets, output, modules = {}, mode = "test" }) {
  const definition = (await import(pathToFileURL(resolve(configFile)).href)).default;
  const buildContext = { mode, isPreview: false };
  const parsed = await resolveAndParseConfig(definition, buildContext);
  if (!parsed.success) throw parsed.error;
  const { worker, containers, ...settings } = parsed.data;
  if (!worker || containers?.length) throw new Error("A single Worker configuration is required");

  const root = resolve(output);
  await mkdir(root);
  try {
    const target = getWorkerBundleDir(root);
    await mkdir(target, { recursive: true });
    await cp(resolve(bundle), target, { recursive: true });
    await writeAssets({ root, sourceDirectory: resolve(assets) });
    await writeRootConfig({ root, settings, buildContext });
    await writeWorkerConfig({ root, config: worker, manifest: { type: "partial", mainModule: "worker.js", modules } });
    await readBuildOutput(root);
    return root;
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
