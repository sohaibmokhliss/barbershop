---
name: codex-ruflo-collaboration
description: Use when coordinating work in this repository through Codex with Ruflo enabled. Applies to repo-local agent selection, skill discovery, and keeping Codex execution aligned with Ruflo scaffolding.
---

# Codex Ruflo Collaboration

- Prefer repo-local instructions over generic defaults.
- Use `.claude/agents/*.md` as the primary agent definitions.
- Use `.claude/skills/*/SKILL.md` as the richer skill source when both `.agents` and `.claude` copies exist.
- Trust filesystem state over generated status output when Ruflo reports inconsistent setup.

