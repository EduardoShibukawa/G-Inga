// Types for contract-copy.mjs (plain ESM so Node runs it without a build step).
export const CONTRACT_SOURCE: string;
export const CONTRACT_COPY: string;
export const LINK_PREFIX: string;
export const HEADER: string;
export function renderContractCopy(canonical: string): string;
export function checkContractCopy(root?: string): string[];
export function writeContractCopy(root?: string): void;
