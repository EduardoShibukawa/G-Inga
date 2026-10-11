// Types for manifest.mjs (plain ESM so Node runs it without a build step).
export interface Manifest {
  release: string;
  commit: string;
  files: Record<string, string>;
}
export function generateManifest(root?: string): Manifest;
export function checkManifest(root?: string): { status: "pass" | "fail" | "blocked"; findings: string[] };
