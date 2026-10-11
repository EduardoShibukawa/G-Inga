// Types for update.mjs (plain ESM so Node runs it without a build step).
export const WORK_DIR: string;
export class UpdateError extends Error {
  code: number;
  constructor(message: string, code?: number);
}
export function inBundleScope(relPath: string): boolean;
export interface Journal {
  steps: { rel: string; backup: boolean; installed: boolean }[];
  createdDirs: string[];
}
export function rollback(target: string, journal: Journal): void;
export function updateBundle(
  sourceRoot: string,
  targetRoot: string,
  opts?: { fault?: (step: number, rel: string) => void; log?: (line: string) => void },
): { installed: string[]; removed: string[]; unchanged: number; recovered: string | undefined };
