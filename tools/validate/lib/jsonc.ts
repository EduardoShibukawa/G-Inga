/** JSON with whole-line `//` comments, which is all `.markdownlint.jsonc` uses. */
export function parse(text: string): Record<string, unknown> {
  return JSON.parse(
    text
      .split("\n")
      .filter((l) => !/^\s*\/\//.test(l))
      .join("\n"),
  );
}
