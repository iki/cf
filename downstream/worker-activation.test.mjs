import assert from "node:assert/strict";
import { test } from "node:test";
import { workerActivation } from "./worker-activation.mjs";

await test("activation validates current state and the exact version acknowledgement", async () => {
  const calls = [];
  const version = { id: "version-1", number: 1, source: "upload" };
  const selected = { id: "deployment-1", versions: [{ version_id: version.id, percentage: 100 }] };
  let response = selected;
  const adapter = workerActivation({ workerId: "worker-1", scriptName: "example-worker" }, async (path, method, body) => {
    calls.push({ path, method, body });
    if (method === "POST") return response;
    return path.includes("?per_page=") ? [version] : { deployments: [] };
  });
  assert.deepEqual(await adapter.inspect(), { versions: [{ ...version, annotations: {} }], complete: true, active: null });
  assert.deepEqual(await adapter.activate(version.id), selected);
  assert.deepEqual(calls.at(-1), { path: "/workers/scripts/example-worker/deployments", method: "POST",
    body: { strategy: "percentage", versions: [{ version_id: version.id, percentage: 100 }] } });
  response = { ...selected, versions: [{ version_id: "other", percentage: 100 }] };
  await assert.rejects(() => adapter.activate(version.id), /did not confirm/);
  response = { ...selected, versions: [{ version_id: version.id, percentage: 50 }] };
  await assert.rejects(() => adapter.activate(version.id), /did not confirm/);
  const incomplete = workerActivation({ workerId: "worker-1", scriptName: "example-worker" }, async (path) =>
    path.includes("?per_page=") ? Array.from({ length: 100 }, () => version) : { deployments: [] });
  assert.equal((await incomplete.inspect()).complete, false);
  const malformed = workerActivation({ workerId: "worker-1", scriptName: "example-worker" }, async () => ({}));
  await assert.rejects(() => malformed.inspect(), /Invalid Worker state/);
  const failing = workerActivation({ workerId: "worker-1", scriptName: "example-worker" }, async () => { throw new Error("uncertain transport"); });
  await assert.rejects(() => failing.activate(version.id), /uncertain transport/);
});
