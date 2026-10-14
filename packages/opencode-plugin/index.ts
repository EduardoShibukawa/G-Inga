/**
 * G-Ingá OpenCode plugin — distribution surface for the harness (not the product runtime).
 *
 * Exposes the harness to OpenCode:
 *   - registers the `work`, `drive` and `orchestrate` skills from the canonical
 *     `.claude/skills/` bundle shipped in this repository; and
 *   - registers the `/work`, `/drive` and `/orchestrate` slash commands that open them.
 *
 * Install globally (OpenCode resolves package plugins itself; this repository's
 * development tooling is not involved):
 *
 *   opencode plugin add github:EduardoShibukawa/G-Inga
 *
 * The entry is intentionally dependency-free: OpenCode supplies `ctx`, and its Bun
 * runtime executes this TypeScript file directly. A Git install therefore resolves no
 * dependencies and cannot be affected by the repository's development-only
 * devDependencies.
 *
 * The skills are repository-bound: their bodies reference `tools/validate/`, `docs/` and
 * `.claude/skills/` relative to a checkout, so they function where the G-Ingá bundle is
 * present. The commands always work; the deep references resolve only where the bundle
 * exists.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// packages/opencode-plugin/index.ts -> repository root
const REPO_ROOT = resolve(HERE, "..", "..");

interface SkillSpec {
  id: string;
  /** Prompt opened by the matching slash command. */
  command: string;
}

const SKILLS: SkillSpec[] = [
  {
    id: "work",
    command: "Start a G-Ingá `/work` session for the request below. Load the `work` skill and follow it.",
  },
  {
    id: "drive",
    command: "Run the G-Ingá `/drive` continuous backlog driver. Load the `drive` skill and follow it.",
  },
  {
    id: "orchestrate",
    command: "Run the G-Ingá `/orchestrate` OODA harness. Load the `orchestrate` skill and follow it.",
  },
  {
    id: "sharpen",
    command:
      "Run the G-Ingá `/sharpen` question-rounds procedure. Load the `sharpen` skill and follow `.agents/skills/work/references/question-rounds.md` in standalone mode.",
  },
];

const SKILL_ROOTS = [
  join(REPO_ROOT, ".claude", "skills"),
  join(REPO_ROOT, ".opencode", "skills"),
  join(REPO_ROOT, ".agents", "skills"),
];

interface SkillInfo {
  id: string;
  name: string;
  description: string;
  autoinvoke: boolean;
  path: string;
  content: string;
}

interface SkillEditor {
  get(id: string): SkillInfo | undefined;
  add(skill: SkillInfo): void;
}

interface CommandInvocation {
  sessionID: string;
  prompt: { text?: string } & Record<string, unknown>;
  delivery?: unknown;
}

interface CommandEditor {
  add(definition: {
    name: string;
    description: string;
    execute(input: CommandInvocation): Promise<void>;
  }): void;
}

interface PluginContext {
  skill: { transform(callback: (editor: SkillEditor) => void): Promise<unknown> };
  command: { transform(callback: (editor: CommandEditor) => void): Promise<unknown> };
  session: { prompt(input: Record<string, unknown>): Promise<unknown> };
}

/** Minimal front matter reader: the bundle only uses flat `key: value` lines. */
function parseFrontMatter(source: string): { data: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { data: {}, body: source };
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(line);
    if (field) data[field[1]] = field[2].replace(/^["']|["']$/g, "").trim();
  }
  return { data, body: source.slice(match[0].length) };
}

function skillFile(id: string): string | undefined {
  for (const root of SKILL_ROOTS) {
    const candidate = join(root, id, "SKILL.md");
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

async function loadSkill(spec: SkillSpec): Promise<SkillInfo | undefined> {
  const file = skillFile(spec.id);
  if (!file) return undefined;
  const { data, body } = parseFrontMatter(await readFile(file, "utf8"));
  return {
    id: spec.id,
    name: data.name || spec.id,
    description: data.description || `G-Ingá ${spec.id} skill.`,
    autoinvoke: data["disable-model-invocation"] !== "true",
    path: file,
    content: body,
  };
}

export default {
  id: "g-inga",
  async setup(ctx: PluginContext): Promise<void> {
    const loaded: SkillInfo[] = [];
    for (const spec of SKILLS) {
      const skill = await loadSkill(spec);
      if (skill) loaded.push(skill);
    }

    if (loaded.length > 0) {
      await ctx.skill.transform((editor) => {
        for (const skill of loaded) {
          // A project that ships the bundle already exposes them; leave those in charge.
          if (!editor.get(skill.id)) editor.add(skill);
        }
      });
    }

    await ctx.command.transform((editor) => {
      for (const spec of SKILLS) {
        editor.add({
          name: spec.id,
          description: `G-Ingá: ${spec.id}`,
          execute: async ({ sessionID, prompt, delivery }) => {
            const request = prompt.text?.trim();
            const text = request ? `${spec.command}\n\n${request}` : spec.command;
            await ctx.session.prompt({ ...prompt, sessionID, text, delivery });
          },
        });
      }
    });
  },
};
