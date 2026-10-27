# Account-scoped Worker activation without project config loading

This portable adapter extracts Trigon's validated inspection/activation boundary.
It uses the supported Cloudflare API through a request callback supplied by the
consuming project; it never resolves project configuration or obtains credentials.
The callback must enforce the chosen account and least-privilege token, reject API
errors and redirects, and redact credentials. Do not add automatic retries.

```js
import { workerActivation } from "/path/to/cf/downstream/worker-activation.mjs";
const adapter = workerActivation({ workerId, scriptName }, scopedRequest);
const state = await adapter.inspect();
// Apply your existing expected-version, ownership, recovery and approval checks.
// await adapter.activate(reviewedVersionId); // a real external mutation
```

`complete: false` means the first 100 versions may be incomplete; do not infer
absence from that page. An activation error is an uncertain outcome: inspect the
remote state before deciding what to do next. This example does not decide to
deploy, adopt an existing service, or resolve ambiguous uploads. Keep the consuming
project's identity/permission and upload-recovery guards around it.

Validated against Trigon's existing cf 1.0.0-beta.14 workaround; standalone tests
use controlled request responses and make no external changes. Run:

```sh
bun test /path/to/cf/downstream/worker-activation.test.mjs
```

Related https://github.com/cloudflare/cf/issues/207 is closed by merged
https://github.com/cloudflare/cf/pull/372. The pinned beta.14 predates the fix.
Retest a containing release using explicit account/compliance-region settings
before retiring the config-coupling workaround. The API itself remains supported;
retiring the workaround does not require replacing a useful API integration.

Validation limitation (2026-10-27): the focused standalone regression passed.
The exact upstream root `pnpm check` could not run: after restoring the full
checkout, a frozen pnpm install rejected ten locked @oxc-parser/binding-*@0.76.0
entries as high-risk trust downgrades. Dependency protections were not relaxed.
The fork owner explicitly authorized publishing these standalone downstream
examples with this limitation; no full cf repository-check success is claimed.
