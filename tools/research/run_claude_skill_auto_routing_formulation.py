#!/usr/bin/env python3
"""Runner for CLAUDE-SKILL-AUTO-ROUTING-FORMULATION.

Report: docs/research/claude-skill-auto-routing-formulation.md
Builds on: tools/research/run_claude_skill_multiturn_realistic_cache_control.py,
imported for the task-instance generator, the stream parser and the request
body summary; that runner in turn imports the factorial runner for the
SKILL.md sizes (unchanged, byte for byte), the CLI flags, the parent-session
variable stripping, the tracked and hash-checked fixture cleanup and the
multi-turn stream-json session driver.

Design (every session has exactly TURNS user turns):

    skill        S2K only (the ~2 KB SKILL.md of the earlier runs), fixed
    formulation  F1..F6: six wordings of the same turn-1 request
    instance     3 unique task instances per formulation (18 in all)
    route        E: "/work <formulation>"   N: "<formulation>" as written

Turns 2-5 are the earlier runs' compatible turns, identical in E and N and in
every formulation (instance data aside). A pair is E and N on the same task
instance, back to back. Pairs run in seeded random order; which route runs
first is balanced (9 E-first, 9 N-first), assigned at random.

Usage:
    python3 run_claude_skill_auto_routing_formulation.py FIXTURE_DIR OUTPUT_DIR
        [--plan smoke|matrix] [--seed N] [--budget-usd X] [--raw-bodies]
        [--reduce STEP ...] [--dry-run] [--analyze] [--instances]

FIXTURE_DIR must exist, be empty and sit outside any Git work tree. OUTPUT_DIR
must sit outside any Git work tree: it receives raw stream-json, optional raw
API bodies and summary.json (answer texts, session metadata). Never commit it.
"""

import argparse
import hashlib
import itertools
import json
import math
import random
import shutil
import statistics as st
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_claude_skill_multiturn_realistic_cache_control as rcc  # noqa: E402

base = rcc.base
SIZE = "S2K"
SKILL_MD = base.SKILL_MD[SIZE]  # unchanged from the earlier runs
SKILL_REL = base.SKILL_REL
PER_RUN_CAP_USD = base.PER_RUN_CAP_USD
DEFAULT_BUDGET_USD = 5.00
TURNS = 5
SEED = 20261013
E_PREFIX = "/work "

# --- Formulations (pre-registered, report §2) -----------------------------------
# {L} is the instance's ledger file. None names a skill, a tool, a slash command
# or an order of tool calls. All ask for the same thing: reconcile that ledger and
# report its checked total.
FORMULATIONS = {
    "F1": "Reconcile the ledger in {L} and report the checked total.",
    "F2": ("What I need back is a single figure: the checked total of the ledger "
           "in {L}, once it has been reconciled."),
    "F3": ("The ledger in {L} has not been reconciled yet. Reconcile it and report "
           "the checked total. Constraints: this is read-only, so do not change any "
           "file, and keep the reply to a few sentences."),
    "F4": ("Two objectives for the ledger in {L}: first, reconcile it; second, "
           "report its checked total."),
    "F5": ("Our routine for a ledger is to add up the signed amounts of all its "
           "entries and confirm the result as the checked total. Please do that "
           "for {L}."),
    "F6": ("hey, could you go over {L} and tell me what the ledger comes to once "
           "it's reconciled? just need the checked total"),
}
FORMS = list(FORMULATIONS)
INSTANCES_PER_FORM = 3
# Pre-registered reduction steps (report §4), applied in this order as needed.
REDUCE_STEPS = {"1": ("instances", 2), "2": ("forms", ["F1", "F3", "F5", "F6"])}
SMOKE = [("F3", "SMK1"), ("F6", "SMK2")]


def make_instance(iid, seed, form):
    inst = rcc.make_instance(iid, seed)
    turns = list(inst["turns"]["COMPAT"])
    turns[0] = FORMULATIONS[form].format(L=inst["ledger_rel"])
    inst["turns"] = turns
    # Only the ledger is needed; the notes file is kept so the fixture
    # directory looks as in the earlier runs.
    return inst


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def instance_record(inst):
    return {"iid": inst["iid"],
            "files": {k: {"bytes": len(v.encode()), "sha256": sha(v)[:12]}
                      for k, v in inst["files"].items()},
            "turn_chars": [len(t) for t in inst["turns"]],
            "turns_sha256": sha("\n".join(inst["turns"]))[:12]}


