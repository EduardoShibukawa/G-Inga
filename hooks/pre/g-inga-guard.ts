// OMP hook (ADR 0009 commit gate): OMP ignores Claude `permissions.deny`, so this hook enforces the
// `Bash(...)` entries of the project's `.claude/settings.json` on `bash` and `eval` tool calls.
// Claude Code never loads this folder; it reads only `hooks/hooks.json`.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface DenyRule {
  source: string;
  regex: RegExp;
}

export interface ToolCallBlock {
  block: true;
  reason: string;
}

// Structural subset of the OMP extension API used here. OMP packages are not imported.
export interface OmpHookApi {
  on(
    name: "tool_call",
    handler: (event: unknown, ctx: unknown) => Promise<ToolCallBlock | undefined>,
  ): void;
}

const BASH_RULE = /^Bash\((.*)\)$/s;

// Glob -> anchored regex: escape every metacharacter except `*`, which becomes `.*`.
function globToRegex(glob: string): RegExp {
  const escaped = glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "s");
}

// Reads one property of an untyped value without a cast.
function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null && key in value ? value[key] : undefined;
}

// "Bash(git commit -n *)" -> { source: "Bash(git commit -n *)", regex: /^git commit -n .*$/s }
export function parseDenyRules(settingsJson: string): DenyRule[] {
  let deny: unknown;
  try {
    deny = field(field(JSON.parse(settingsJson), "permissions"), "deny");
  } catch {
    return [];
  }
  if (!Array.isArray(deny)) return [];
  const rules: DenyRule[] = [];
  for (const entry of deny) {
    if (typeof entry !== "string") continue;
    const m = BASH_RULE.exec(entry);
    if (m) rules.push({ source: entry, regex: globToRegex(m[1]) });
  }
  return rules;
}

// Collapse whitespace; split on &&, ||, ;, |, newline; test every trimmed segment AND the whole command.
export function matchBash(command: string, rules: DenyRule[]): DenyRule | undefined {
  const normalized = command.replace(/\s+/g, " ").trim();
  const candidates = [
    normalized,
    ...normalized.split(/&&|\|\||;|\||\n/).map((s) => s.trim()).filter((s) => s.length > 0),
  ];
  return rules.find((rule) => candidates.some((c) => rule.regex.test(c)));
}

// Each line: trim, drop one leading "!", then matchBash.
export function matchEval(code: string, rules: DenyRule[]): DenyRule | undefined {
  for (const line of code.split(/\r?\n/)) {
    let text = line.trim();
    if (text.startsWith("!")) text = text.slice(1).trim();
    const hit = matchBash(text, rules);
    if (hit) return hit;
  }
  return undefined;
}

const cache = new Map<string, DenyRule[]>();
export function loadRules(cwd: string): DenyRule[] {
  let rules = cache.get(cwd);
  if (!rules) {
    try {
      rules = parseDenyRules(readFileSync(join(cwd, ".claude", "settings.json"), "utf8"));
    } catch {
      rules = [];
    }
    cache.set(cwd, rules);
  }
  return rules;
}

export default function gIngaGuard(pi: OmpHookApi): void {
  pi.on("tool_call", async (event, ctx) => {
    try {
      const toolName = field(event, "toolName");
      const input = field(event, "input");
      const cwd = field(ctx, "cwd");
      const rules = loadRules(typeof cwd === "string" ? cwd : process.cwd());
      const command = field(input, "command");
      const code = field(input, "code");
      const hit =
        toolName === "bash" && typeof command === "string" ? matchBash(command, rules)
        : toolName === "eval" && typeof code === "string" ? matchEval(code, rules)
        : undefined;
      if (hit) {
        return { block: true, reason: `G-Ingá: blocked by .claude/settings.json deny rule ${hit.source} (ADR 0009 commit gate)` };
      }
      return undefined;
    } catch {
      return undefined;
    }
  });
}
