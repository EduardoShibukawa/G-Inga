#!/usr/bin/env python3
"""Runner for CLAUDE-SKILL-F4-F1-FORMULATION-REPLICATION.

Report: docs/research/claude-skill-f4-f1-formulation-replication.md
Builds on: tools/research/run_claude_skill_auto_routing_formulation.py (the F1
and F4 wordings, the string checks and the Clopper-Pearson interval), which in
turn imports the realistic cache-control runner (task-instance generator,
stream parser) and the factorial runner (the ~2 KB SKILL.md, CLI flags,
hash-checked fixture and the multi-turn stream-json session driver). Nothing
in those runners is changed.

Design (natural-language route only; every session has exactly TURNS turns):

    skill        S2K, the unchanged ~2 KB SKILL.md of the earlier runs
    formulation  F1 (direct) or F4 (two ordered objectives), turn 1 only
    pair         RP01..RP10: one F1 session and one F4 session on the same
                 task instance, back to back; distinct instances across pairs
    order        5 pairs F1-first and 5 pairs F4-first, assigned at random;
                 the pairs themselves run in a seeded random order

Usage:
    python3 run_claude_skill_f4_f1_formulation_replication.py FIXTURE_DIR OUTPUT_DIR
        [--plan smoke|matrix] [--seed N] [--budget-usd X] [--pairs N]
        [--raw-bodies] [--dry-run] [--instances] [--analyze] [--selftest]

FIXTURE_DIR must exist, be empty and sit outside any Git work tree. OUTPUT_DIR
must sit outside any Git work tree: it receives raw stream-json, optional raw
API bodies and summary.json (answer texts, request ids, session metadata).
Never commit it.
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
import run_claude_skill_auto_routing_formulation as arf  # noqa: E402

rcc = arf.rcc
base = arf.base
SKILL_MD = arf.SKILL_MD  # unchanged S2K body
SKILL_REL = arf.SKILL_REL
PER_RUN_CAP_USD = arf.PER_RUN_CAP_USD
TURNS = arf.TURNS
DEFAULT_BUDGET_USD = 3.00
SEED = 20261015
FORMS = ["F1", "F4"]
FORMULATIONS = {f: arf.FORMULATIONS[f] for f in FORMS}  # byte-identical to the earlier run
PAIRS = [f"RP{i:02d}" for i in range(1, 11)]
SMOKE = [("SMK-R1", ["F4", "F1"])]
# Pre-registered materiality thresholds for the secondary cost outcome
# (the earlier report's H3, unchanged).
CUM_MATERIAL = 5000
USD_MATERIAL = 0.0015

CATS = ["SEQUENTIAL", "JOINT_OR_PARALLEL", "OTHER", "NO_SKILL", "INCONCLUSIVE"]


# --- Instances and plan -----------------------------------------------------------

def make_instance(iid, seed, form):
    inst = rcc.make_instance(iid, seed)
    turns = list(inst["turns"]["COMPAT"])
    turns[0] = FORMULATIONS[form].format(L=inst["ledger_rel"])
    inst["turns"] = turns
    return inst


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def instance_hash(inst):
    """Hash of the task-specific data: files and turns 2-5 (turn 1 differs by
    formulation by design)."""
    blob = json.dumps({"files": inst["files"], "turns_2_5": inst["turns"][1:]},
                      sort_keys=True)
    return sha(blob)[:12]


def draw_schedule(seed):
    """[(pair_id, [first_form, second_form])] in execution order. Which pairs
    run F1 first is drawn first (5 of 10), then the execution order of the
    pairs, both from one seeded generator."""
    rng = random.Random(seed)
    first = ["F1"] * 5 + ["F4"] * 5
    rng.shuffle(first)
    sched = [(p, [x, "F4" if x == "F1" else "F1"]) for p, x in zip(PAIRS, first)]
    rng.shuffle(sched)
    return sched


def build_plan(kind, seed, npairs):
    if kind == "smoke":
        return SMOKE
    sched = draw_schedule(seed)
    if npairs >= len(sched):
        return sched
    # Pre-registered reduction: keep the first npairs/2 pairs of each order
    # stratum in execution order, so the kept pairs stay balanced.
    keep, cnt = set(), {"F1": 0, "F4": 0}
    for p, order in sched:
        if cnt[order[0]] < npairs // 2:
            keep.add(p)
            cnt[order[0]] += 1
    return [s for s in sched if s[0] in keep]


# --- Parsing and classification -----------------------------------------------

def request_ids(raw_path):
    """Main-agent assistant message ids in order of first appearance, and any
    request id the stream carries. Kept in the local summary only."""
    ids, req = [], []
    for line in open(raw_path, encoding="utf-8"):
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        if e.get("type") == "assistant" and not e.get("parent_tool_use_id"):
            mid = e["message"].get("id")
            if mid not in ids:
                ids.append(mid)
                req.append(e.get("request_id") or e["message"].get("request_id"))
    return ids, req


def classify(r):
    """Primary category of a session from its request and tool-call events
    (report §3). `msg` is the 1-based index of the main-agent request a tool
    call was issued in.

    INCONCLUSIVE       non-zero exit, fewer than TURNS result events, an error
                       result, no requests, or a turn-1 Skill(work) call with
                       no data Read in turn 1
    NO_SKILL           no Skill call of any kind and no Read of SKILL.md
    OTHER              any other observed path: a Skill call for another skill,
                       Skill(work) only after turn 1, a Read of SKILL.md, or a
                       data Read in an earlier request than Skill(work)
    JOINT_OR_PARALLEL  turn 1: Skill(work) and the first data Read in the same
                       request
    SEQUENTIAL         turn 1: Skill(work), then the first data Read in a later
                       request
    """
    if (r["exit_code"] != 0 or len(r["turns"]) != TURNS or not r["requests"]
            or any(t["is_error"] for t in r["turns"])):
        return "INCONCLUSIVE"
    tc = r["tool_calls"]
    skill_md = any(t["name"] == "Read" and t["file"] == "SKILL.md" for t in tc)
    sk_any = [t for t in tc if t["name"] == "Skill"]
    if not sk_any:
        return "OTHER" if skill_md else "NO_SKILL"
    if skill_md or any(t["skill"] != "work" for t in sk_any):
        return "OTHER"
    t1 = [t for t in tc if t["turn"] == 1]
    sk = [t["msg"] for t in t1 if t["name"] == "Skill"]
    rd = [t["msg"] for t in t1 if t["name"] == "Read"]
    if not sk:
        return "OTHER"
    if not rd:
        return "INCONCLUSIVE"
    if min(rd) < sk[0]:
        return "OTHER"
    return "JOINT_OR_PARALLEL" if min(rd) == sk[0] else "SEQUENTIAL"


checks = arf.checks


# --- Statistics (standard library only) --------------------------------------

def binom_cdf(k, n, p=0.5):
    return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k + 1))


def exact_mcnemar(b, c):
    """Two-sided exact McNemar test: binomial(b + c, 1/2) on the discordant
    pairs, doubled smaller tail, capped at 1."""
    n = b + c
    if n == 0:
        return 1.0
    return min(1.0, 2 * binom_cdf(min(b, c), n))


def wilson(k, n, z=1.959964):
    if n == 0:
        return (0.0, 1.0)
    p = k / n
    den = 1 + z * z / n
    mid = (p + z * z / (2 * n)) / den
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return (max(0.0, mid - half), min(1.0, mid + half))


def newcombe_paired(a, b, c, d):
    """95% interval for p_F4 - p_F1 from paired binary data (Newcombe 1998,
    method 10). a: both joint; b: F4 joint only; c: F1 joint only; d: neither."""
    n = a + b + c + d
    p1, p2 = (a + b) / n, (a + c) / n
    l1, u1 = wilson(a + b, n)
    l2, u2 = wilson(a + c, n)
    den = (a + b) * (c + d) * (a + c) * (b + d)
    phi = (a * d - b * c) / math.sqrt(den) if den else 0.0
    dd = p1 - p2
    lo = dd - math.sqrt(max(0.0, (p1 - l1) ** 2 - 2 * phi * (p1 - l1) * (u2 - p2) + (u2 - p2) ** 2))
    hi = dd + math.sqrt(max(0.0, (u1 - p1) ** 2 - 2 * phi * (u1 - p1) * (p2 - l2) + (p2 - l2) ** 2))
    return dd, max(-1.0, lo), min(1.0, hi)


def fisher_two_sided(k1, n1, k2, n2):
    """Unpaired two-sided Fisher exact test (sum of tables no more probable
    than the observed one). Sensitivity analysis only."""
    K, N = k1 + k2, n1 + n2
    den = math.comb(N, K)
    prob = lambda x: math.comb(n1, x) * math.comb(n2, K - x) / den
    obs = prob(k1)
    return min(1.0, sum(prob(x) for x in range(max(0, K - n2), min(n1, K) + 1)
                        if prob(x) <= obs * (1 + 1e-9)))


def sign_flip_test(diffs):
    """Exact paired randomization test on the mean difference: every sign
    assignment of the paired differences, two-sided."""
    diffs = [x for x in diffs if x is not None]
    if not diffs:
        return None, None
    obs = abs(sum(diffs))
    hits = total = 0
    for signs in itertools.product([1, -1], repeat=len(diffs)):
        total += 1
        hits += abs(sum(s * x for s, x in zip(signs, diffs))) >= obs - 1e-12
    return sum(diffs) / len(diffs), hits / total


def selftest():
    assert abs(exact_mcnemar(6, 0) - 0.03125) < 1e-12
    assert abs(exact_mcnemar(5, 0) - 0.0625) < 1e-12
    assert exact_mcnemar(0, 0) == 1.0
    assert abs(exact_mcnemar(2, 0) - 0.5) < 1e-12
    assert abs(fisher_two_sided(0, 3, 3, 3) - 0.1) < 1e-9
    d, lo, hi = newcombe_paired(0, 0, 0, 10)
    assert d == 0 and lo < 0 < hi
    d, lo, hi = newcombe_paired(0, 10, 0, 0)
    assert d == 1 and hi == 1.0 and lo > 0.5
    m, p = sign_flip_test([1, 1, 1])
    assert m == 1 and abs(p - 0.25) < 1e-12
    sched = draw_schedule(SEED)
    assert sorted(p for p, _ in sched) == PAIRS
    assert sum(o[0] == "F1" for _, o in sched) == 5
    assert all(sorted(o) == FORMS for _, o in sched)
    for n in (8, 6):
        red = build_plan("matrix", SEED, n)
        assert len(red) == n and sum(o[0] == "F1" for _, o in red) == n // 2
    def rec(tools, **kw):
        r = {"exit_code": 0, "turns": [{"is_error": False}] * TURNS,
             "requests": [{}] * 7, "tool_calls": tools}
        r.update(kw)
        return r
    T = lambda turn, msg, name, skill=None, f="": {"turn": turn, "msg": msg, "name": name,
                                                    "skill": skill, "file": f}
    assert classify(rec([T(1, 1, "Skill", "work"), T(1, 2, "Read", f="ledger-x.txt")])) == "SEQUENTIAL"
    assert classify(rec([T(1, 1, "Skill", "work"), T(1, 1, "Read", f="ledger-x.txt")])) == "JOINT_OR_PARALLEL"
    assert classify(rec([T(1, 1, "Read", f="ledger-x.txt")])) == "NO_SKILL"
    assert classify(rec([T(1, 1, "Read", f="ledger-x.txt"), T(1, 2, "Skill", "work")])) == "OTHER"
    assert classify(rec([T(1, 1, "Skill", "other"), T(1, 1, "Read", f="ledger-x.txt")])) == "OTHER"
    assert classify(rec([T(2, 3, "Skill", "work")])) == "OTHER"
    assert classify(rec([T(1, 1, "Skill", "work")])) == "INCONCLUSIVE"
    assert classify(rec([], exit_code=1)) == "INCONCLUSIVE"
    print("selftest: pass")


# --- Analysis -----------------------------------------------------------------

def analyze(summary):
    rows = [r for r in summary if r["plan"] == "matrix"]
    m1 = lambda r: r["requests"][0]["prompt_total"] if r["requests"] else None
    m1_part = lambda k: (lambda r: r["requests"][0][k] if r["requests"] else None)
    cum = lambda r: sum(q["prompt_total"] for q in r["requests"])
    cum_k = lambda k: (lambda r: sum(q[k] for q in r["requests"]))
    out_tok = lambda r: sum(t["usage"]["output_tokens"] or 0 for t in r["turns"])
    usd = lambda r: r["list_cost_usd_estimate"] or 0
    reqs = lambda r: len(r["requests"])
    reqs_t1 = lambda r: sum(q["turn"] == 1 for q in r["requests"])
    ok = lambda r: sum(checks(r["answers"], [t["answer"] for t in r["turns"]]))

    def stats(v, nd=None):
        v = [x for x in v if x is not None]
        if not v:
            return "-"
        f = (lambda x: f"{x:+.{nd}f}" if x < 0 else f"{x:.{nd}f}") if nd else (lambda x: f"{x:g}")
        return f"{f(st.median(v))} [{f(min(v))}..{f(max(v))}]"

    pairs = {}
    for r in rows:
        pairs.setdefault(r["pair"], {})[r["form"]] = r
    full = {k: p for k, p in pairs.items() if all(f in p for f in FORMS)}
    cat = {r["seq"]: classify(r) for r in rows}
    incon = sum(c == "INCONCLUSIVE" for c in cat.values())
    print(f"matrix sessions {len(rows)}; complete pairs {len(full)}; inconclusive sessions "
          f"{incon}; matrix spend ${sum(usd(r) for r in rows):.4f}; all spend "
          f"${sum(usd(r) for r in summary):.4f} ({len(summary)} sessions)")
    print("versions/models:", sorted({(r['init'].get('version'), r['init'].get('model'))
                                       for r in rows}))
    print("work listed in all:", all(r["init"].get("work_skill_listed") for r in rows))
    print("problem runs:", [r["seq"] for r in rows if r["exit_code"] != 0
                            or len(r["turns"]) != TURNS
                            or any(t["is_error"] or t["permission_denials"] for t in r["turns"])])

    print("\n## per session (execution order)")
    print("| Seq | Pair | Order | Pos | Form | Inst hash | Category | Turn-1 tools (request:tool) | "
          "REQ (t1) | M1 in / cc / cr | CUM | USD | Correct |")
    print("|" + "---|" * 13)
    for r in sorted(rows, key=lambda r: r["seq"]):
        t1 = " ".join(f"{t['msg']}:{t['name']}" + (f"({t['skill']})" if t["name"] == "Skill" else "")
                      for t in r["tool_calls"] if t["turn"] == 1)
        later = [(t["turn"], t["name"]) for t in r["tool_calls"] if t["turn"] > 1]
        q = r["requests"][0] if r["requests"] else {}
        print(f"| {r['seq']} | {r['pair']} | {r['order']} | {r['position']} | {r['form']} | "
              f"{r['instance_hash']} | {cat[r['seq']]} | {t1 or '-'}"
              f"{' +later ' + str(later) if later else ''} | {reqs(r)} ({reqs_t1(r)}) | "
              f"{q.get('input')} / {q.get('cache_creation')} / {q.get('cache_read')} | "
              f"{cum(r)} | {usd(r):.4f} | {ok(r)}/5 |")

    print("\n## categories by formulation")
    print("| Form | n | " + " | ".join(CATS) + " | joint share [95% CP] |")
    print("|" + "---|" * (len(CATS) + 3))
    for f in FORMS:
        rs = [r for r in rows if r["form"] == f]
        c = [sum(cat[r["seq"]] == k for r in rs) for k in CATS]
        lo, hi = arf.clopper_pearson(c[1], len(rs))
        print(f"| {f} | {len(rs)} | " + " | ".join(map(str, c)) +
              f" | {c[1]}/{len(rs)} [{lo:.2f}..{hi:.2f}] |")

    J = lambda r: cat[r["seq"]] == "JOINT_OR_PARALLEL"
    a = sum(J(p["F4"]) and J(p["F1"]) for p in full.values())
    b = sum(J(p["F4"]) and not J(p["F1"]) for p in full.values())
    c = sum(J(p["F1"]) and not J(p["F4"]) for p in full.values())
    d = sum(not J(p["F4"]) and not J(p["F1"]) for p in full.values())
    pm = exact_mcnemar(b, c)
    dd, lo, hi = newcombe_paired(a, b, c, d) if full else (0, 0, 0)
    print(f"\nPRIMARY paired table (pairs={len(full)}): both joint a={a}; F4 only b={b}; "
          f"F1 only c={c}; neither d={d}")
    print(f"  exact McNemar two-sided: discordant {b + c}, statistic b={b}, p={pm:.4f}")
    print(f"  p_F4 - p_F1 = {dd:+.3f}, 95% Newcombe paired CI [{lo:+.3f}..{hi:+.3f}]")
    k4 = sum(J(p["F4"]) for p in full.values())
    k1 = sum(J(p["F1"]) for p in full.values())
    print(f"  sensitivity, unpaired Fisher exact: F4 {k4}/{len(full)} vs F1 {k1}/{len(full)}, "
          f"p={fisher_two_sided(k4, len(full), k1, len(full)):.4f}")
    sub = {k: p for k, p in full.items()
           if all(cat[p[f]["seq"]] in ("SEQUENTIAL", "JOINT_OR_PARALLEL") for f in FORMS)}
    bs = sum(J(p["F4"]) and not J(p["F1"]) for p in sub.values())
    cs = sum(J(p["F1"]) and not J(p["F4"]) for p in sub.values())
    print(f"  sensitivity, pairs with both sessions SEQUENTIAL/JOINT ({len(sub)}): b={bs} c={cs} "
          f"p={exact_mcnemar(bs, cs):.4f}")

    print("\n## order strata (which formulation ran first)")
    strata = {}
    for o in FORMS:
        ps = [p for p in full.values() if p["F1"]["order"] == f"{o}-first"]
        sb = sum(J(p["F4"]) and not J(p["F1"]) for p in ps)
        sc = sum(J(p["F1"]) and not J(p["F4"]) for p in ps)
        strata[o] = (sb, sc)
        print(f"{o}-first: pairs {len(ps)}; F4 joint {sum(J(p['F4']) for p in ps)}; "
              f"F1 joint {sum(J(p['F1']) for p in ps)}; b={sb} c={sc}; "
              f"McNemar p={exact_mcnemar(sb, sc):.4f}")
    pos1 = [p for p in full.values()]
    pb = sum(J(min(p.values(), key=lambda r: r["position"])) and
             not J(max(p.values(), key=lambda r: r["position"])) for p in pos1)
    pc = sum(J(max(p.values(), key=lambda r: r["position"])) and
             not J(min(p.values(), key=lambda r: r["position"])) for p in pos1)
    jpos = {k: sum(J(r) for r in rows if r["position"] == k) for k in (1, 2)}
    print(f"position: joint in position 1 {jpos[1]}/{sum(r['position'] == 1 for r in rows)}, "
          f"position 2 {jpos[2]}/{sum(r['position'] == 2 for r in rows)}; discordant "
          f"first-only {pb}, second-only {pc}; exact McNemar p={exact_mcnemar(pb, pc):.4f}")

    replicated = None
    if incon > 2 or len(full) < 6:
        verdict = "INCONCLUSIVE (data: too many inconclusive sessions or missing pairs)"
    elif pm < 0.05 and b > c:
        consistent = all(sb > sc for sb, sc in strata.values())
        verdict = "REPLICATED" if consistent else "INCONCLUSIVE (effect not present in both orders)"
        replicated = consistent
    elif pm < 0.05 and c > b:
        verdict = "REVERSED (F1 more joint than F4)"
    else:
        verdict = "NOT REPLICATED (p >= 0.05; not evidence of equivalence)"
    print(f"\nPRIMARY VERDICT: {verdict}")

    def d_(p, fn):
        x, y = fn(p["F4"]), fn(p["F1"])
        return None if x is None or y is None else x - y

    print("\n## per formulation: median [min..max]")
    print("| Form | n | M1 | M1 input | M1 cache read | M1 cache creation | REQ | REQ t1 | CUM | "
          "CUM input | CUM cache read | CUM cache creation | Output | USD | Correct |")
    print("|" + "---|" * 15)
    for f in FORMS:
        rs = [r for r in rows if r["form"] == f]
        print(f"| {f} | {len(rs)} | {stats([m1(r) for r in rs])} | "
              f"{stats([m1_part('input')(r) for r in rs])} | "
              f"{stats([m1_part('cache_read')(r) for r in rs])} | "
              f"{stats([m1_part('cache_creation')(r) for r in rs])} | "
              f"{stats([reqs(r) for r in rs])} | {stats([reqs_t1(r) for r in rs])} | "
              f"{stats([cum(r) for r in rs])} | {stats([cum_k('input')(r) for r in rs])} | "
              f"{stats([cum_k('cache_read')(r) for r in rs])} | "
              f"{stats([cum_k('cache_creation')(r) for r in rs])} | "
              f"{stats([out_tok(r) for r in rs])} | {stats([usd(r) for r in rs], 4)} | "
              f"{stats([ok(r) for r in rs])} |")

    print("\n## paired F4 - F1 (secondary): median [min..max]; sign-flip mean and p")
    metrics = [("M1", m1, None), ("M1 cache read", m1_part("cache_read"), None),
               ("M1 cache creation", m1_part("cache_creation"), None),
               ("REQ", reqs, None), ("CUM", cum, None),
               ("CUM input", cum_k("input"), None),
               ("CUM cache read", cum_k("cache_read"), None),
               ("CUM cache creation", cum_k("cache_creation"), None),
               ("Output", out_tok, None), ("USD", usd, 4)]
    med = {}
    for name, fn, nd in metrics:
        ds = [d_(p, fn) for p in full.values()]
        mean, p = sign_flip_test(ds)
        med[name] = st.median([x for x in ds if x is not None]) if ds else None
        fmt = (lambda x: f"{x:+.{nd}f}") if nd else (lambda x: f"{x:+.1f}")
        print(f"{name}: {stats(ds, nd)}; mean {fmt(mean)}; sign-flip p={p:.4f}")
    mat = (med["CUM"] is not None and abs(med["CUM"]) >= CUM_MATERIAL
           and abs(med["USD"]) >= USD_MATERIAL)
    print(f"cost materiality (|median CUM| >= {CUM_MATERIAL} and |median USD| >= "
          f"{USD_MATERIAL}): {'MATERIAL' if mat else 'NOT MATERIAL'}")

    print("\n## paired F4 - F1 by path combination (F4/F1)")
    combos = {}
    for k, p in full.items():
        combos.setdefault((cat[p["F4"]["seq"]], cat[p["F1"]["seq"]]), []).append(p)
    for (c4, c1), ps in sorted(combos.items()):
        print(f"F4 {c4} / F1 {c1}: n={len(ps)} pairs {sorted(p['F1']['pair'] for p in ps)}; "
              f"REQ {stats([d_(p, reqs) for p in ps])}; CUM {stats([d_(p, cum) for p in ps])}; "
              f"CUM cache read {stats([d_(p, cum_k('cache_read')) for p in ps])}; "
              f"USD {stats([d_(p, usd) for p in ps], 4)}")

    print("\n## sessions by category (both formulations)")
    for k in CATS:
        rs = [r for r in rows if cat[r["seq"]] == k]
        if rs:
            print(f"{k}: n={len(rs)} REQ {stats([reqs(r) for r in rs])}; "
                  f"REQ t1 {stats([reqs_t1(r) for r in rs])}; CUM {stats([cum(r) for r in rs])}; "
                  f"USD {stats([usd(r) for r in rs], 4)}; output {stats([out_tok(r) for r in rs])}")

    print("\n## correctness")
    fails = {}
    for r in rows:
        for i, ch in enumerate(checks(r["answers"], [t["answer"] for t in r["turns"]]), 1):
            if not ch:
                fails.setdefault(i, []).append(f"{r['pair']}{r['form']}")
    print({f: [ok(r) for r in rows if r["form"] == f] for f in FORMS}, "failed:", fails)
    print("request ids recorded:", sum(len(r.get("request_ids", [])) for r in rows),
          "message ids,", sum(1 for r in rows for x in r.get("request_ids_api", []) if x),
          "API request ids")
    return {"verdict": verdict, "replicated": replicated}


# --- Main ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fixture_dir", type=Path, nargs="?")
    ap.add_argument("output_dir", type=Path, nargs="?")
    ap.add_argument("--plan", choices=["smoke", "matrix"], default="matrix")
    ap.add_argument("--seed", type=int, default=SEED)
    ap.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    ap.add_argument("--pairs", type=int, default=len(PAIRS), choices=[6, 8, 10])
    ap.add_argument("--raw-bodies", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--instances", action="store_true")
    ap.add_argument("--analyze", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        selftest()
        return
    plan = build_plan(a.plan, a.seed, a.pairs)
    if a.instances or a.dry_run:
        for f, text in FORMULATIONS.items():
            print(f"{f}: {text!r} chars(with {{L}})={len(text)} sha256={sha(text)[:12]}")
        print(f"seed={a.seed} plan={a.plan}")
        for i, (pid, order) in enumerate(plan, 1):
            inst = make_instance(pid, a.seed, order[0])
            print(f"  pair {i:02d}: {pid} order={order[0]}-first sessions={order} "
                  f"instance_hash={instance_hash(inst)} ledger={inst['ledger_rel']}")
        print(f"sessions={2 * len(plan)} pairs={len(plan)}")
        print(f"S2K SKILL.md bytes={len(SKILL_MD.encode())} sha256={sha(SKILL_MD)[:12]}")
        return
    if a.fixture_dir is None or a.output_dir is None:
        sys.exit("FIXTURE_DIR and OUTPUT_DIR are required")
    fx, out = a.fixture_dir.resolve(), a.output_dir.resolve()
    if a.analyze:
        analyze(json.loads((out / "summary.json").read_text()))
        return
    out.mkdir(parents=True, exist_ok=True)
    base.check_dirs(fx, out)
    summary_path = out / "summary.json"
    summary = json.loads(summary_path.read_text()) if summary_path.exists() else []
    done = {(r["plan"], r["pair"], r["form"]) for r in summary}
    spent = sum(r.get("list_cost_usd_estimate") or 0 for r in summary)
    print(f"plan={a.plan} seed={a.seed} pairs={len(plan)} spent so far=${spent:.4f} "
          f"budget=${a.budget_usd:.2f}", flush=True)
    seq = len(summary)
    consecutive_bad = 0
    for blk, (pid, order) in enumerate(plan, 1):
        for pos, form in enumerate(order, 1):
            if (a.plan, pid, form) in done:
                continue
            if spent + PER_RUN_CAP_USD > a.budget_usd:
                sys.exit(f"budget stop: spent ${spent:.4f}, cap ${a.budget_usd:.2f}")
            inst = make_instance(pid, a.seed, form)
            seq += 1
            name = f"{seq:03d}_{pid}_{form}"
            raw = out / f"{name}.jsonl"
            raw_dir = None
            if a.raw_bodies:
                raw_dir = out / "bodies" / name
                if raw_dir.exists():
                    shutil.rmtree(raw_dir)  # our own output only
                raw_dir.mkdir(parents=True)
            turns = list(inst["turns"])
            files = {SKILL_REL: SKILL_MD, **inst["files"]}
            started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            with base.Fixture(fx, files):
                rc, err, wall, turn_wall = base.run_session(fx, turns, raw, raw_dir)
            if any(fx.iterdir()):
                sys.exit(f"fixture dir not clean after run {seq}: {list(fx.iterdir())}")
            parsed = rcc.parse_stream(raw)
            ids, api_ids = request_ids(raw)
            last = parsed["turns"][-1] if parsed["turns"] else {}
            rec = {"seq": seq, "plan": a.plan, "seed": a.seed, "block": blk,
                   "position": pos, "order": f"{order[0]}-first", "pair": pid,
                   "form": form, "instance_hash": instance_hash(inst),
                   "answers": inst["answers"], "skill_sha256": sha(SKILL_MD)[:12],
                   "prompt_chars": [len(t) for t in turns],
                   "prompt_sha256": [sha(t)[:12] for t in turns],
                   "started_utc": started, "wall_s": wall, "turn_wall_s": turn_wall,
                   "exit_code": rc, "stderr_tail": err.strip()[-300:],
                   "list_cost_usd_estimate": last.get("total_cost_usd"),
                   "request_ids": ids, "request_ids_api": api_ids, **parsed}
            if raw_dir is not None:
                rec["bodies"] = rcc.summarize_bodies(raw_dir, turns[0])
            spent += rec.get("list_cost_usd_estimate") or 0
            summary.append(rec)
            summary_path.write_text(json.dumps(summary, indent=1, ensure_ascii=False))
            ok = checks(inst["answers"], [t["answer"] for t in rec["turns"]])
            print(f"[{seq:03d}] {pid} {form} pos{pos} rc={rc} turns={len(rec['turns'])} "
                  f"reqs={len(rec['requests'])} cat={classify(rec)} "
                  f"tools={[(t['turn'], t['msg'], t['name']) for t in rec['tool_calls']]} "
                  f"ok={sum(ok)}/5 cost={rec.get('list_cost_usd_estimate')} total=${spent:.4f}",
                  flush=True)
            bad = rc != 0 or len(rec["turns"]) != TURNS
            consecutive_bad = consecutive_bad + 1 if bad else 0
            if consecutive_bad >= 2:
                sys.exit("stop rule: 2 consecutive incomplete or failed sessions")


if __name__ == "__main__":
    main()
