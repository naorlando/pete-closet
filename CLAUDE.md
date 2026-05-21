# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Pete's Closet** — a children's dress-up / outfit minigame featuring Pete the Cat.

- Target audience: ages 3–8
- Genre: drag-and-drop avatar customization / dress-up game
- Theme: Pete the Cat (official book character — see licensing notes below)
- NOT a "girls fashion game" — universal, inclusive design

## Operating Mode

This project uses a **multi-agent orchestration model**. The main Claude instance is the COORDINATOR — it plans, delegates, and synthesizes. It does NOT write code inline.

All implementation is delegated to focused sub-agents:

| Agent Role      | Responsibility                                                      |
| --------------- | ------------------------------------------------------------------- |
| Research Agent  | Genre research, UX benchmarks, Pete visual references               |
| Asset Agent     | Image sourcing, sprite layer breakdown, naming conventions          |
| Game Design     | Gameplay loop, drag/drop UX, reward mechanics, progression          |
| Frontend Agent  | Component architecture, rendering, state, interactions              |
| QA Agent        | Bug reports, UX inconsistencies, mobile responsiveness              |

Sub-agents receive fresh contexts — always include relevant prior decisions in the prompt.

## Development Phases

```
Phase 1 → Research
Phase 2 → Product definition
Phase 3 → Architecture
Phase 4 → Asset planning
Phase 5 → UI prototype
Phase 6 → Gameplay implementation
Phase 7 → QA / polish
```

Never jump to implementation without completing architecture. Each phase must define deliverables, assumptions, risks, and next step.

## Engineering Standards

- Modular architecture — isolated scenes/components, no monolith files
- Reusable components with props-driven behavior
- Deterministic game state — no hidden side effects
- Large touch targets (kids use fat fingers)
- Minimal text dependency — icons and visuals over labels
- Positive-only feedback — no failure states that frustrate young children

## Tech Stack (TBD — Phase 3)

Decision pending. Candidates:
- **Phaser 3** (if complex sprite/physics needed)
- **React + CSS transforms** (if drag-drop is the only mechanic)
- **Pixi.js** (if performance matters and React overhead is undesirable)

When decided, document here with the tradeoffs log.

## Licensing / Legal Constraints

- Pete the Cat is a trademarked character (HarperCollins / James Dean)
- Do NOT use official artwork — original art only, inspired by the aesthetic
- Pete's signature traits: blue cat, big expressive eyes, red shoes, cool attitude
- Any asset naming must avoid trademark terms in production builds

## Child UX Constraints

- No reading required for core interactions
- All drag targets must be visually obvious (glow, bounce, scale hints)
- Undo is always available — kids make mistakes
- No timers or score pressure unless explicitly designed for positive reinforcement
- Sound feedback on successful outfit placements (optional but recommended)

## Asset Conventions (when established)

- Sprites as PNG with transparent backgrounds
- Layered rendering order: background → body → clothing → accessories → hat/head
- Naming: `pete-body-base.png`, `outfit-groovy-shirt.png`, `accessory-sunglasses.png`
- All assets in `/src/assets/` (or equivalent) once structure is decided

## Context Management

When working on this repo, maintain:

- **HOT**: current task, relevant architecture, active file list, recent decisions
- **WARM**: completed tasks summary, discarded approaches
- **COLD**: archive long explorations and irrelevant research

If context grows noisy — compact it. Do not carry forward raw research dumps.
