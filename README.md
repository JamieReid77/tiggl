# Tiggl

Chase the circles through ten levels. Avoid the bad eggs — a bump will crash the round.

Standalone v1 of the game from the [Tay Digital](https://taydigital.co.uk) hero.

## Play

Needs a mouse or trackpad. Sweep the puck through the good circles. Do not let nudged bad eggs crash into anything.

## Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Prettier, ESLint, Jest.

High scores on Vercel production live on the shared `supabase-tay-digital` host in `tiggl.tiggl_high_scores`. Local `next dev` uses in-memory fixture scores and does not read or write the production database. See `docs/database.md`.

## Scripts

```bash
npm run dev
npm run check
npm test
npm run build
```
