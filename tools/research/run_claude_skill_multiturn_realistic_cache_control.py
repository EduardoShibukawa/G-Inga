#!/usr/bin/env python3
"""Runner for CLAUDE-SKILL-MULTITURN-REALISTIC-CACHE-CONTROL.

Report: docs/research/claude-skill-multiturn-realistic-cache-control.md
Builds on: tools/research/run_claude_skill_multiturn_factorial.py, imported
for the three SKILL.md sizes (unchanged, byte for byte), the CLI flags, the
parent-session variable stripping, the tracked and hash-checked fixture
cleanup and the multi-turn stream-json session driver.

Arms (every session has exactly TURNS user turns):

    U-COMPAT    unique task instance per pair, compatible task, S025/S2K/S8K
    R-COMPAT    one fixed task instance repeated in every pair (cache control),
                compatible task, S025/S2K/S8K
    U-INCOMPAT  unique task instance per pair, incompatible task (negative
                control), S025 and S8K

Each pair runs E ("/work <turn 1>") and N ("Task: <turn 1>") on the same task
instance, back to back, in a seeded random order. Pairs run in seeded random
order. A task instance fixes the ledger and notes file names and contents and
the identifiers and values named in the turns; difficulty is the same for all.

Usage:
    python3 run_claude_skill_multiturn_realistic_cache_control.py FIXTURE_DIR OUTPUT_DIR
        [--plan smoke|matrix] [--seed N] [--budget-usd X] [--raw-bodies]
        [--drop STEP ...] [--dry-run] [--analyze] [--instances]

FIXTURE_DIR must exist, be empty and sit outside any Git work tree. OUTPUT_DIR
must sit outside any Git work tree: it receives raw stream-json, optional raw
API bodies and summary.json (answer texts, session metadata). Never commit it.
"""

import argparse
import hashlib
import json
import random
import shutil
import statistics as st
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_claude_skill_multiturn_factorial as base  # noqa: E402

MODEL = base.MODEL
SKILL_MD = base.SKILL_MD  # unchanged from the factorial runner
SKILL_REL = base.SKILL_REL
SIZES = list(SKILL_MD)
PER_RUN_CAP_USD = base.PER_RUN_CAP_USD
DEFAULT_BUDGET_USD = 5.00
TURNS = 5
PREFIX = base.PREFIX  # "/work " and "Task: ", 6 characters each

# --- Task instances ------------------------------------------------------------

_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"
_NOTES = [  # (title, two things counted, place, next event)
    ("Tide pool survey", "anemones and small crabs", "the north rocks", "the spring storms"),
    ("Meadow bird count", "finches and larks", "the east hedge", "the autumn mowing"),
    ("Pond insect census", "dragonflies and water beetles", "the shallow inlet", "the first frost"),
    ("Orchard tree check", "pear trees and plum trees", "the lower terrace", "the winter pruning"),
    ("Dune plant transect", "marram tufts and sea holly", "the south ridge", "the summer gales"),
    ("Riverbank mammal watch", "otters and water voles", "the old weir", "the spring floods"),
    ("Hedgerow moth trap", "tiger moths and hawk moths", "the west lane", "the June full moon"),
    ("Woodland fungus walk", "bracket fungi and puffballs", "the beech grove", "the October rains"),
    ("Salt marsh wader count", "redshanks and curlews", "the creek mouth", "the high spring tide"),
    ("Heath reptile survey", "lizards and slow worms", "the sandy bank", "the warm spell"),
    ("Lake shore snail count", "pond snails and ramshorns", "the reed bed", "the reservoir drawdown"),
    ("Upland flower survey", "orchids and gentians", "the limestone pavement", "the July hay cut"),
    ("Canal bat transect", "pipistrelles and noctules", "the towpath bridge", "the September dusk walk"),
    ("Coastal seal count", "grey seals and common seals", "the sandbar", "the pupping season"),
    ("Garden bee watch", "bumblebees and mason bees", "the herb border", "the lavender bloom"),
    ("Moorland grouse check", "red grouse and golden plovers", "the peat hags", "the heather burn"),
]


