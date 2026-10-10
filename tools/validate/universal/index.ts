/** Checks that apply to any directory of Markdown documents. None assumes frontmatter or a document schema. */
import type { Check } from "../lib/check.ts";
import { fences } from "../lib/markdown.ts";
import { localLinks } from "./localLinks.ts";
import { markdownLint } from "./markdownLint.ts";
import { mermaid } from "./mermaid.ts";

const hasMarkdown = (ctx: { files: unknown[] }) => ctx.files.length > 0 || "no Markdown files";

export const universalChecks: Check[] = [
  { name: "markdown-lint", layer: "universal", applies: hasMarkdown, run: (ctx) => markdownLint(ctx.root, ctx.files) },
  { name: "local-links", layer: "universal", applies: hasMarkdown, run: (ctx) => localLinks(ctx.root, ctx.files) },
  {
    name: "mermaid",
    layer: "universal",
    applies: (ctx) => ctx.files.some((f) => fences(f.lines).some((b) => b.lang === "mermaid")) || "no Mermaid diagrams",
    run: (ctx) => mermaid(ctx.files),
  },
];
