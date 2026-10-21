# Branchline

A set planner for DJs. Save the transitions you know work, and Branchline shows every set they add up to: what you can play next from any song, what leads into a song, and the shortest route to a requested track.

No AI and no suggestions. Every path is one you saved.

## Try the prototype

Open `prototype/branchline.html` in a browser. It is a single-file demo with fictional tracks.

## Develop

```bash
npm install
npm run dev     # app at http://localhost:3000
npm run check   # typecheck + tests
```

The app is Next.js (App Router) + Tailwind in `src/app`. The graph engine (`src/graph`) and Rekordbox importer (`src/import`) are plain TypeScript with no framework dependencies. See `docs/decisions.md` for the architecture and `CLAUDE.md` for the roadmap.
