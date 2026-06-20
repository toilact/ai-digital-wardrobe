# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AI Digital Wardrobe — upload clothing photos, AI cuts them out and labels them, store a structured wardrobe, get outfit suggestions. Two runtimes in one monorepo: a Next.js full-stack web app and a Python FastAPI computer-vision service. They are separate processes that talk over HTTP.

## Monorepo layout & boundaries

pnpm workspaces + Turborepo. Three workspaces:

- `apps/web` (workspace `web`) — Next.js 16 App Router, the entire user-facing app AND its backend (route handlers under `src/app/api/**`). Firebase Auth + Firestore, Cloudinary for image hosting, Gemini for LLM.
- `services/ai` (`ai-service`) — FastAPI + PyTorch. Single big module `app.py` (MobileSAM cutout, CLIP labeling/embedding, alpha-matting refine) plus `garment_parse.py` (Segformer multi-garment parsing). Has its own Python venv, NOT managed by pnpm.
- `packages/shared` (`@adw/shared`) — framework-free domain logic shared by the web app (currently `vip.ts`). Imported as `@adw/shared`; source is consumed directly as TS (`main`/`exports` point at `./src/index.ts`), no build step.

The web app reaches the AI service via `process.env.AI_SERVICE_URL` (defaults to `http://127.0.0.1:8000`). Web API routes act as proxies that add Firebase auth + Cloudinary persistence around the AI service's stateless image endpoints (`/cutout`, `/parse-person`, `/label`, `/health`). Never call Firebase/Cloudinary from the Python service — that boundary is deliberate.

## Commands

Run from repo root unless noted.

- `pnpm install` — installs JS deps. `.npmrc` sets `node-linker=hoisted` and `pnpm-workspace.yaml` whitelists `sharp` under `onlyBuiltDependencies` — both are required for native modules (firebase/sharp) to work; don't remove them.
- `pnpm dev` / `pnpm build` / `pnpm lint` — Turbo fan-out. In practice `dev`/`build` only drive the web app.
- Web only: `pnpm --filter web dev` (Next dev server on :3000), `pnpm --filter web build`, `pnpm --filter web exec tsc --noEmit` (typecheck without building — faster).
- Web tests (vitest, node env, `src/**/*.test.ts`): `pnpm --filter web test`. Single file: `pnpm --filter web test src/lib/wardrobe/itemSchema.test.ts`.

### AI service (do not start it via Turbo)

It needs its venv + env vars, so start it directly:

```bash
cd services/ai
.venv/bin/pip install -r requirements.txt        # first time
pnpm --filter ai-service dev                      # uvicorn on 127.0.0.1:8000 with SAM enabled
.venv/bin/python -m pytest -q                      # all python tests
.venv/bin/python -m pytest tests/test_garment_parse.py -v   # single file
```

`pnpm --filter ai-service dev` wraps the uvicorn command and sets `SAM_CHECKPOINT`/`ENABLE_SAM`. MobileSAM needs `services/ai/checkpoints/mobile_sam.pt` downloaded manually (see README "Download MobileSAM Checkpoint"); `/health` returns `sam_ready: true` when loaded.

## Configuration

- Web env lives in `apps/web/.env.local` (see `apps/web/.env.local.example`). Firebase (client `NEXT_PUBLIC_*` + admin `FIREBASE_*`), Cloudinary, `GEMINI_API_KEY`/`GEMINI_MODEL`, SMTP (`EMAIL_*`), `AI_SERVICE_URL`, VIP payment vars, `VIP_ADMIN_EMAILS`.
- AI service is configured entirely via environment variables read in `app.py` (`CLIP_*`, `SAM_*`, plus many alpha-matting/grabcut tuning knobs) and `garment_parse.py` (`SEGFORMER_DEVICE`, `SEGFORMER_MODEL`).

### Apple Silicon / device gotcha

Segformer (`garment_parse.py`) **must run on CPU** — on the M-series MPS backend it collapses its output to all-background. It defaults to CPU via `SEGFORMER_DEVICE` and that is intentional; keep it separate from `CLIP_DEVICE` (CLIP may use MPS). Don't "fix" Segformer to use MPS.

## Key data flow

Two ingest paths converge on Firestore `wardrobeItems`:
1. Person photo → `POST /api/wardrobe/parse-person` → AI `/parse-person` (Segformer splits every garment, reuses the alpha-matting cutout pipeline, returns per-garment cutout + CLIP embedding) → review grid → `POST /api/wardrobe/confirm`.
2. Single flat-lay → existing `/cutout` (MobileSAM) path.

Semantic attributes (`formality`, `styleTags`, `warmth`) are added by Gemini at label time (`src/lib/ai/semanticTags.ts`), not by the CV service. The structured item schema/validation lives in `apps/web/src/lib/wardrobe/itemSchema.ts` (zod), with the `category` (VN) ↔ `slot` (recsys) duality intentional for backward-compat with existing UI.

## Active work — read before editing

An in-progress feature branch (`feat/m1a-structured-wardrobe`) is mid-execution via the subagent-driven-development workflow. Before touching wardrobe ingest / AI parsing code, read:
- `docs/v2-direction.md` — overall v2 roadmap (parsing → recommendation → try-on → commerce).
- `docs/superpowers/specs/2026-06-20-m1a-structured-wardrobe-design.md` and `docs/superpowers/plans/2026-06-20-m1a-structured-wardrobe.md` — the M1a design + task plan.
- `.superpowers/sdd/progress.md` — the execution ledger (source of truth for which tasks are done; trust it + `git log` over assumptions).