# --- Plan ----------------------------------------------------------------------

def build_plan(kind, seed, reduce):
    """List of pairs: (form, rep, iid, [routes in order])."""
    if kind == "smoke":
        return [(f, 1, iid, ["E", "N"] if i == 0 else ["N", "E"])
                for i, (f, iid) in enumerate(SMOKE)]
    forms, reps = list(FORMS), INSTANCES_PER_FORM
    for s in reduce:
        what, val = REDUCE_STEPS[s]
        if what == "instances":
            reps = val
        else:
            forms = list(val)
    rng = random.Random(seed)
    # The full design is drawn first and then cut, so a reduction keeps the
    # instance ids, orders and positions of the pairs it keeps.
    pairs = [(f, r, f"{f}-{r}") for f in FORMS for r in range(1, INSTANCES_PER_FORM + 1)]
    first = ["E"] * (len(pairs) // 2) + ["N"] * (len(pairs) - len(pairs) // 2)
    rng.shuffle(first)
    plan = [(f, r, iid, [x, "N" if x == "E" else "E"]) for (f, r, iid), x in zip(pairs, first)]
    rng.shuffle(plan)
    return [p for p in plan if p[0] in forms and p[1] <= reps]


# --- Classification and checks -------------------------------------------------

PATHS = {1: "seq", 2: "par", 3: "other", 4: "none", 5: "inconclusive"}


def classify(r):
    """Execution path of a session from its request/tool events (report §3).

    1 seq    turn 1: Skill call, then the first ledger Read in a later request
    2 par    turn 1: Skill call and a Read in the same request
    3 other  skill content reached another way: a Read before the Skill call,
             a Skill call only after turn 1, or a Read of SKILL.md
    4 none   no Skill call and no Read of SKILL.md in any turn
    5 inconclusive: failed or incomplete session, or a turn-1 Skill call with
             no Read in turn 1
    """
    if (r["exit_code"] != 0 or len(r["turns"]) != TURNS or not r["requests"]
            or any(t["is_error"] for t in r["turns"])):
        return 5
    tc = r["tool_calls"]
    skill_md = any(t["name"] == "Read" and t["file"] == "SKILL.md" for t in tc)
    sk_all = [t for t in tc if t["name"] == "Skill"]
    t1 = [t for t in tc if t["turn"] == 1]
    sk = [t["msg"] for t in t1 if t["name"] == "Skill"]
    rd = [t["msg"] for t in t1 if t["name"] == "Read" and t["file"] != "SKILL.md"]
    if not sk_all:
        return 3 if skill_md else 4
    if not sk:
        return 3  # Skill only after turn 1
    if skill_md:
        return 3
    if not rd:
        return 5
    if min(rd) < sk[0]:
        return 3
    return 2 if min(rd) == sk[0] else 1


def checks(answers, texts):
    """Per-turn string checks against the instance's known answers. Check 3
    accepts the count as a digit or as an English number word."""
    a = answers
    t = [x or "" for x in texts] + [""] * (TURNS - len(texts))
    norm = lambda s: s.replace(",", "").replace("−", "-")
    words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
             "nine", "ten"]
    n = int(a["neg_count"])
    count_ok = a["neg_count"] in t[2] or words[n] in t[2].lower()
    return [a["total"] in norm(t[0]),
            a["top_id"] in t[1],
            count_ok and a["neg_sum"].lstrip("-") in norm(t[2]),
            a["removed_total"] in norm(t[3]),
            all(i in t[4] for i in a["above_ids"])]


# --- Small statistics, no third-party packages -----------------------------------

def binom_cdf(k, n, p):
    return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k + 1))


def clopper_pearson(k, n, alpha=0.05):
    """Exact two-sided interval for a binomial proportion, by bisection."""
    if n == 0:
        return (0.0, 1.0)
    lower = 0.0
    if k > 0:  # P(X >= k | p) increases with p: find p where it equals alpha/2
        lo, hi = 0.0, 1.0
        for _ in range(60):
            mid = (lo + hi) / 2
            if 1 - binom_cdf(k - 1, n, mid) < alpha / 2:
                lo = mid
            else:
                hi = mid
        lower = (lo + hi) / 2
    upper = 1.0
    if k < n:  # P(X <= k | p) decreases with p: find p where it equals alpha/2
        lo, hi = 0.0, 1.0
        for _ in range(60):
            mid = (lo + hi) / 2
            if binom_cdf(k, n, mid) > alpha / 2:
                lo = mid
            else:
                hi = mid
        upper = (lo + hi) / 2
    return (lower, upper)


