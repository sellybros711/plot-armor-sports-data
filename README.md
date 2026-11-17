# plot-armor-sports-data

This folder is what goes into the public GitHub repo `plot-armor-sports-data` once Selly
creates it. Until then it lives here, and `npm run build-data` (in the extension repo) uses it
to build the copy of the schedule bundled in the extension.

- `build.mjs` downloads the schedule (2 days back, 7 ahead) and rosters for NFL, NBA, NHL,
  MLB, Premier League, Champions League and MLS, and writes `sports.json`: who plays whom,
  when, and whether the game is upcoming/live/ended/postponed/canceled. **Never scores.**
- `leagues.json` (hand-written): league and sports-news X accounts, sports words that back up
  a weak word, and team nicknames that are everyday words.
- `team-extras.json` (hand-written): each team's official X handles, fan names and hashtags.
  Written from memory on 2026-11-17: **check the handles before the first release.**
- `.github/workflows/build.yml`: GitHub Actions builds and publishes `sports.json` with GitHub
  Pages at 10:00 and 20:00 UTC. Free for a public repo.

## Source and terms

For the free beta the builder reads ESPN's public (unofficial, undocumented) scoreboard, teams
and roster feeds, once per build, not once per user. ESPN can change or close them at any time;
if a build fails, users keep the last good file (it covers 7 days ahead), and the extension
refuses a file that suddenly lost most of the coming games.

**Before any paid tier, switch to a licensed sports-data source.** Only `build.mjs` changes.

## Setting it up (one time, when Selly says go)

1. Create the public repo `plot-armor-sports-data` on GitHub and copy this folder into it.
2. Settings → Pages → Source: "GitHub Actions".
3. Actions → "Build schedule" → Run workflow. Check `https://ACCOUNT.github.io/plot-armor-sports-data/sports.json` opens.
4. Put that address (without `sports.json`) in `SPORTS_DATA_URL` in `src/lib/sportsdata.ts`.
