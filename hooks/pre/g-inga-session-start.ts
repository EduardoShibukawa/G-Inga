import { join } from "node:path";
import { runSessionStartCheck } from "../session-start.mjs";

// Minimal local shape of the OMP extension API used here (no OMP package import).
export interface OmpContext {
  cwd?: string;
  ui?: { notify?: (message: string, level: string) => void };
}

export interface SessionStartMessageResult {
  message: { customType: string; content: string; display: boolean };
}

export type OmpHandler = (event: unknown, ctx?: OmpContext) => Promise<SessionStartMessageResult | undefined>;

export interface OmpExtensionApi {
  on(name: "session_start" | "before_agent_start", handler: OmpHandler): void;
}

// Only the local Git-hook check applies to OMP: skip the Claude plugin staleness check and the network.
export function ompStartupCheck(cwd: string) {
  return runSessionStartCheck({ cwd, installedPluginsFile: join(cwd, ".omp", ".no-claude-plugin-registry"), pluginRoot: "" });
}

export default function gIngaSessionStart(pi: OmpExtensionApi): void {
  let pending: string[] = [];
  pi.on("session_start", async (_event, ctx) => {
    pending = ompStartupCheck(ctx?.cwd ?? process.cwd()).warnings;
    for (const w of pending) ctx?.ui?.notify?.(w, "warning");
    return undefined;
  });
  pi.on("before_agent_start", async () => {
    if (pending.length === 0) return undefined;
    const content = pending.join("\n");
    pending = [];
    return { message: { customType: "g-inga.session-start", content, display: true } };
  });
}
