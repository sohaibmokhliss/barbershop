# Barbershop Agent Guide

This repository is initialized for Ruflo and adapted for Codex.

Project-local sources of truth:
- Agents: `.claude/agents/*.md`
- Skills: `.claude/skills/*/SKILL.md`
- Ruflo settings: `.claude/settings.json`

Codex notes:
- Prefer repo-local agent and skill instructions before generic defaults.
- Treat `.claude/agents/*.yaml` as generated metadata, not primary guidance.
- Keep Supabase service-role usage server-only.
- Validate significant changes with `npm run lint`.

Recommended roles:
- `coder` for implementation
- `architect` for larger design work
- `tester` for verification
- `security-architect` for auth and secret handling
- `reviewer` for final review

