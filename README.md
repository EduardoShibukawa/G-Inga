# G-Ingá

A personal, incrementally built agentic SDLC harness for Claude Code. It aims to deliver verified work with fewer tokens, and it's also a learning project. The name blends *ginga* (adaptation and movement) with Ingá and Maringá, Paraná, Brazil (see [brand notes](docs/brand-and-roadmap.md), `proposed`).

**Status:** discovery (M0). Nothing is implemented yet. See [docs/decision-map.md](docs/decision-map.md).

## Repository checks

Install [mise](https://mise.jdx.dev/installing-mise.html) and Git, then from the repository root:

```sh
mise install        # the pinned Bun
mise run validate   # every deterministic check
```

Platforms, other commands and fixes for errors such as `mise: command not found` are in [development](docs/development.md).
