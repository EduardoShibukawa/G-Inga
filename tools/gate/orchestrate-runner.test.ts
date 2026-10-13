import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import {
  parseTicketsInput,
  partitionTicketsIntoWaves,
  partitionWaves,
  evaluateTicketBudget,
  evaluateBatchBudget,
  executeWorker,
  executeWave,
  runOrchestrationBatch,
  runCli,
  type OrchestrationTicket,
} from "./orchestrate-runner";

function setupTempRepo(): string {
  const repoDir = mkdtempSync(join(tmpdir(), "g-inga-orch-repo-"));
  spawnSync("git", ["init", "-b", "main"], { cwd: repoDir });
  spawnSync("git", ["config", "user.name", "Test User"], { cwd: repoDir });
  spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: repoDir });

  writeFileSync(join(repoDir, "README.md"), "# Orchestration Test Repo\n");
  spawnSync("git", ["add", "README.md"], { cwd: repoDir });
  spawnSync("git", ["commit", "-m", "Initial commit"], { cwd: repoDir });

  return repoDir;
}

describe("Autonomous Orchestration Wave Runner", () => {
  describe("Input Parsing (parseTicketsInput)", () => {
    it("parses an array of ticket objects with scopes and commands", () => {
      const input = [
        { id: "T1", scope: ["src/a.ts"], command: "echo 1" },
        { id: "T2", scope: ["src/b.ts"], tokens: 1200 },
      ];
      const tickets = parseTicketsInput(input);
      expect(tickets.length).toBe(2);
      expect(tickets[0].id).toBe("T1");
      expect(tickets[0].scope).toEqual(["src/a.ts"]);
      expect(tickets[0].command).toBe("echo 1");
      expect(tickets[1].id).toBe("T2");
      expect(tickets[1].tokens).toBe(1200);
    });

    it("parses a dictionary of declared scopes", () => {
      const input = {
        "worker-1": ["tools/gate/"],
        "worker-2": ["tools/eval/"],
      };
      const tickets = parseTicketsInput(input);
      expect(tickets.length).toBe(2);
      expect(tickets.find((t) => t.id === "worker-1")?.scope).toEqual(["tools/gate/"]);
      expect(tickets.find((t) => t.id === "worker-2")?.scope).toEqual(["tools/eval/"]);
    });

    it("parses a dictionary of detailed ticket objects", () => {
      const input = {
        "worker-1": { scope: ["file1.txt"], command: "echo w1", tokens: 500 },
        "worker-2": { scope: ["file2.txt"], branch: "feat/w2" },
      };
      const tickets = parseTicketsInput(input);
      expect(tickets.length).toBe(2);
      const w1 = tickets.find((t) => t.id === "worker-1");
      expect(w1?.scope).toEqual(["file1.txt"]);
      expect(w1?.command).toBe("echo w1");
      expect(w1?.tokens).toBe(500);
      const w2 = tickets.find((t) => t.id === "worker-2");
      expect(w2?.branch).toBe("feat/w2");
    });

    it("parses a wrapped { tickets: [...] } object", () => {
      const input = {
        tickets: [
          { id: "T1", scope: ["a/"] },
          { id: "T2", scope: ["b/"] },
        ],
      };
      const tickets = parseTicketsInput(input);
      expect(tickets.length).toBe(2);
      expect(tickets[0].id).toBe("T1");
    });

    it("parses JSON string input", () => {
      const json = JSON.stringify([{ id: "T1", scope: ["file.ts"] }]);
      const tickets = parseTicketsInput(json);
      expect(tickets.length).toBe(1);
      expect(tickets[0].id).toBe("T1");
    });

    it("reads and parses JSON from file path", () => {
      const tmpFile = join(tmpdir(), `orch-batch-${Date.now()}.json`);
      writeFileSync(tmpFile, JSON.stringify({ w1: ["a/"], w2: ["b/"] }));
      try {
        const tickets = parseTicketsInput(tmpFile);
        expect(tickets.length).toBe(2);
      } finally {
        if (existsSync(tmpFile)) rmSync(tmpFile);
      }
    });

    it("throws helpful error on invalid JSON string", () => {
      expect(() => parseTicketsInput("{ not valid json")).toThrow("Failed to parse tickets JSON string");
    });
  });

  describe("Wave Partitioning (partitionTicketsIntoWaves & partitionWaves)", () => {
    it("partitions mutually disjoint tickets into a single wave", () => {
      const tickets: OrchestrationTicket[] = [
        { id: "T1", scope: ["tools/gate/"] },
        { id: "T2", scope: ["tools/eval/"] },
        { id: "T3", scope: ["docs/"] },
      ];
      const waves = partitionTicketsIntoWaves(tickets);
      expect(waves.length).toBe(1);
      expect(waves[0].length).toBe(3);
      expect(waves[0].map((t) => t.id).sort()).toEqual(["T1", "T2", "T3"]);
    });

    it("partitions tickets with exact file collisions into sequential waves", () => {
      const tickets: OrchestrationTicket[] = [
        { id: "T1", scope: ["README.md"] },
        { id: "T2", scope: ["README.md"] },
      ];
      const waves = partitionTicketsIntoWaves(tickets);
      expect(waves.length).toBe(2);
      expect(waves[0].map((t) => t.id)).toEqual(["T1"]);
      expect(waves[1].map((t) => t.id)).toEqual(["T2"]);
    });

    it("partitions directory prefix collisions into sequential waves", () => {
      const tickets: OrchestrationTicket[] = [
        { id: "T1", scope: ["tools/gate/"] },
        { id: "T2", scope: ["tools/gate/runner.ts"] },
      ];
      const waves = partitionTicketsIntoWaves(tickets);
      expect(waves.length).toBe(2);
      expect(waves[0].map((t) => t.id)).toEqual(["T1"]);
      expect(waves[1].map((t) => t.id)).toEqual(["T2"]);
    });

    it("handles cascading multi-ticket collisions into minimal waves", () => {
      const tickets: OrchestrationTicket[] = [
        { id: "T1", scope: ["shared/file.ts"] },
        { id: "T2", scope: ["shared/file.ts"] },
        { id: "T3", scope: ["disjoint/other.ts"] }, // Can run in Wave 1 with T1
        { id: "T4", scope: ["shared/file.ts"] },    // Must go to Wave 3
      ];
      const waves = partitionTicketsIntoWaves(tickets);
      expect(waves.length).toBe(3);
      // Wave 1 has T1 and T3
      expect(waves[0].map((t) => t.id)).toEqual(["T1", "T3"]);
      // Wave 2 has T2
      expect(waves[1].map((t) => t.id)).toEqual(["T2"]);
      // Wave 3 has T4
      expect(waves[2].map((t) => t.id)).toEqual(["T4"]);
    });
  });

  describe("Token Budget Guardrail Integration", () => {
    it("evaluates ticket within standard budget (< 20,000 tokens) as PASS", () => {
      const ticket: OrchestrationTicket = { id: "T1", scope: ["a/"], tokens: 15000 };
      const evalResult = evaluateTicketBudget(ticket, "standard", true);
      expect(evalResult.verdict).toBe("pass");
      expect(evalResult.budget_ceiling).toBe(25000);
      expect(evalResult.budget_usage_pct).toBe(60);
    });

    it("evaluates ticket in warning zone (>= 80% ceiling) as WARN", () => {
      const ticket: OrchestrationTicket = { id: "T1", scope: ["a/"], tokens: 21000 };
      const evalResult = evaluateTicketBudget(ticket, "standard", true);
      expect(evalResult.verdict).toBe("warn");
      expect(evalResult.budget_usage_pct).toBe(84);
    });

    it("evaluates ticket exceeding hard ceiling (> 25,000 tokens) as FAIL", () => {
      const ticket: OrchestrationTicket = { id: "T1", scope: ["a/"], tokens: 26000 };
      const evalResult = evaluateTicketBudget(ticket, "standard", true);
      expect(evalResult.verdict).toBe("fail");
      expect(evalResult.reason).toContain("exceeded standard hard ceiling");
    });

    it("evaluates light ceremony tier (< 5,000 ceiling)", () => {
      const ticket: OrchestrationTicket = { id: "T1", scope: ["a/"], tokens: 4500 };
      const evalResult = evaluateTicketBudget(ticket, "light", true);
      expect(evalResult.verdict).toBe("warn"); // 4500 / 5000 = 90% >= 80%

      const ticketOver: OrchestrationTicket = { id: "T2", scope: ["b/"], tokens: 5500 };
      const evalOver = evaluateTicketBudget(ticketOver, "light", true);
      expect(evalOver.verdict).toBe("fail");
    });

    it("evaluates custom maxTokens override ceiling for batch", () => {
      const batchEval = evaluateBatchBudget(12000, "standard", true, 10000);
      expect(batchEval.verdict).toBe("fail");
      expect(batchEval.budget_ceiling).toBe(10000);
      expect(batchEval.reason).toContain("exceeded custom limit");
    });

    it("detects unproductive loops in transcript telemetry and triggers FAIL", () => {
      const transcriptLines = [
        JSON.stringify({ step_index: 1, tool_calls: [{ name: "run_command", args: { CommandLine: "bun test" } }] }),
        JSON.stringify({ step_index: 2, tool_calls: [{ name: "run_command", args: { CommandLine: "bun test" } }] }),
        JSON.stringify({ step_index: 3, tool_calls: [{ name: "run_command", args: { CommandLine: "bun test" } }] }),
      ];
      const ticket: OrchestrationTicket = { id: "T1", scope: ["a/"], transcriptLines };
      const evalResult = evaluateTicketBudget(ticket, "standard", true);
      expect(evalResult.verdict).toBe("fail");
      expect(evalResult.loop_detection.detected).toBe(true);
      expect(evalResult.reason).toContain("Unproductive loop detected");
    });
  });

  describe("Simulated & Dry-Run Execution", () => {
    it("simulates empty batch cleanly", async () => {
      const result = await runOrchestrationBatch({ tickets: [], dryRun: true });
      expect(result.success).toBe(true);
      expect(result.totalTickets).toBe(0);
      expect(result.waves.length).toBe(0);
    });

    it("executes multi-wave batch in dry-run mode without creating worktrees", async () => {
      const tickets: OrchestrationTicket[] = [
        { id: "T1", scope: ["shared/file.ts"], tokens: 2000 },
        { id: "T2", scope: ["shared/file.ts"], tokens: 3000 },
        { id: "T3", scope: ["disjoint/other.ts"], tokens: 4000 },
      ];
      const result = await runOrchestrationBatch({ tickets, dryRun: true });

      expect(result.success).toBe(true);
      expect(result.totalTickets).toBe(3);
      expect(result.waves.length).toBe(2);
      expect(result.waveResults.length).toBe(2);
      expect(result.totalTokens).toBe(9000);
      expect(result.tokenEvaluation.verdict).toBe("pass");
      expect(result.summary).toContain("PASS");
    });
  });

  describe("Real Worktree Concurrency & Execution", () => {
    let repoDir: string;

    beforeEach(() => {
      repoDir = setupTempRepo();
    });

    afterEach(() => {
      if (existsSync(repoDir)) {
        rmSync(repoDir, { recursive: true, force: true });
      }
    });

    it("executes concurrent wave workers in isolated worktrees without collisions", async () => {
      const tickets: OrchestrationTicket[] = [
        {
          id: "worker-A",
          scope: ["fileA.txt"],
          command: "echo 'hello A' > fileA.txt && git add fileA.txt",
          tokens: 1500,
        },
        {
          id: "worker-B",
          scope: ["fileB.txt"],
          command: "echo 'hello B' > fileB.txt && git add fileB.txt",
          tokens: 2500,
        },
      ];

      const result = await runOrchestrationBatch({
        tickets,
        repoDir,
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(result.waves.length).toBe(1);
      expect(result.waveResults[0].workers.length).toBe(2);

      const workerA = result.waveResults[0].workers.find((w) => w.ticketId === "worker-A");
      const workerB = result.waveResults[0].workers.find((w) => w.ticketId === "worker-B");

      expect(workerA?.success).toBe(true);
      expect(workerA?.exitCode).toBe(0);
      expect(workerA?.setupTimeMs).toBeDefined();
      expect(workerA?.setupTimeMs!).toBeLessThan(500);
      expect(workerA?.diff).toContain("fileA.txt");

      expect(workerB?.success).toBe(true);
      expect(workerB?.exitCode).toBe(0);
      expect(workerB?.setupTimeMs).toBeDefined();
      expect(workerB?.setupTimeMs!).toBeLessThan(500);
      expect(workerB?.diff).toContain("fileB.txt");

      expect(result.totalTokens).toBe(4000);
      expect(result.tokenEvaluation.verdict).toBe("pass");
    });

    it("handles failing worker commands and aborts subsequent waves", async () => {
      const tickets: OrchestrationTicket[] = [
        // Wave 1: T1 fails
        {
          id: "T1",
          scope: ["fileA.txt"],
          command: "sh -c 'exit 42'",
        },
        // Wave 2: T2 should not be executed due to wave 1 failure
        {
          id: "T2",
          scope: ["fileA.txt"],
          command: "echo 'wave 2'",
        },
      ];

      const result = await runOrchestrationBatch({
        tickets,
        repoDir,
        dryRun: false,
      });

      expect(result.success).toBe(false);
      expect(result.waveResults.length).toBe(1); // Only wave 1 was executed
      expect(result.waveResults[0].success).toBe(false);
      expect(result.waveResults[0].workers[0].exitCode).toBe(42);
    });
  });

  describe("CLI Execution & Flags", () => {
    it("prints help and returns code 0 with --help flag", async () => {
      const code = await runCli(["--help"]);
      expect(code).toBe(0);
    });

    it("returns code 1 when --batch is missing", async () => {
      const code = await runCli([]);
      expect(code).toBe(1);
    });

    it("runs dry-run batch from JSON string argument and returns code 0", async () => {
      const batchJson = JSON.stringify({
        w1: ["src/a.ts"],
        w2: ["src/b.ts"],
      });
      const code = await runCli(["--batch", batchJson, "--dry-run"]);
      expect(code).toBe(0);
    });

    it("runs dry-run batch from JSON file argument", async () => {
      const tmpFile = join(tmpdir(), `cli-batch-${Date.now()}.json`);
      writeFileSync(
        tmpFile,
        JSON.stringify([
          { id: "w1", scope: ["dir1/"], tokens: 1000 },
          { id: "w2", scope: ["dir2/"], tokens: 2000 },
        ])
      );
      try {
        const code = await runCli(["--batch", tmpFile, "--dry-run"]);
        expect(code).toBe(0);
      } finally {
        if (existsSync(tmpFile)) rmSync(tmpFile);
      }
    });

    it("returns code 1 when ceremony token budget hard ceiling is exceeded", async () => {
      const batchJson = JSON.stringify([
        { id: "w1", scope: ["dir1/"], tokens: 6000 },
      ]);
      // light ceiling is 5000 tokens
      const code = await runCli(["--batch", batchJson, "--ceremony", "light", "--dry-run"]);
      expect(code).toBe(1);
    });
  });
});
