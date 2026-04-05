# Swedle

A daily puzzle game where players diagnose common software engineering problems through progressive clues — inspired by Wordle but for SWE/tech.

**Play at [swedle.com](https://swedle.com)**

## How It Works

Each day there's one answer: a canonical SWE problem or antipattern. Players receive up to 6 clues, starting vague and getting progressively more specific. Guess after any clue or skip to reveal the next one. Fewer clues = better score.

### Share Format

```
Swedle #42 — 3/6 clues
🟥🟥🟩⬜⬜⬜
swedle.com
```

- 🟩 Correct guess on this clue
- 🟥 Wrong guess or skipped
- ⬜ Unused clue

## Answer Taxonomy

All puzzles draw exclusively from four canonical sources:

1. **[Site Reliability Engineering](https://sre.google/sre-book/table-of-contents/)** (Google SRE Book) — toil, cascading failures, error budgets, incident patterns
2. **[Martin Fowler's Catalog](https://martinfowler.com/)** — code smells, architectural antipatterns, refactoring patterns
3. **[The 12 Factor App](https://12factor.net/)** — config, backing services, statelessness violations, deployment antipatterns
4. **[Designing Data-Intensive Applications](https://dataintensive.net/)** (Kleppmann) — replication lag, split-brain, hotspot partitions, thundering herd, write amplification, consistency anomalies

## Puzzle Format

Puzzles are stored in `public/puzzles.json`. Each entry:

```json
{
  "id": 1,
  "answer": "N+1 Query Problem",
  "source": "Martin Fowler",
  "clues": [
    "Clue 1 — vaguest",
    "Clue 2",
    "Clue 3",
    "Clue 4",
    "Clue 5",
    "Clue 6 — most specific"
  ],
  "explanation": "One-line explanation shown after the answer is revealed."
}
```

## Contributing Puzzles

1. Fork the repo
2. Add a new entry to `public/puzzles.json`
3. Ensure: 6 clues (vague → specific), valid source, unique answer
4. Open a PR

## Tech Stack

- React + Vite
- GitHub Pages deployment
- Daily puzzle resets at midnight PST
- Streak tracking via localStorage

## Development

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

## License

Apache 2.0 — © [Adar Butel](https://adar.la)