def chi2_stat(groups):
    """Pearson chi-square for a k x 2 table given as [(successes, n), ...]."""
    tot_s = sum(s for s, _ in groups)
    tot_n = sum(n for _, n in groups)
    if tot_n == 0 or tot_s in (0, tot_n):
        return 0.0
    p = tot_s / tot_n
    x = 0.0
    for s, n in groups:
        for obs, exp in ((s, n * p), (n - s, n * (1 - p))):
            x += (obs - exp) ** 2 / exp if exp else 0.0
    return x


def exact_table_test(groups):
    """Exact conditional (Freeman-Halton style) test of a k x 2 table with the
    margins fixed, using the chi-square statistic: the sum of the
    multivariate-hypergeometric probabilities of every table whose statistic
    is at least the observed one."""
    ns = [n for _, n in groups]
    total_s = sum(s for s, _ in groups)
    obs = chi2_stat(groups)
    denom = math.comb(sum(ns), total_s)
    pval = 0.0
    for combo in itertools.product(*[range(n + 1) for n in ns]):
        if sum(combo) != total_s:
            continue
        prob = math.prod(math.comb(n, s) for n, s in zip(ns, combo)) / denom
        if chi2_stat(list(zip(combo, ns))) >= obs - 1e-9:
            pval += prob
    return obs, min(pval, 1.0)


# --- Analysis --------------------------------------------------------------------

