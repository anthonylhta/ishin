# design-sync NOTES — Tone Translator

This repo is a **Next.js application**, not a buildable component library, so it is
**outside the converter's envelope**. The synced Claude Design project is a
**tokens-only design system** (limitation note: "Tokens-only DS (no components):
emits styles.css only with an empty-bodied _ds_bundle.js"). It is maintained
**off-script** (hand-built layout, no `package-build.mjs` / `resync.mjs` run) —
there are no components to bundle, render-check, or grade.

## What is synced
- `styles.css` — brand entry; `@import`s the token files + the brand fonts.
- `tokens/colors.css`, `tokens/typography.css` — the CSS custom properties from
  `app/globals.css` `:root`, split for clarity. Source of truth is `app/globals.css`.
- `_ds_bundle.js` — empty-bodied (no components), header only.
- `README.md` — the conventions header (`.design-sync/conventions.md`).
- `_ds_sync.json` — minimal off-script anchor (`styleSha` of the token files).

## Re-sync (do it by hand — do NOT run the converter)
1. If `app/globals.css` `:root` tokens or the font config changed, re-emit
   `tokens/colors.css` / `tokens/typography.css` and re-hash `_ds_sync.json`.
2. Re-upload the changed files (atomic path: project is non-empty now).
3. Keep `_ds_sync.json` the final write.

## Re-sync risks (what can silently go stale)
- **Fonts load via a remote Google Fonts `@import`** in `styles.css` (DM Sans
  400/500/600, Shippori Mincho 400/500/600) — not self-hosted woff2. This is
  `[FONT_REMOTE]` (informational). If Google Fonts is unreachable when a design
  renders, it falls back to system fonts. To make it fully self-contained, harvest
  the woff2 from the `next/font` build cache into `fonts/` and switch to local
  `@font-face`.
- The token values are **copied** from `app/globals.css`. If that file changes and
  this project isn't re-synced, the design kit drifts from the app. `cssEntry`
  points at the source so a re-sync knows where to look.
- `--font-serif` (Shippori Mincho) is set via `next/font` in `app/layout.tsx`, not
  in `globals.css` `:root` — it's added in `tokens/typography.css` here.