def make_instance(iid: str, seed: int):
    """Deterministic task instance. Same structure and difficulty for every
    iid: 10 entries with distinct non-zero amounts, unique largest absolute
    amount, at least 3 negative and 3 positive entries."""
    rng = random.Random(f"{seed}:{iid}")
    while True:
        prefix = "".join(rng.choice(_LETTERS) for _ in range(2))
        amounts = rng.sample([v for v in range(-250, 355, 5) if v != 0], 10)
        absv = sorted((abs(a) for a in amounts), reverse=True)
        neg = [a for a in amounts if a < 0]
        if absv[0] != absv[1] and 3 <= len(neg) <= 7 and len(set(absv)) == 10:
            break
    ids = [f"{prefix}{i:02d}" for i in range(1, 11)]
    tag = "".join(rng.choice("abcdefghjkmnpqrstuvwxyz23456789") for _ in range(4))
    ledger_rel, notes_rel = f"data/ledger-{tag}.txt", f"data/notes-{tag}.txt"
    ledger = "id    amount\n" + "".join(f"{i}  {a:+d}\n" for i, a in zip(ids, amounts))
    title, things, place, nxt = rng.choice(_NOTES)
    notes = (f"{title} (synthetic). Volunteers counted {things} near {place}.\n"
             f"Counts were higher than in the previous round.\n"
             f"The next round is planned after {nxt}.\n")
    remove_i = rng.randrange(10)
    thresholds = sorted({a for a in amounts if a > 0})
    threshold = thresholds[len(thresholds) // 2] - 5  # about half of the positives
    total = sum(amounts)
    top = max(range(10), key=lambda i: abs(amounts[i]))
    answers = {
        "total": str(total),
        "top_id": ids[top],
        "neg_count": str(len(neg)),
        "neg_sum": str(sum(neg)),
        "removed_total": str(total - amounts[remove_i]),
        "above_ids": [i for i, a in zip(ids, amounts) if a > threshold],
        "subject": title.split()[0].lower(),
        "next": nxt.split()[-1].lower(),
    }
    compat = [
        f"Reconcile the ledger in {ledger_rel} and report the checked total.",
        "Which entry has the largest absolute amount?",
        "How many entries are negative, and what do they sum to?",
        f"If entry {ids[remove_i]} were removed, what would the new total be?",
        f"List the IDs of the entries with an amount above {threshold}.",
    ]
    incompat = [
        f"Summarize {notes_rel} in one sentence.",
        "Which two words from it best describe its topic?",
        "What is planned next, according to the notes?",
        "How many kinds of things were counted?",
        "Rewrite the first sentence in plain words.",
    ]
    files = {ledger_rel: ledger, notes_rel: notes}
    return {"iid": iid, "files": files, "turns": {"COMPAT": compat, "INCOMPAT": incompat},
            "answers": answers, "ledger_rel": ledger_rel}


def sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def instance_record(inst, match):
    turns = inst["turns"][match]
    return {"iid": inst["iid"],
            "files": {k: {"bytes": len(v.encode()), "sha256": sha(v)[:12]}
                      for k, v in inst["files"].items()},
            "turn_chars": [len(t) for t in turns],
            "turns_sha256": sha("\n".join(turns))[:12]}


# --- Plans -----------------------------------------------------------------------

# Arm sizes before any reduction (pre-registered, report §4).
ARMS = {"U-COMPAT": (["S025", "S2K", "S8K"], 5),
        "R-COMPAT": (["S025", "S2K", "S8K"], 3),
        "U-INCOMPAT": (["S025", "S8K"], 3)}
# Pre-registered reduction steps, applied in this order as needed.
DROP_STEPS = {
    "1": ("U-INCOMPAT", "sizes", ["S8K"]),
    "2": ("U-COMPAT", "reps", 4),
    "3": ("R-COMPAT", "reps", 2),
    "4": ("U-COMPAT", "reps", 3),
}
REPEATED_IID = "R000"


def arms_after(drops):
    arms = {k: (list(v[0]), v[1]) for k, v in ARMS.items()}
    for d in drops:
        arm, what, val = DROP_STEPS[d]
        sizes, reps = arms[arm]
        arms[arm] = (val, reps) if what == "sizes" else (sizes, val)
    return arms


def build_plan(kind, seed, drops):
    """List of pairs: (arm, size, match, rep, iid, [modes in order])."""
    rng = random.Random(seed)
    pairs = []
    if kind == "smoke":
        pairs = [("SMOKE", "S025", "COMPAT", 1, "SMK1"), ("SMOKE", "S8K", "COMPAT", 1, "SMK2")]
    else:
        for arm, (sizes, reps) in arms_after(drops).items():
            match = "INCOMPAT" if arm.endswith("INCOMPAT") else "COMPAT"
            for size in sizes:
                for rep in range(1, reps + 1):
                    iid = (REPEATED_IID if arm == "R-COMPAT"
                           else f"{arm[2]}-{size}-{rep}")
                    pairs.append((arm, size, match, rep, iid))
    out = []
    for p in pairs:
        modes = ["E", "N"]
        rng.shuffle(modes)
        out.append((*p, modes))
    rng.shuffle(out)
    return out


# --- Parsing ---------------------------------------------------------------------

def parse_stream(raw_path):
    turn, requests, order = 0, {}, []
    tools, init, results = [], {}, []
    for line in open(raw_path, encoding="utf-8"):
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        t = e.get("type")
        if t == "system" and e.get("subtype") == "init" and not init:
            skills = e.get("skills") or []
            init = {"model": e.get("model"), "version": e.get("claude_code_version"),
                    "tools": e.get("tools"), "skill_count": len(skills),
                    "work_skill_listed": "work" in skills}
        elif t == "assistant" and not e.get("parent_tool_use_id"):
            m = e["message"]
            if m["id"] not in requests:
                order.append(m["id"])
                requests[m["id"]] = {"turn": turn + 1, "usage": {}, "tools": []}
            requests[m["id"]]["usage"] = m.get("usage", {})
            for c in m.get("content", []):
                if c.get("type") == "tool_use":
                    inp = c.get("input", {})
                    rec = {"turn": turn + 1, "name": c.get("name"),
                           "skill": inp.get("skill") or inp.get("command"),
                           "file": (inp.get("file_path") or "").split("/")[-1],
                           "msg": len(order)}
                    tools.append(rec)
        elif t == "result":
            u = e.get("usage") or {}
            results.append({
                "turn": turn + 1, "is_error": e.get("is_error"),
                "subtype": e.get("subtype"), "duration_ms": e.get("duration_ms"),
                "total_cost_usd": e.get("total_cost_usd"),
                "usage": {k: u.get(k) for k in ["input_tokens",
                          "cache_creation_input_tokens", "cache_read_input_tokens",
                          "output_tokens"]},
                "permission_denials": len(e.get("permission_denials") or []),
                "answer": e.get("result") or "",  # local summary only
            })
            turn += 1
    reqs = []
    for mid in order:
        u = requests[mid]["usage"]
        i, cc, cr = (u.get("input_tokens", 0), u.get("cache_creation_input_tokens", 0),
                     u.get("cache_read_input_tokens", 0))
        reqs.append({"turn": requests[mid]["turn"], "input": i, "cache_creation": cc,
                     "cache_read": cr, "prompt_total": i + cc + cr,
                     "output": u.get("output_tokens", 0)})
    return {"init": init, "requests": reqs, "tool_calls": tools, "turns": results}


def summarize_bodies(raw_dir: Path, turn1: str):
    """Structural summary only: per request, whether the skill core and the
    appendix markers and the turn-1 text appear, and how often."""
    out = []
    index = raw_dir / "index.jsonl"
    if not index.exists():
        return out
    key = turn1[:50]
    for line in index.read_text(encoding="utf-8").splitlines():
        try:
            entry = json.loads(line)
            body = json.loads((raw_dir / entry["request_file"]).read_text(encoding="utf-8"))
        except (OSError, KeyError, json.JSONDecodeError):
            continue
        msgs = body.get("messages") if isinstance(body, dict) else None
        if not msgs or body.get("model") != MODEL:
            continue
        text = "".join(base.text_of(b) for m in msgs
                       for b in (m["content"] if isinstance(m["content"], list) else [m["content"]]))
        out.append({"thread_type": (body.get("thread") or {}).get("type"),
                    "core": base.CORE_MARKER in text,
                    "appendix": base.APPENDIX_MARKER in text,
                    "turn1_count": text.count(key),
                    "command_tag": "<command-name>" in text})
    return out


# --- Correctness -------------------------------------------------------------------

def checks(match, answers, texts):
    """Per-turn string checks against the instance's known answers."""
    a = answers
    t = [x or "" for x in texts] + [""] * (TURNS - len(texts))
    norm = lambda s: s.replace(",", "").replace("−", "-")
    if match == "COMPAT":
        return [a["total"] in norm(t[0]),
                a["top_id"] in t[1],
                a["neg_count"] in t[2] and a["neg_sum"].lstrip("-") in norm(t[2]),
                a["removed_total"] in norm(t[3]),
                all(i in t[4] for i in a["above_ids"])]
    return [a["subject"] in t[0].lower(),
            len(t[1]) > 0,
            a["next"] in t[2].lower(),
            ("two" in t[3].lower() or "2" in t[3]),
            len(t[4]) > 0]


# --- Analysis ----------------------------------------------------------------------

def analyze(summary, smoke=None):
    rows = [r for r in summary if r["plan"] == "matrix" and r["requests"]]
    m1 = lambda r: r["requests"][0]["prompt_total"]
    m1_cc = lambda r: r["requests"][0]["cache_creation"]
    m1_cr = lambda r: r["requests"][0]["cache_read"]
    cum = lambda r: sum(q["prompt_total"] for q in r["requests"])
    cum_cc = lambda r: sum(q["cache_creation"] for q in r["requests"])
    cum_cr = lambda r: sum(q["cache_read"] for q in r["requests"])
    out_tok = lambda r: sum(t["usage"]["output_tokens"] or 0 for t in r["turns"])
    usd = lambda r: r["list_cost_usd_estimate"] or 0
    reqs = lambda r: len(r["requests"])
    ntools = lambda r: len(r["tool_calls"])
    ms = lambda r: sum(t["duration_ms"] or 0 for t in r["turns"])
    first_of_turn = lambda r, k: next((q["prompt_total"] for q in r["requests"] if q["turn"] == k), None)
    skill_turn = lambda r: next((t["turn"] for t in r["tool_calls"] if t["name"] == "Skill"), 0)

    def shape(r):
        """N only: 'seq' if Skill and Read came in different requests of turn 1,
        'par' if in the same request, '-' if no Skill call in turn 1."""
        t1 = [t for t in r["tool_calls"] if t["turn"] == 1]
        sk = [t["msg"] for t in t1 if t["name"] == "Skill"]
        rd = [t["msg"] for t in t1 if t["name"] == "Read"]
        if not sk:
            return "-"
        return "par" if rd and min(rd) == sk[0] else "seq"

    def stats(v):
        v = [x for x in v if x is not None]
        if not v:
            return "-"
        return f"{st.median(v):g} [{min(v):g}..{max(v):g}]"

    bad = [r["seq"] for r in summary if r["plan"] == "matrix" and
           (r["exit_code"] != 0 or len(r["turns"]) != TURNS or
            any(t["is_error"] or t["permission_denials"] for t in r["turns"]))]
    pairs = {}
    for r in rows:
        pairs.setdefault((r["arm"], r["size"], r["rep"]), {})[r["mode"]] = r
    full = {k: p for k, p in pairs.items() if "E" in p and "N" in p}
    print(f"matrix sessions {len(rows)}; complete pairs {len(full)}; problem runs {bad}; "
          f"matrix spend ${sum(usd(r) for r in summary if r['plan'] == 'matrix'):.4f}")
    print("versions/models:", sorted({(r['init'].get('version'), r['init'].get('model'))
                                       for r in rows}))
    cov = {}
    for (arm, size, rep) in full:
        cov.setdefault((arm, size), []).append(rep)
    print("coverage (arm, size): reps", {k: sorted(v) for k, v in sorted(cov.items())})

    groups = sorted({(r["arm"], r["size"]) for r in rows},
                    key=lambda k: (k[0], SIZES.index(k[1])))
    print("\n## per condition: median [min..max]")
    print("| Arm | Size | Mode | n | M1 | M1 cache read | M1 cache creation | REQ | Tools | "
          "CUM | CUM cache read | CUM cache creation | Output | USD | duration_ms | "
          "Skill turn | Correct (of 5 per session) |")
    print("|" + "---|" * 17)
    for arm, size in groups:
        for mode in ["E", "N"]:
            rs = [r for r in rows if (r["arm"], r["size"], r["mode"]) == (arm, size, mode)]
            if not rs:
                continue
            ok = [sum(checks(r["match"], r["answers"], [t["answer"] for t in r["turns"]]))
                  for r in rs]
            print(f"| {arm} | {size} | {mode} | {len(rs)} | {stats([m1(r) for r in rs])} | "
                  f"{stats([m1_cr(r) for r in rs])} | {stats([m1_cc(r) for r in rs])} | "
                  f"{stats([reqs(r) for r in rs])} | {stats([ntools(r) for r in rs])} | "
                  f"{stats([cum(r) for r in rs])} | {stats([cum_cr(r) for r in rs])} | "
                  f"{stats([cum_cc(r) for r in rs])} | {stats([out_tok(r) for r in rs])} | "
                  f"{stats([round(usd(r), 4) for r in rs])} | {stats([ms(r) for r in rs])} | "
                  f"{','.join(str(skill_turn(r)) for r in rs)} | {stats(ok)} |")

    def d(p, f):
        a, b = f(p["E"]), f(p["N"])
        return None if a is None or b is None else a - b

    print("\n## paired E - N: median [min..max] (n pairs)")
    print("| Arm | Size | n | M1 | M1 cache creation | REQ | Tools | CUM | CUM cache creation | "
          "Turn-5 first request | Output | USD | N shape (seq/par/-) |")
    print("|" + "---|" * 13)
    for arm, size in groups:
        ps = [p for k, p in full.items() if k[:2] == (arm, size)]
        if not ps:
            continue
        shapes = [shape(p["N"]) for p in ps]
        print(f"| {arm} | {size} | {len(ps)} | {stats([d(p, m1) for p in ps])} | "
              f"{stats([d(p, m1_cc) for p in ps])} | {stats([d(p, reqs) for p in ps])} | "
              f"{stats([d(p, ntools) for p in ps])} | {stats([d(p, cum) for p in ps])} | "
              f"{stats([d(p, cum_cc) for p in ps])} | "
              f"{stats([d(p, lambda r: first_of_turn(r, TURNS)) for p in ps])} | "
              f"{stats([d(p, out_tok) for p in ps])} | "
              f"{stats([round(d(p, usd), 4) for p in ps])} | "
              f"{shapes.count('seq')}/{shapes.count('par')}/{shapes.count('-')} |")

    print("\n## per pair (all pairs, nothing excluded)")
    print("| Arm | Size | Rep | Instance | Order | E−N M1 | E−N CUM | E−N REQ | E−N USD | "
          "E M1 cache creation | N shape | E correct | N correct |")
    print("|" + "---|" * 13)
    for k in sorted(full, key=lambda k: (k[0], SIZES.index(k[1]), k[2])):
        p = full[k]
        order = "E first" if p["E"]["seq"] < p["N"]["seq"] else "N first"
        ce = sum(checks(p["E"]["match"], p["E"]["answers"], [t["answer"] for t in p["E"]["turns"]]))
        cn = sum(checks(p["N"]["match"], p["N"]["answers"], [t["answer"] for t in p["N"]["turns"]]))
        print(f"| {k[0]} | {k[1]} | {k[2]} | {p['E']['iid']} | {order} | {d(p, m1)} | "
              f"{d(p, cum)} | {d(p, reqs)} | {round(d(p, usd), 4)} | {m1_cc(p['E'])} | "
              f"{shape(p['N'])} | {ce}/5 | {cn}/5 |")

    print("\n## per turn, COMPAT arms: median prompt of the turn's first request, E and N")
    for arm in ["U-COMPAT", "R-COMPAT"]:
        for size in SIZES:
            for mode in ["E", "N"]:
                rs = [r for r in rows if (r["arm"], r["size"], r["mode"]) == (arm, size, mode)]
                if rs:
                    v = [st.median([first_of_turn(r, k) for r in rs]) for k in range(1, TURNS + 1)]
                    rq = [st.median([sum(q["turn"] == k for q in r["requests"]) for r in rs])
                          for k in range(1, TURNS + 1)]
                    share = st.median([m1(r) / cum(r) for r in rs])
                    print(f"{arm} {size} {mode}: first-request prompt by turn {v}; "
                          f"requests by turn {rq}; M1/CUM {share:.3f}")

    print("\n## hypothesis inputs")
    for size in SIZES:
        u = [p for k, p in full.items() if k[:2] == ("U-COMPAT", size)]
        rr = [p for k, p in full.items() if k[:2] == ("R-COMPAT", size)]
        if not u or not rr:
            continue
        du, dr = st.median([d(p, usd) for p in u]), st.median([d(p, usd) for p in rr])
        ru = [d(p, usd) for p in u]
        rrv = [d(p, usd) for p in rr]
        overlap = not (max(ru) < min(rrv) or max(rrv) < min(ru))
        # E request-1 cache creation: unique arm vs repeated arm after its first session
        e_u = [m1_cc(p["E"]) for p in u]
        e_r = sorted([p["E"] for p in rr], key=lambda r: r["seq"])
        e_r_later = [m1_cc(r) for r in e_r[1:]]
        print(f"H1 {size}: median E−N USD unique {du:.4f} vs repeated {dr:.4f} "
              f"(diff {du - dr:+.4f}); ranges overlap: {overlap}")
        print(f"H1m {size}: E req-1 cache creation unique {stats(e_u)} vs repeated after first "
              f"{stats(e_r_later)}; diff of medians "
              f"{st.median(e_u) - st.median(e_r_later) if e_r_later else None}; "
              f"E−N M1 median (unique) {st.median([d(p, m1) for p in u])}")
        print(f"H2 {size}: E−N M1 unique {stats([d(p, m1) for p in u])}")
        print(f"H4 {size}: E−N turn-{TURNS} first request unique "
              f"{stats([d(p, lambda r: first_of_turn(r, TURNS)) for p in u])}")
        ns = [p["N"] for p in u + rr]
        print(f"H3 {size}: N Skill in turn 1 {sum(skill_turn(r) == 1 for r in ns)}/{len(ns)}; "
              f"shapes {[shape(r) for r in ns]}; CUM E<N {sum(d(p, cum) < 0 for p in u)}/{len(u)} (unique)")
    for size in SIZES:
        inc = [p for k, p in full.items() if k[:2] == ("U-INCOMPAT", size)]
        if not inc:
            continue
        extra = [any(t["name"] == "Read" and t["file"].startswith("ledger")
                     for t in p["E"]["tool_calls"]) or
                 any("STATUS: RECONCILED" in t["answer"] for t in p["E"]["turns"]) for p in inc]
        print(f"H5 {size}: CUM E>N {sum(d(p, cum) > 0 for p in inc)}/{len(inc)}; "
              f"USD E>N {sum(d(p, usd) > 0 for p in inc)}/{len(inc)}; "
              f"E unrequested work {sum(extra)}/{len(inc)}; N Skill calls "
              f"{sum(bool(skill_turn(p['N'])) for p in inc)}/{len(inc)}")
    sp = [max(v) - min(v) for (arm, size) in groups for mode in "EN"
          if (v := [m1(r) for r in rows if (r["arm"], r["size"], r["mode"]) == (arm, size, mode)])]
    print("M1 within-condition spreads:", sorted(sp))


# --- Main --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("fixture_dir", type=Path)
    ap.add_argument("output_dir", type=Path)
    ap.add_argument("--plan", choices=["smoke", "matrix"], default="matrix")
    ap.add_argument("--seed", type=int, default=20261012)
    ap.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    ap.add_argument("--drop", nargs="*", default=[], choices=list(DROP_STEPS))
    ap.add_argument("--raw-bodies", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--analyze", action="store_true")
    ap.add_argument("--instances", action="store_true",
                    help="print instance sizes and hashes for the plan and exit")
    a = ap.parse_args()
    fx, out = a.fixture_dir.resolve(), a.output_dir.resolve()
    if a.analyze:
        analyze(json.loads((out / "summary.json").read_text()))
        return
    plan = build_plan(a.plan, a.seed, a.drop)
    if a.instances or a.dry_run:
        seen = set()
        for arm, size, match, rep, iid, modes in plan:
            if a.dry_run:
                print(f"  {arm} {size} {match} rep{rep} {iid} {modes}")
            if a.instances and (iid, match) not in seen:
                seen.add((iid, match))
                print(json.dumps(instance_record(make_instance(iid, a.seed), match)))
        n = sum(len(p[5]) for p in plan)
        print(f"sessions={n} pairs={len(plan)} drops={a.drop}")
        for s, md in SKILL_MD.items():
            print(f"{s}: SKILL.md bytes={len(md.encode())} sha256={sha(md)[:12]}")
        return
    out.mkdir(parents=True, exist_ok=True)
    base.check_dirs(fx, out)
    summary_path = out / "summary.json"
    summary = json.loads(summary_path.read_text()) if summary_path.exists() else []
    done = {(r["plan"], r["arm"], r["size"], r["rep"], r["mode"]) for r in summary}
    spent = sum(r.get("list_cost_usd_estimate") or 0 for r in summary)
    print(f"plan={a.plan} drops={a.drop} seed={a.seed} pairs={len(plan)} "
          f"spent so far=${spent:.4f} budget=${a.budget_usd:.2f}", flush=True)
    seq = len(summary)
    consecutive_bad = 0
    for blk, (arm, size, match, rep, iid, modes) in enumerate(plan, 1):
        inst = make_instance(iid, a.seed)
        for pos, mode in enumerate(modes, 1):
            if (a.plan, arm, size, rep, mode) in done:
                continue
            if spent + PER_RUN_CAP_USD > a.budget_usd:
                sys.exit(f"budget stop: spent ${spent:.4f}, cap ${a.budget_usd:.2f}")
            seq += 1
            name = f"{seq:03d}_{arm}_{size}_r{rep}_{mode}"
            raw = out / f"{name}.jsonl"
            raw_dir = None
            if a.raw_bodies:
                raw_dir = out / "bodies" / name
                if raw_dir.exists():
                    shutil.rmtree(raw_dir)  # our own output only
                raw_dir.mkdir(parents=True)
            turns = list(inst["turns"][match])
            turns[0] = PREFIX[mode] + turns[0]
            files = {SKILL_REL: SKILL_MD[size], **inst["files"]}
            started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            with base.Fixture(fx, files):
                rc, err, wall, turn_wall = base.run_session(fx, turns, raw, raw_dir)
            if any(fx.iterdir()):
                sys.exit(f"fixture dir not clean after run {seq}: {list(fx.iterdir())}")
            parsed = parse_stream(raw)
            last = parsed["turns"][-1] if parsed["turns"] else {}
            rec = {"seq": seq, "plan": a.plan, "seed": a.seed, "block": blk,
                   "position": pos, "arm": arm, "size": size, "match": match,
                   "rep": rep, "mode": mode, "iid": iid,
                   "instance": instance_record(inst, match),
                   "answers": inst["answers"],
                   "skill_sha256": sha(SKILL_MD[size])[:12],
                   "prompt_chars": [len(t) for t in turns],
                   "prompt_bytes": [len(t.encode()) for t in turns],
                   "prompt_sha256": [sha(t)[:12] for t in turns],
                   "started_utc": started, "wall_s": wall, "turn_wall_s": turn_wall,
                   "exit_code": rc, "stderr_tail": err.strip()[-300:],
                   "list_cost_usd_estimate": last.get("total_cost_usd"),
                   **parsed}
            if raw_dir is not None:
                rec["bodies"] = summarize_bodies(raw_dir, inst["turns"][match][0])
            spent += rec.get("list_cost_usd_estimate") or 0
            summary.append(rec)
            summary_path.write_text(json.dumps(summary, indent=1, ensure_ascii=False))
            ok = checks(match, inst["answers"], [t["answer"] for t in rec["turns"]])
            print(f"[{seq:03d}] {arm} {size} r{rep} {iid} {mode} rc={rc} "
                  f"turns={len(rec['turns'])} reqs={len(rec['requests'])} "
                  f"tools={[(t['turn'], t['name']) for t in rec['tool_calls']]} "
                  f"ok={sum(ok)}/5 cost={rec.get('list_cost_usd_estimate')} total=${spent:.4f}",
                  flush=True)
            bad = rc != 0 or len(rec["turns"]) != TURNS
            consecutive_bad = consecutive_bad + 1 if bad else 0
            if consecutive_bad >= 2:
                sys.exit("stop rule: 2 consecutive incomplete or failed sessions")


if __name__ == "__main__":
    main()
