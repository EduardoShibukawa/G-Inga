// Pins the plugin's skill and command registration (spec 2026-10-14-work-user-invoked SC4, ADR 0010 item 4).
// OpenCode's `skill` tool loads a registered skill by id whatever its `autoinvoke`, so commands that
// name their skill id keep working with `autoinvoke: false`.
import { describe, expect, test } from "bun:test";
import plugin from "./index.ts";

type Skill = { id: string; autoinvoke: boolean; path: string };
type Command = { name: string; execute(input: { sessionID: string; prompt: { text?: string } }): Promise<void> };

async function setup() {
  const skills: Skill[] = [];
  const commands: Command[] = [];
  const prompts: Array<Record<string, unknown>> = [];
  await plugin.setup({
    skill: { transform: async (cb) => cb({ get: () => undefined, add: (s) => skills.push(s) }) },
    command: { transform: async (cb) => cb({ add: (c) => commands.push(c) }) },
    session: { prompt: async (input) => void prompts.push(input) },
  });
  return { skills, commands, prompts };
}

describe("opencode plugin", () => {
  test("registers every G-Ingá skill as user-invoked (autoinvoke false)", async () => {
    const { skills } = await setup();
    expect(skills.map((s) => s.id).sort()).toEqual(["drive", "orchestrate", "work"]);
    for (const s of skills) expect(`${s.id}: ${s.autoinvoke}`).toBe(`${s.id}: false`);
  });

  test("each command prompt names its skill id", async () => {
    const { commands, prompts } = await setup();
    expect(commands.map((c) => c.name).sort()).toEqual(["drive", "orchestrate", "work"]);
    for (const c of commands) {
      await c.execute({ sessionID: "s1", prompt: { text: "do it" } });
      const text = String(prompts.at(-1)?.text);
      expect(text).toContain(`Load the \`${c.name}\` skill`);
      expect(text.endsWith("do it")).toBe(true);
    }
  });
});
