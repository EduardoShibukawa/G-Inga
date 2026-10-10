import { isExternal, links, type MdFile } from "../lib/markdown.ts";
import { result, type CheckResult } from "../lib/report.ts";

/**
 * External URL availability. Separate from `validate` because it depends on the network.
 * Only 404 and 410 count as broken; network errors, timeouts, 401/403/429 and 5xx are `blocked`.
 */
export async function externalLinks(files: MdFile[], timeoutMs = 15000): Promise<CheckResult> {
  const where = new Map<string, string[]>();
  for (const f of files)
    for (const l of links(f.lines))
      if (isExternal(l.target) && /^https?:/i.test(l.target)) where.set(l.target, [...(where.get(l.target) ?? []), `${f.path}:${l.line}`]);

  const findings: string[] = [];
  const blocked: string[] = [];
  const urls = [...where.keys()];
  const queue = [...urls];
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      const verdict = await probe(url, timeoutMs);
      const refs = where.get(url)!.join(", ");
      if (verdict.kind === "broken") findings.push(`${url} → ${verdict.detail} (${refs})`);
      else if (verdict.kind === "blocked") blocked.push(`${url} → ${verdict.detail} (${refs})`);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return result("external-links", findings, `${urls.length} URLs, ${findings.length} broken, ${blocked.length} unreachable`, { blocked });
}

async function probe(url: string, timeoutMs: number): Promise<{ kind: "ok" | "broken" | "blocked"; detail: string }> {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return { kind: "ok", detail: String(res.status) };
      if (res.status === 404 || res.status === 410) {
        if (method === "GET") return { kind: "broken", detail: `HTTP ${res.status}` };
        continue; // some servers reject HEAD with 404; confirm with GET
      }
      if (method === "HEAD" && res.status === 405) continue;
      return { kind: "blocked", detail: `HTTP ${res.status}` };
    } catch (e) {
      return { kind: "blocked", detail: `network: ${(e as Error).message}` };
    }
  }
  return { kind: "blocked", detail: "no conclusive response" };
}
