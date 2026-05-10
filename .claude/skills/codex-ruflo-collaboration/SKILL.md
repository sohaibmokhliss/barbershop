---
name: codex-ruflo-collaboration
description: Use when coordinating work in this repository through Codex with Ruflo enabled. Applies to agent selection, skill discovery, repo-local conventions, and keeping Codex execution aligned with Ruflo scaffolding.
---

# Codex Ruflo Collaboration

Use repo-local agents and skills before generic ones.

## Conventions

- Prefer `.claude/agents/*.md` and `.claude/skills/*/SKILL.md` as the project source of truth.
- Treat generated `.claude/agents/*.yaml` files as metadata snapshots, not the primary instructions.
- Keep instructions specific to this repo's stack and constraints.
- When Rufflo-generated files are incomplete, patch them in-place rather than assuming the generator is authoritative.

## Agent routing

- `coder`: implementation
- `architect`: structure and larger designs
- `tester`: verification
- `security-architect`: auth and secret handling
- `reviewer`: final review

## Codex adaptation

- Prefer concrete file edits over abstract setup notes.
- Keep instructions concise and executable from the workspace.
- When tools disagree about project state, trust the filesystem over generated status output.