def analyze(summary):
    rows = [r for r in summary if r["plan"] == "matrix"]
    m1 = lambda r: r["requests"][0]["prompt_total"] if r["requests"] else None
    m1_cc = lambda r: r["requests"][0]["cache_creation"] if r["requests"] else None
    m1_cr = lambda r: r["requests"][0]["cache_read"] if r["requests"] else None
    cum = lambda r: sum(q["prompt_total"] for q in r["requests"])
    cum_in = lambda r: sum(q["input"] for q in r["requests"])
    out_tok = lambda r: sum(t["usage"]["output_tokens"] or 0 for t in r["turns"])
    usd = lambda r: r["list_cost_usd_estimate"] or 0
    reqs = lambda r: len(r["requests"])
    reqs_t1 = lambda r: sum(q["turn"] == 1 for q in r["requests"])
    ms = lambda r: sum(t["duration_ms"] or 0 for t in r["turns"])
    ok = lambda r: sum(checks(r["answers"], [t["answer"] for t in r["turns"]]))

    def stats(v, nd=None):
        v = [x for x in v if x is not None]
        if not v:
            return "-"
        f = (lambda x: f"{x:.{nd}f}") if nd else (lambda x: f"{x:g}")
        return f"{f(st.median(v))} [{f(min(v))}..{f(max(v))}]"

    bad = [r["seq"] for r in rows if r["exit_code"] != 0 or len(r["turns"]) != TURNS
           or any(t["is_error"] or t["permission_denials"] for t in r["turns"])]
    pairs = {}
    for r in rows:
        pairs.setdefault((r["form"], r["rep"]), {})[r["route"]] = r
    full = {k: p for k, p in pairs.items() if "E" in p and "N" in p}
    print(f"matrix sessions {len(rows)}; complete pairs {len(full)}; problem runs {bad}; "
          f"matrix spend ${sum(usd(r) for r in rows):.4f}; all spend "
          f"${sum(usd(r) for r in summary):.4f}")
    print("versions/models:", sorted({(r['init'].get('version'), r['init'].get('model'))
                                       for r in rows}))
    print("work listed in all:", all(r["init"].get("work_skill_listed") for r in rows))
    forms = [f for f in FORMS if any(r["form"] == f for r in rows)]
    print("coverage:", {f: sorted(k[1] for k in full if k[0] == f) for f in forms})

    print("\n## per session (matrix order)")
    print("| Seq | Form | Inst | Route | Pos | Path | Tool sequence, turn 1 (request:tool) | "
          "REQ (t1) | M1 | CUM | USD | Correct |")
    print("|" + "---|" * 12)
    for r in sorted(rows, key=lambda r: r["seq"]):
        t1 = " ".join(f"{t['msg']}:{t['name']}" for t in r["tool_calls"] if t["turn"] == 1)
        later = [(t["turn"], t["name"]) for t in r["tool_calls"] if t["turn"] > 1]
        print(f"| {r['seq']} | {r['form']} | {r['rep']} | {r['route']} | {r['position']} | "
              f"{PATHS[classify(r)]} | {t1 or '-'}{' +later ' + str(later) if later else ''} | "
              f"{reqs(r)} ({reqs_t1(r)}) | {m1(r)} | {cum(r)} | {usd(r):.4f} | {ok(r)}/5 |")

    print("\n## execution path by formulation and route (counts seq/par/other/none/inconcl.)")
    print("| Form | Route | n | seq | par | other | none | inconclusive | seq share [95% CI] |")
    print("|" + "---|" * 9)
    path_counts = {}
    for f in forms + ["ALL"]:
        for route in ["N", "E"]:
            rs = [r for r in rows if r["route"] == route and (f == "ALL" or r["form"] == f)]
            c = [sum(classify(r) == k for r in rs) for k in range(1, 6)]
            path_counts[(f, route)] = (c, len(rs))
            lo, hi = clopper_pearson(c[0], len(rs))
            print(f"| {f} | {route} | {len(rs)} | " + " | ".join(map(str, c)) +
                  f" | {c[0]}/{len(rs)} [{lo:.2f}..{hi:.2f}] |")

    print("\n## N path by instance index (consistency across instances)")
    for rep in range(1, INSTANCES_PER_FORM + 1):
        line = []
        for f in forms:
            r = pairs.get((f, rep), {}).get("N")
            line.append(f"{f}:{PATHS[classify(r)] if r else 'missing'}")
        print(f"instance {rep}: " + ", ".join(line))

    groups = [(path_counts[(f, "N")][0][0], path_counts[(f, "N")][1]) for f in forms]
    x2, p = exact_table_test(groups)
    shares = [s / n for s, n in groups if n]
    print(f"\nH1 N seq by formulation: {groups}; chi2 {x2:.3f}; exact conditional p {p:.4f}; "
          f"range of seq shares {max(shares) - min(shares):.3f}")
    # Leave-one-formulation-out: does the association rest on one formulation?
    for i, f in enumerate(forms):
        g = groups[:i] + groups[i + 1:]
        x2i, pi = exact_table_test(g)
        sh = [s / n for s, n in g if n]
        print(f"  without {f}: chi2 {x2i:.3f}, p {pi:.4f}, range {max(sh) - min(sh):.3f}")

    def d(pp, fn):
        a, b = fn(pp["E"]), fn(pp["N"])
        return None if a is None or b is None else a - b

    print("\n## per formulation and route: median [min..max]")
    print("| Form | Route | n | M1 | M1 cache read | M1 cache creation | REQ | REQ turn 1 | "
          "CUM | CUM uncached input | Output | USD | duration_ms | Correct |")
    print("|" + "---|" * 14)
    for f in forms:
        for route in ["E", "N"]:
            rs = [r for r in rows if r["form"] == f and r["route"] == route]
            print(f"| {f} | {route} | {len(rs)} | {stats([m1(r) for r in rs])} | "
                  f"{stats([m1_cr(r) for r in rs])} | {stats([m1_cc(r) for r in rs])} | "
                  f"{stats([reqs(r) for r in rs])} | {stats([reqs_t1(r) for r in rs])} | "
                  f"{stats([cum(r) for r in rs])} | {stats([cum_in(r) for r in rs])} | "
                  f"{stats([out_tok(r) for r in rs])} | {stats([usd(r) for r in rs], 4)} | "
                  f"{stats([ms(r) for r in rs])} | {stats([ok(r) for r in rs])} |")

    print("\n## paired E - N by formulation: median [min..max]")
    print("| Form | n | M1 | REQ | CUM | Output | USD | N paths |")
    print("|" + "---|" * 8)
    for f in forms + ["ALL"]:
        ps = [pp for k, pp in full.items() if f == "ALL" or k[0] == f]
        print(f"| {f} | {len(ps)} | {stats([d(pp, m1) for pp in ps])} | "
              f"{stats([d(pp, reqs) for pp in ps])} | {stats([d(pp, cum) for pp in ps])} | "
              f"{stats([d(pp, out_tok) for pp in ps])} | {stats([d(pp, usd) for pp in ps], 4)} | "
              f"{','.join(PATHS[classify(pp['N'])] for pp in ps)} |")

    print("\n## paired E - N by N path")
    for k in range(1, 6):
        ps = [pp for pp in full.values() if classify(pp["N"]) == k]
        if ps:
            print(f"{PATHS[k]}: n={len(ps)} REQ {stats([d(pp, reqs) for pp in ps])}; "
                  f"CUM {stats([d(pp, cum) for pp in ps])}; "
                  f"USD {stats([d(pp, usd) for pp in ps], 4)}; "
                  f"REQ=-1 & CUM<0: {sum(d(pp, reqs) == -1 and d(pp, cum) < 0 for pp in ps)}; "
                  f"REQ=0: {sum(d(pp, reqs) == 0 for pp in ps)}")

    print("\n## N sessions by path (H3 inputs)")
    for k in range(1, 6):
        rs = [r for r in rows if r["route"] == "N" and classify(r) == k]
        if rs:
            print(f"{PATHS[k]}: n={len(rs)} REQ {stats([reqs(r) for r in rs])}; "
                  f"CUM {stats([cum(r) for r in rs])}; USD {stats([usd(r) for r in rs], 4)}")
    if len(forms) > 1:
        by = {f: path_counts[(f, "N")][0][0] / max(1, path_counts[(f, "N")][1]) for f in forms}
        hi_f, lo_f = max(by, key=by.get), min(by, key=by.get)
        his = [r for r in rows if r["route"] == "N" and r["form"] == hi_f]
        los = [r for r in rows if r["route"] == "N" and r["form"] == lo_f]
        print(f"H3 highest seq share {hi_f} ({by[hi_f]:.2f}) vs lowest {lo_f} ({by[lo_f]:.2f}): "
              f"median N CUM {st.median([cum(r) for r in his]) - st.median([cum(r) for r in los]):+g}; "
              f"median N USD {st.median([usd(r) for r in his]) - st.median([usd(r) for r in los]):+.4f}")
        ties = [f for f in forms if by[f] in (by[hi_f], by[lo_f])]
        print(f"  formulations tied at the extremes: {ties}")

    print("\n## E route: tool shape after /work")
    for f in forms:
        rs = [r for r in rows if r["form"] == f and r["route"] == "E"]
        print(f"{f}: E Skill calls {sum(any(t['name'] == 'Skill' for t in r['tool_calls']) for r in rs)}"
              f"/{len(rs)}; E REQ turn 1 {[reqs_t1(r) for r in rs]}")

    print("\n## correctness (H5)")
    for f in forms:
        e = [ok(r) for r in rows if r["form"] == f and r["route"] == "E"]
        n = [ok(r) for r in rows if r["form"] == f and r["route"] == "N"]
        if e and n:
            print(f"{f}: E {e} N {n}; median diff {st.median(e) - st.median(n):+g}")
    fails = {}
    for r in rows:
        for i, c in enumerate(checks(r["answers"], [t["answer"] for t in r["turns"]]), 1):
            if not c:
                fails.setdefault(i, []).append(f"{r['form']}-{r['rep']}{r['route']}")
    print("failed checks by turn:", fails)

    order_e = [d(pp, usd) for pp in full.values() if pp["E"]["seq"] < pp["N"]["seq"]]
    order_n = [d(pp, usd) for pp in full.values() if pp["E"]["seq"] > pp["N"]["seq"]]
    print(f"\norder: E first n={len(order_e)} E-N USD {stats(order_e, 4)}; "
          f"N first n={len(order_n)} E-N USD {stats(order_n, 4)}")
    m1s = {}
    for r in rows:
        m1s.setdefault((r["form"], r["route"]), []).append(m1(r))
    print("M1 within-cell spreads:", sorted(max(v) - min(v) for v in m1s.values() if None not in v))


