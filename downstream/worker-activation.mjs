const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const nonempty = (value) => typeof value === "string" && value.length > 0;
const deployment = (value) => record(value) && nonempty(value.id) && Array.isArray(value.versions) &&
  value.versions.every((v) => record(v) && nonempty(v.version_id) && Number.isFinite(v.percentage));

// request is an account-scoped authenticated client supplied by the consuming project.
// It returns the decoded API result, throws on transport/API failure, and never logs credentials.
export function workerActivation({ workerId, scriptName }, request) {
  if (!nonempty(workerId) || !nonempty(scriptName) || typeof request !== "function")
    throw new Error("Explicit Worker identity and request client required");
  const path = "/workers/scripts/" + encodeURIComponent(scriptName) + "/deployments";
  return {
    async inspect() {
      const [versions, deployments] = await Promise.all([
        request("/workers/workers/" + encodeURIComponent(workerId) + "/versions?per_page=100"),
        request(path),
      ]);
      if (!Array.isArray(versions) || versions.some((v) => !record(v) || !nonempty(v.id) ||
        !Number.isInteger(v.number) || !nonempty(v.source) || (v.annotations !== undefined &&
        (!record(v.annotations) || Object.values(v.annotations).some((x) => typeof x !== "string")))) ||
        !record(deployments) || !Array.isArray(deployments.deployments) ||
        !deployments.deployments.every(deployment)) throw new Error("Invalid Worker state response");
      return { versions: versions.map((v) => ({ ...v, annotations: v.annotations ?? {} })),
        complete: versions.length < 100, active: deployments.deployments[0] ?? null };
    },
    async activate(id) {
      if (!nonempty(id)) throw new Error("Version identity required");
      const result = await request(path, "POST", {
        strategy: "percentage", versions: [{ version_id: id, percentage: 100 }],
      });
      if (!deployment(result) || result.versions.length !== 1 || result.versions[0].version_id !== id ||
        result.versions[0].percentage !== 100) throw new Error("Activation response did not confirm the requested version");
      return result;
    },
  };
}
