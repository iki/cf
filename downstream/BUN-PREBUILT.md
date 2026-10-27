# Validated prebuilt output with Bun

This standalone example separates Bun's native config import from cf's supported
Build Output v0 input. It preserves InputConfigSchema and readBuildOutput validation;
it does not alter cf's unsupported Node module-hook loader. It is not the rejected
Bun-loader PR #256 and does not claim to implement that PR.

Install @cloudflare/config 0.28.1 and @cloudflare/build-output-utils 0.9.5 in the
consuming project; the example resolves packages from that project's working
directory. Run under Bun 1.4.2, with a trusted config exporting `{ worker: ... }`:

```js
import { preparePrebuilt } from "/path/to/cf/downstream/bun-prebuilt.mjs";
await preparePrebuilt({
  configFile: "./cloudflare.config.ts",
  bundle: "./build/worker", // contains already-bundled worker.js
  assets: "./build/client",
  output: "./build/prebuilt-test", // must not exist
  mode: "test",
});
```

The caller owns compilation and the exact worker/asset inputs. Supply explicit
`modules` metadata for non-JavaScript modules such as compiled WASM; Trigon also
validates its expected WASM inventory and bytes before invoking the writer. Those
application-specific checks must be preserved by each caller. The example refuses
existing output and leaves partial output for diagnosis if validation fails.

The result can be consumed by cf 1.0.0-beta.14's `--prebuilt` flow from that isolated
project directory. This example never uploads or deploys. Retain normal artifact,
account, credential, adoption and activation checks before any deployment.

Run `bun test /path/to/cf/downstream/bun-prebuilt.test.mjs` from the consuming project.
The fixture creates and validates real Build Output without network or credentials,
and rejects invalid configuration and existing output.

Upstream context: https://github.com/cloudflare/cf/issues/252,
https://github.com/cloudflare/cf/pull/256 and https://github.com/oven-sh/bun/issues/27369.
The maintainer declined Bun-specific loading. This remains a downstream example;
offer a PR only if maintainers express interest.

Validation limitation (2026-10-27): the focused standalone regression passed.
The exact upstream root `pnpm check` could not run: after restoring the full
checkout, a frozen pnpm install rejected ten locked @oxc-parser/binding-*@0.76.0
entries as high-risk trust downgrades. Dependency protections were not relaxed.
The fork owner explicitly authorized publishing these standalone downstream
examples with this limitation; no full cf repository-check success is claimed.
