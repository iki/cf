# Write cf release-candidate Build Output under Bun

Use the two sibling files in a project with exact dependencies on
`cf@1.0.0-rc.2`, `@cloudflare/config@1.0.0-rc.2` and
`@cloudflare/build-output-utils@1.0.0-rc.2`. Place both files under that
installation so their ESM imports resolve to the selected packages.
With Bun 1.4.2, run `bun test ./downstream/bun-prebuilt.test.mjs`.

Call `preparePrebuilt({configFile, bundle, assets, output, modules, mode})`
with an already compiled single Worker. The input bundle must contain
`worker.js`. The output directory must be new. The helper resolves object or
function configuration through the published parser, writes v1 Build Output
and reads it back. The test also reads the result using cf's own transitive
Build Output reader. An explicit config path supports spaces on Windows.

The native loader still rejects Bun. This helper covers an explicit config,
a single Worker and local assets. Callers own bundling, source discovery,
and deployment. A write failure removes the directory acquired by that call so the same output path can be retried. The
[upstream loader discussion](https://github.com/cloudflare/cf/issues/252)
records the support decision. The [older helper](https://github.com/iki/cf/commit/b6c20a32e18f618adbbb05e3a3d300896bfd2a83)
targets the v0 output layout.
