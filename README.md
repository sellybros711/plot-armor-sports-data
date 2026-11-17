# plot-armor-sports-data

The schedule for Plot Armor: Sports (a Chrome extension). Teams and start times only, never scores.

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

## Set up (done 2026-11-17)

- Public repo github.com/sellybros711/plot-armor-sports-data, Pages source "GitHub Actions".
- Published at https://sellybros711.github.io/plot-armor-sports-data/sports.json.
- Pushing from `~/Projects/plot-armor-sports-data` uses the token "Plot Armor Sports data"
  (only this repo; Contents and Workflows read/write; expires about Nov 17, 2027), saved in the
  Keychain for this repo only. When it expires, pushes fail with 403: make a new token the same
  way, run `git push` once in that folder and paste it.
- To rebuild by hand: the repo's Actions tab → "Build schedule" → Run workflow.
