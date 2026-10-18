# Gira-G Macro Map Schema Validation in the G-Ingá Slicing Evaluator

**Record type:** research and compatibility proposal  
**Status:** proposed; not an approved specification or architectural decision  
**Reviewed:** 2026-10-18  
**Evidence baseline:**

- G-Ingá `main`: `860792469bf0c7b56d37d98c8dc07079ce816928`
- Gira-G `main`: `22d12ee75a9af87cc44e837492b547dc5f0932e7`

This note formalizes the observed compatibility gap and proposes a regression matrix. It does not authorize product-code changes, approve support for Gira-G schema 2, change an approved G-Ingá specification, or change the status of any task.

## 1. Finding

The direct-index fallback in `tools/eval/evaluate_girag_slicing.ts`, inside `queryGiragSlice`, parses the Macro Map with `JSON.parse` and then accesses `data.nodes` and `data.relationships` without first validating `schema_version` or the expected structure. As implemented at the evidence baseline, an unrecognized schema can be treated as a usable graph as long as its payload happens to contain fields that the traversal expects.

The current canonical G-Ingá index at `docs/architecture/macro-map.json` declares `"schema_version": "1.0.0"` (a string). The Gira-G versioned-publication specification at the evidence baseline proposes a new schema with `schema_version: 2` (an integer), strict decoding, and rejection of unsupported schemas. That Gira-G specification remains `draft`; the proposal must not be treated as an implemented or approved producer contract.

The relevant test file is `tools/eval/evaluate_girag_slicing.test.ts`. It covers scenario integrity, benchmark metrics, and live slicing integration, but currently has no explicit test matrix for missing, malformed, or unsupported Macro Map schema versions.

## 2. Compatibility boundary

The evaluator is a consumer of Gira-G output. A producer-side schema proposal does not automatically grant consumer-side support.

Proposed rules for a future, separately authorized implementation:

1. Maintain an explicit allowlist of schema versions whose structure this evaluator has actually been tested to consume.
2. At the current baseline, the checked-in canonical Macro Map uses string version `"1.0.0"`. Preserve that supported case only while the existing structure is confirmed compatible.
3. Reject integer schema `2` until consumer support for that version is explicitly implemented and verified against the actual, merged Gira-G producer contract. Do not infer support from the presence of familiar fields such as `nodes`.
4. Reject missing, `null`, empty, wrong-type, and unknown `schema_version` values explicitly. This includes unknown integers such as `999`, unknown strings, and the wrong representation of a known version.
5. Validate the minimum structure needed by traversal after validating the schema: `nodes` and `relationships` must be arrays; nodes used by the query must have a string `id`; relationships used by traversal must expose string `source_id` and `target_id`.
6. Report schema errors separately from malformed JSON, invalid graph structure, and a valid graph in which the requested node is absent. A malformed or unsupported file must not be reported as merely “node not found”.
7. Apply the same schema gate to the direct-index fallback whether the Gira-G CLI is unavailable or a CLI attempt fails. A fallback must not become an unvalidated compatibility escape hatch.

The exact runtime error strings and public error-code shape remain implementation decisions. The rules above are a proposal, not an existing error contract.

## 3. Proposed regression matrix

| Case | Fixture | Expected behavior |
|---|---|---|
| Supported current version | `schema_version: "1.0.0"`, valid `nodes` and `relationships`, requested node present | Traversal succeeds and returns the expected focal node, neighbors, and relationships |
| Supported current version, absent node | Valid supported map, requested node absent | Explicit “node not found” result after schema and structure validation |
| Missing version | No `schema_version` field | Failure with a schema-version diagnostic |
| Null or empty version | `schema_version: null` or `""` | Failure with a schema-version diagnostic |
| Wrong type | Boolean, object, array, or number other than an explicitly supported integer version | Failure with a schema-version diagnostic |
| Proposed but not yet supported version | `schema_version: 2` with otherwise valid graph fields | Explicit unsupported-schema failure until tested support is authorized and implemented |
| Unknown version | `schema_version: 999` or an unknown string | Explicit unsupported-schema failure |
| Wrong representation | `schema_version: "2"` when only integer `2` would be supported, or vice versa | Failure; do not coerce values |
| Malformed JSON | Invalid JSON bytes/text | Parse failure; no graph traversal |
| Invalid top-level structure | Supported version but `nodes` or `relationships` absent or not arrays | Structure failure; do not silently substitute empty arrays |
| Invalid node shape | A traversed node has no string `id` | Structure failure |
| Invalid relationship shape | A relevant relationship lacks string `source_id` or `target_id` | Structure failure |
| CLI unavailable | No usable Gira-G binary; supported fixture supplied | The fallback validates the schema and succeeds only for a supported, valid map |
| CLI attempt fails | CLI attempt fails, then fallback sees an unsupported schema | Fallback must also reject; CLI failure must not turn an unsupported map into success |

Recommended test grouping:

- Unit tests for a pure schema/structure validation helper.
- `queryGiragSlice` tests using temporary fixtures for the success and failure matrix.
- A regression test proving schema 2 with otherwise valid `nodes` is rejected until compatibility is deliberately added.
- A regression test proving unknown versions never become successful traversal results.
- Preserve the existing live-index integration test as a separate integration check rather than making every unit case depend on a local Gira-G binary.

## 4. Related Gira-G gates already documented

The current Gira-G draft specification already requires an explicit supported-schema policy, strict decoding for schema 2, an unsupported-schema error, and no silent downgrade. Its acceptance criteria also require auditing consumers and preventing new fields from being lost in `CanonicalJSON` or `cloneMacroMap`.

This note therefore does not duplicate the Gira-G regression plan. It records the specific G-Ingá consumer gap and the cross-repository condition: G-Ingá should only add schema 2 to its allowlist once the producer contract is no longer merely proposed and the consumer change has its own verified tests.

## 5. Scope and open questions

- No runtime code or tests were changed by this record.
- G-Ingá's approved Minimal V1 specification and accepted ADRs were not modified.
- Gira-G's versioned-publication specification remains `draft`; its parent task remains `todo` / `tier: heavy` unless the owner separately changes that state.
- This note does not approve schema 2, authorize heavy work, or create a child task.
- The existing CLI-first path catches CLI errors before trying the direct traversal fallback. Whether to preserve or revise that broader fallback policy is a separate question; this note only requires that the fallback itself validate the schema and data shape.

**Recommended next step:** use this evidence to define a bounded implementation task once the owner authorizes it and the supported-version policy is settled. Run the new unit tests and repository validation against the exact implementation commit before claiming the finding is fixed.

## 6. Sources at the evidence baseline

- [G-Ingá evaluator](https://github.com/EduardoShibukawa/G-Inga/blob/860792469bf0c7b56d37d98c8dc07079ce816928/tools/eval/evaluate_girag_slicing.ts)
- [G-Ingá evaluator tests](https://github.com/EduardoShibukawa/G-Inga/blob/860792469bf0c7b56d37d98c8dc07079ce816928/tools/eval/evaluate_girag_slicing.test.ts)
- [G-Ingá canonical Macro Map](https://github.com/EduardoShibukawa/G-Inga/blob/860792469bf0c7b56d37d98c8dc07079ce816928/docs/architecture/macro-map.json)
- [Gira-G versioned-publication draft specification](https://github.com/EduardoShibukawa/gira-g/blob/22d12ee75a9af87cc44e837492b547dc5f0932e7/specs/2026-10-17-gira-versioned-publication.md)
