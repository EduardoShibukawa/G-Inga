import { existsSync, readdirSync } from "node:fs";
import { fences, type MdFile } from "../lib/markdown.ts";
import { result, type CheckResult } from "../lib/report.ts";

/**
 * Renders every ```mermaid block to SVG with the official renderer (@mermaid-js/mermaid-cli)
 * in a headless Chromium. A render failure is `fail`; no browser available is `blocked`.
 */
export async function mermaid(files: MdFile[]): Promise<CheckResult> {
  const blocks = files.flatMap((f) => fences(f.lines).filter((b) => b.lang === "mermaid").map((b) => ({ ...b, path: f.path })));
  if (blocks.length === 0) return result("mermaid", [], "no diagrams");
  const executablePath = findBrowser();
  if (!executablePath)
    return result("mermaid", [], `${blocks.length} diagrams, none rendered`, {
      blocked: ["no Chromium/Chrome found; set MERMAID_BROWSER to its path (see docs/development.md)"],
    });

  const [{ default: puppeteer }, { renderMermaid }] = await Promise.all([import("puppeteer"), import("@mermaid-js/mermaid-cli")]);
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
  } catch (e) {
    return result("mermaid", [], `${blocks.length} diagrams, none rendered`, { blocked: [`browser failed to start (${executablePath}): ${(e as Error).message.split("\n")[0]}`] });
  }
  const findings: string[] = [];
  try {
    for (const b of blocks) {
      try {
        const { data } = await renderMermaid(browser, b.body, "svg");
        if (!new TextDecoder().decode(data).includes("<svg")) findings.push(`${b.path}:${b.line} renderer returned no SVG`);
      } catch (e) {
        findings.push(`${b.path}:${b.line} ${(e as Error).message.split("\n").slice(0, 3).join(" ")}`);
      }
    }
  } finally {
    await browser.close();
  }
  return result("mermaid", findings, `${blocks.length} diagrams rendered to SVG, ${findings.length} failed`);
}

export function findBrowser(): string | undefined {
  const fromEnv = process.env.MERMAID_BROWSER ?? process.env.PUPPETEER_EXECUTABLE_PATH;
  if (fromEnv) return existsSync(fromEnv) ? fromEnv : undefined;
  const candidates: string[] = [];
  const pw = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (pw && existsSync(pw))
    for (const d of readdirSync(pw).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse()) candidates.push(`${pw}/${d}/chrome-linux/chrome`);
  candidates.push(
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  );
  return candidates.find((c) => existsSync(c));
}