# --- Main --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fixture_dir", type=Path)
    ap.add_argument("output_dir", type=Path)
    ap.add_argument("--plan", choices=["smoke", "matrix"], default="matrix")
    ap.add_argument("--seed", type=int, default=SEED)
    ap.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    ap.add_argument("--reduce", nargs="*", default=[], choices=list(REDUCE_STEPS))
    ap.add_argument("--raw-bodies", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--analyze", action="store_true")
    ap.add_argument("--instances", action="store_true",
                    help="print formulations, instance sizes and hashes, and exit")
    a = ap.parse_args()
    fx, out = a.fixture_dir.resolve(), a.output_dir.resolve()
    if a.analyze:
        analyze(json.loads((out / "summary.json").read_text()))
        return
    plan = build_plan(a.plan, a.seed, a.reduce)
    if a.instances or a.dry_run:
        for f, text in FORMULATIONS.items():
            print(f"{f}: chars(with {{L}})={len(text)} sha256={sha(text)[:12]}")
        for i, (f, rep, iid, routes) in enumerate(plan, 1):
            inst = make_instance(iid, a.seed, f)
            if a.dry_run:
                print(f"  pair {i:02d}: {f} rep{rep} {iid} {routes}")
            if a.instances:
                print(json.dumps(instance_record(inst)))
        print(f"sessions={2 * len(plan)} pairs={len(plan)} reduce={a.reduce}")
        print(f"{SIZE}: SKILL.md bytes={len(SKILL_MD.encode())} sha256={sha(SKILL_MD)[:12]}")
        return
    out.mkdir(parents=True, exist_ok=True)
    base.check_dirs(fx, out)
    summary_path = out / "summary.json"
    summary = json.loads(summary_path.read_text()) if summary_path.exists() else []
    done = {(r["plan"], r["form"], r["rep"], r["route"]) for r in summary}
    spent = sum(r.get("list_cost_usd_estimate") or 0 for r in summary)
    print(f"plan={a.plan} reduce={a.reduce} seed={a.seed} pairs={len(plan)} "
          f"spent so far=${spent:.4f} budget=${a.budget_usd:.2f}", flush=True)
    seq = len(summary)
    consecutive_bad = 0
    for blk, (form, rep, iid, routes) in enumerate(plan, 1):
        inst = make_instance(iid, a.seed, form)
        for pos, route in enumerate(routes, 1):
            if (a.plan, form, rep, route) in done:
                continue
            if spent + PER_RUN_CAP_USD > a.budget_usd:
                sys.exit(f"budget stop: spent ${spent:.4f}, cap ${a.budget_usd:.2f}")
            seq += 1
            name = f"{seq:03d}_{form}_r{rep}_{route}"
            raw = out / f"{name}.jsonl"
            raw_dir = None
            if a.raw_bodies:
                raw_dir = out / "bodies" / name
                if raw_dir.exists():
                    shutil.rmtree(raw_dir)  # our own output only
                raw_dir.mkdir(parents=True)
            turns = list(inst["turns"])
            if route == "E":
                turns[0] = E_PREFIX + turns[0]
            files = {SKILL_REL: SKILL_MD, **inst["files"]}
            started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            with base.Fixture(fx, files):
                rc, err, wall, turn_wall = base.run_session(fx, turns, raw, raw_dir)
            if any(fx.iterdir()):
                sys.exit(f"fixture dir not clean after run {seq}: {list(fx.iterdir())}")
            parsed = rcc.parse_stream(raw)
            last = parsed["turns"][-1] if parsed["turns"] else {}
            rec = {"seq": seq, "plan": a.plan, "seed": a.seed, "block": blk,
                   "position": pos, "form": form, "rep": rep, "route": route, "iid": iid,
                   "instance": instance_record(inst), "answers": inst["answers"],
                   "skill_sha256": sha(SKILL_MD)[:12],
                   "prompt_chars": [len(t) for t in turns],
                   "prompt_sha256": [sha(t)[:12] for t in turns],
                   "started_utc": started, "wall_s": wall, "turn_wall_s": turn_wall,
                   "exit_code": rc, "stderr_tail": err.strip()[-300:],
                   "list_cost_usd_estimate": last.get("total_cost_usd"),
                   **parsed}
            if raw_dir is not None:
                rec["bodies"] = rcc.summarize_bodies(raw_dir, inst["turns"][0])
            spent += rec.get("list_cost_usd_estimate") or 0
            summary.append(rec)
            summary_path.write_text(json.dumps(summary, indent=1, ensure_ascii=False))
            ok = checks(inst["answers"], [t["answer"] for t in rec["turns"]])
            print(f"[{seq:03d}] {form} r{rep} {iid} {route} rc={rc} "
                  f"turns={len(rec['turns'])} reqs={len(rec['requests'])} "
                  f"path={PATHS[classify(rec)]} "
                  f"tools={[(t['turn'], t['msg'], t['name']) for t in rec['tool_calls']]} "
                  f"ok={sum(ok)}/5 cost={rec.get('list_cost_usd_estimate')} total=${spent:.4f}",
                  flush=True)
            bad = rc != 0 or len(rec["turns"]) != TURNS
            consecutive_bad = consecutive_bad + 1 if bad else 0
            if consecutive_bad >= 2:
                sys.exit("stop rule: 2 consecutive incomplete or failed sessions")


if __name__ == "__main__":
    main()
