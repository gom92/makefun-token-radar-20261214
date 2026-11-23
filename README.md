# makefun-token-radar-20261214

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/gom92/makefun-token-radar-20261214/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/gom92/makefun-token-radar-20261214/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Launch Radar — every protocol in the sealed DefiLlama snapshot that still records no token, ranked by what its launch would be worth, with a farm plan for each one. The board holds 178 rows: the whole 40-protocol watchlist at the $50M TVL floor, plus every other rankable pre-token protocol below it. Live-token protocols are set aside on their own tab, valued by the market's own market cap. The dashboard is a static page with no network: search, category and chain filters, sorting, a detail view with the model's working, and a methodology page.

## Run it

```sh
node main.ts
```

`main.ts` reads the sealed snapshot from `/input/snapshot.json` (the grader mounts it there) and writes the board to `/output/board.json`, the dashboard's data to `/output/data.js`, copies `dashboard/` and `screenshots/` to `/output`, and writes `/output/dossier.json`. Node 22.18 or later, standard library only — nothing is installed.

To run it locally against the kit's snapshot:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <kit>/input/snapshot.json
```

Then open `out/dashboard/index.html` in a browser. The page reads `out/data.js`, so open the built copy, not the source folder.

## How the model works

Implied value = TVL × category multiple × growth × maturity. Every number comes from the snapshot's own figures; no protocol is ever special-cased by name.

- **Category multiple** — the median market-cap-to-TVL ratio of the live-token protocols in the same category, shrunk toward the global median with a prior of 5 observations, clamped to [0.02, 1.5]. A category needs at least two live comparables to set its own multiple; with fewer, one small protocol would price a whole category, so the board uses the global median.
- **Growth** — seven-day TVL change, clamped to [−60%, +120%], weighted 0.5.
- **Maturity** — 0.6 + min(age, 1095 days) / 1095 × 0.4; a protocol with no listing date counts as 365 days old. Older, still tokenless protocols score higher.
- **What is ranked** — a protocol is pre-token when the snapshot records no market cap, no CoinGecko id and no symbol for it. Exchanges, bridges, liquid-staking and liquid-restaking products, names ending in a version marker, and names carrying wrapped / staked / staking are not launches of their own and are not ranked. 164 pre-token protocols are set aside on those rules.

An implied value is the model's estimate of what a launch would be worth if the protocol's record stayed as it is. It does not predict whether or when a token is issued, and a protocol on this board may never issue one.

## Files

| File | What it is |
| --- | --- |
| `main.ts` | The entry program: reads the snapshot, builds the board, writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json`. |
| `lib/model.ts` | The model: snapshot parsing, the implied-value model, farm plans, board validation — and the snapshot and board shapes. |
| `dashboard/index.html`, `dashboard/app.css`, `dashboard/app.js` | The static dashboard (board, detail view, live tab, methodology). No network. |
| `screenshots/1-board.png` | The board. |
| `screenshots/2-detail.png` | The detail view of the rank-1 protocol. |
| `screenshots/3-filtered.png` | The board filtered to the RWA category. |
| `vendor/makefun-board.ts` | make.fun's dossier library from the kit, unchanged. |
| `LICENSE` | MIT. |

## Data

Source: DefiLlama public API, snapshot 2026-11-14 (`https://api.llama.fi/protocols`, fetched 2026-11-14T01:18:33.201Z), 758 protocols, floor $50,000,000 TVL, watchlist 40. The snapshot is sealed input supplied by the bounty and is not shipped in this repository.

## Submit

1. Create a public GitHub repository for this entry (created after the competition opened, 2026-11-14 10:00 UTC) and push this code to it. Replace `gom92` and `makefun-token-radar-20261214` in the badges above with the repository's owner and name.
2. Set the repository About: description `Token Launch Radar — every pre-token protocol in the sealed DefiLlama snapshot, ranked by what its launch would be worth, with a farm plan for each one. Built by an AI agent for make.fun's "Build the best token launch radar" bounty, $1,325 in USDC.`, homepage `https://make.fun/bounty/token-radar-01`, topics `makefun, ai-agents, bounties, trading`:
   ```sh
   gh repo edit gom92/makefun-token-radar-20261214 --description 'Token Launch Radar — every pre-token protocol in the sealed DefiLlama snapshot, ranked by what its launch would be worth, with a farm plan for each one. Built by an AI agent for make.fun'\''s "Build the best token launch radar" bounty, $1,325 in USDC.' --homepage 'https://make.fun/bounty/token-radar-01' --add-topic 'makefun,ai-agents,bounties,trading'
   ```
3. Your referral code is `radjee14` (from `GET /api/me/referrals`); it is already in the link below.
4. Bundle the agent transcripts with the kit CLI (`node cli/makefun.mjs login --origin https://make.fun`, then `bundle --dry-run`, then `bundle`), and submit:
   ```sh
   node cli/makefun.mjs submit --competition token-radar-01 --repo-url https://github.com/gom92/makefun-token-radar-20261214 --commit {40-character-commit-sha} --title "Token Launch Radar" --bundle transcripts.tar.gz --keypair ~/.makefun/keypairs/https_make.fun.json
   ```
5. Claim any USDC within the claim window (at least 7 days) to your Solana wallet.

---

Entered on [make.fun](https://make.fun/?ref=radjee14&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards
