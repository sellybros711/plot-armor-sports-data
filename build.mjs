#!/usr/bin/env node
/**
 * Builds sports.json: the schedule (2 days back to 7 days ahead) and the teams playing in it,
 * with the words that mean each team. Run once or twice a day by GitHub Actions in the public
 * data repo (see .github/workflows/build.yml), and by `npm run build-data` for the copy bundled
 * in the extension.
 *
 *   node build.mjs --out sports.json
 *
 * What it keeps from the feed: who plays whom, when, and whether the game is upcoming, on now,
 * over, postponed or canceled. Team names, cities and rosters. NEVER scores, winners, "Final/OT"
 * or anything else that could spoil a game: every game in the output is built field by field
 * below, and the extension refuses a file with any other field.
 *
 * Source for the free beta: ESPN's public scoreboard, teams and roster feeds (unofficial and
 * undocumented). Before any paid tier, switch FEED_BASE and the readers below to a licensed
 * source. Only this file changes; the extension only ever reads sports.json.
 *
 * Needs Node 20+ and an English word list at /usr/share/dict/words (Mac) or
 * /usr/share/dict/american-english (Ubuntu: `sudo apt-get install wamerican`).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FEED_BASE = 'https://site.api.espn.com/apis/site/v2/sports/';
const DAYS_BACK = 2;
const DAYS_AHEAD = 7;
const PARALLEL = 6;

const config = JSON.parse(readFileSync(join(HERE, 'leagues.json'), 'utf8'));
const extras = JSON.parse(readFileSync(join(HERE, 'team-extras.json'), 'utf8')).teams;

const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : join(HERE, 'sports.json');

// ---------- Words ----------

/** Lowercase dictionary words: a team nickname or surname that is one is an everyday word. */
function loadDictionary() {
  for (const path of ['/usr/share/dict/words', '/usr/share/dict/american-english']) {
    if (!existsSync(path)) continue;
    const words = new Set();
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      if (line && line === line.toLowerCase()) words.add(line);
    }
    return words;
  }
  throw new Error('No word list found. On Ubuntu: sudo apt-get install wamerican');
}
const DICTIONARY = loadDictionary();
const FIRST_NAMES = existsSync('/usr/share/dict/propernames')
  ? new Set(readFileSync('/usr/share/dict/propernames', 'utf8').split('\n').map((name) => name.trim().toLowerCase()).filter(Boolean))
  : new Set();

/** Very common surnames: a player called one of these needs backup ("Allen" alone is not enough). */
const COMMON_SURNAMES = new Set(
  `smith johnson williams brown jones garcia miller davis rodriguez martinez hernandez lopez gonzalez
   wilson anderson thomas taylor moore jackson martin lee perez thompson white harris sanchez clark
   ramirez lewis robinson walker young allen king wright scott torres nguyen hill flores green adams
   nelson baker hall rivera campbell mitchell carter roberts gomez phillips evans turner diaz parker
   cruz edwards collins reyes stewart morris morales murphy cook rogers gutierrez ortiz morgan cooper
   peterson bailey reed kelly howard ramos kim cox ward richardson watson brooks chavez wood james
   bennett gray mendoza ruiz hughes price alvarez castillo sanders patel myers long ross foster
   jimenez powell jenkins perry russell sullivan bell coleman butler henderson barnes gonzales fisher
   vasquez simmons romero jordan patterson alexander hamilton graham reynolds griffin wallace moreno
   west cole hayes bryant herrera gibson ellis tran medina aguilar stevens murray ford castro marshall
   owens harrison fernandez mcdonald woods washington kennedy wells vargas henry chen freeman webb
   tucker guzman burns crawford olson simpson porter hunter gordon mendez silva shaw snyder mason
   dixon munoz hunt hicks holmes palmer wagner black robertson boyd rose stone salazar fox warren
   mills meyer rice schmidt garza daniels ferguson nichols stephens soto weaver ryan gardner payne
   grant dunn kelley spencer hawkins arnold pierce vazquez hansen peters santos hart bradley knight
   elliott cunningham duncan armstrong hudson carroll lane riley andrews alvarado ray delgado berry
   perkins hoffman johnston matthews pena richards contreras willis carpenter lawrence sandoval
   guerrero george chapman rios estrada ortega watkins greene nunez wheeler valdez harper burke
   larson santiago maldonado morrison franklin carlson austin dominguez carr lawson jacobs obrien
   lynch singh vega bishop montgomery oliver jensen harvey williamson gilbert dean sims espinoza
   howell li wong reid hanson le mccoy garrett burton fuller wang weber welch rojas lucas marquez
   fields park yang little banks padilla day walsh bowman schultz luna fowler mejia davidson acosta
   brewer may holland juarez newman pearson curtis cortez douglas schneider joseph barrett navarro
   figueroa keller avila wade molina stanley hopkins campos barnett bates chambers caldwell beck
   lambert miranda byrd craig ayala lowe frazier powers neal leonard gregory carrillo sutton fleming
   rhodes shelton schwartz norris jennings watts duran walters cohen mcdaniel moran parks steele
   vaughn becker holt deleon barker terry hale leon hail benson haynes horton miles lyons pham graves
   bush thornton wolfe warner cabrera mckinney mann zimmerman dawson lara fletcher page mccarthy love
   robles cervantes solis erickson reeves chang klein salinas fuentes baldwin daniel simon velasquez
   hardy higgins aguirre lin cummings chandler sharp barber bowen ochoa dennis robbins liu ramsey
   francis griffith paul blair oconnor cardenas pacheco cross calderon quinn moss swanson chan
   rivas khan rodgers serrano fitzgerald rosales stevenson christensen manning gill curry mclaughlin
   harmon mcgee gross doyle garner newton burgess reese walton blake trujillo adkins brady goodman
   roman webster goodwin fischer huang potter delacruz montoya todd wu hines mullins castaneda malone
   cannon tate mack sherman hubbard hodges zhang guerra wolf valencia saunders franco rowe gallagher
   farmer hammond hampton townsend ingram wise gallegos clarke barton schroeder maxwell waters logan
   camacho strickland norman person colon parsons frank harrington glover osborne buchanan casey
   floyd patton ibarra ball tyler suarez bowers orozco salas cobb gibbs andrade bauer conner moody
   escobar mcguire lloyd mueller hartman french kramer mcbride pope lindsey velazquez norton mccormick
   sparks flynn yates hogan marsh macias villanueva zamora pratt stokes owen ballard lang brock
   villarreal charles drake barrera cain patrick pineda burnett mercado santana shepherd bautista ali
   shaffer lamb trevino mckenzie hess beil olsen cochran morton nash wilkins petersen briggs shah
   roth nicholson holloway lozano rangel flowers hoover short arias mora valenzuela bryan meyers weiss
   underwood bass greer summers houston carson morrow clayton whitaker decker yoder collier zuniga
   carey wilcox melendez poole roberson larsen conley davenport copeland massey lam huff rocha cameron
   jefferson hood monroe anthony pittman huynh randall singleton kirk combs mathis christian skinner
   bradford richard galvan wall boone kirby wilkinson bridges bruce atkinson velez meza roy vincent
   york hodge villa abbott allison tapia gates chase sosa sweeney farrell wyatt dalton horn barron
   phelps yu dickerson heath foley atkins mathews bonilla acevedo benitez zavala hensley glenn
   cisneros harrell shields rubio choi huffman boyer garrison arroyo bond kane hancock callahan dillon
   cline wiggins grimes arellano melton oneill savage ho beltran pitts parrish ponce rich booth koch
   golden ware brennan mcdowell marks cantu humphrey baxter sawyer clay tanner hutchinson kaur berg
   wiley gilmore russo villegas hobbs keith wilkerson ahmed beard mcclain montes mata rosario vang
   walter henson oneal mosley mcclure beasley stephenson snow huerta preston vance barry johns eaton
   blackwell dyer prince macdonald solomon guevara stafford english hurst woodard cortes shannon
   kemp nolan mccullough merritt murillo moon salgado strong kline cordova barajas roach rosas winters
   jacobson lester knox bullock kerr leach meadows orr davila whitehead pruitt kent conway mckee
   barr david dejesus marin berger mcintyre blankenship gaines palacios cuevas bartlett durham
   dorsey mccall odonnell stein browning stout lowery sloan mclean hendricks calhoun sexton chung
   gentry hull duarte ellison nielsen gillespie buck middleton sellers leblanc esparza hardin bradshaw
   mcintosh howe livingston frost glass morse knapp herman stark bravo noble spears weeks corona
   frederick buckley mcfarland hinton pace hebert dodson chaney nixon ford`
    .split(/\s+/)
    .filter(Boolean),
);

/** True for a word that also has an everyday meaning ("Bills" -> "bill", "Battle"). */
function isDictionaryWord(word) {
  const lower = word.toLowerCase();
  if (DICTIONARY.has(lower)) return true;
  if (lower.endsWith('s') && DICTIONARY.has(lower.slice(0, -1))) return true;
  if (lower.endsWith('es') && DICTIONARY.has(lower.slice(0, -2))) return true;
  return false;
}

const EVERYDAY_NICKNAMES = new Set(config.everydayNicknames.map((word) => word.toLowerCase()));

/**
 * A player's last name is distinctive ("Mahomes", "Saka") when it has 4+ letters and is not an
 * everyday word, a common surname or a first name. Distinctive names count on their own; the
 * rest ("Allen", "Love", "Price") need backup. Full names always count on their own.
 */
function isDistinctiveSurname(name) {
  const lower = name.toLowerCase();
  if (!/^[\p{L}'’-]+$/u.test(name) || lower.length < 4) return false;
  if (isDictionaryWord(lower) || COMMON_SURNAMES.has(lower.replace(/['’]/g, '')) || FIRST_NAMES.has(lower)) return false;
  return true;
}

// ---------- Fetching ----------

async function getJson(path) {
  const url = FEED_BASE + path;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === 3) throw new Error(`${path}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/** Runs jobs a few at a time. Returns results; a failed job gives { error }. */
async function inBatches(jobs) {
  const results = [];
  for (let i = 0; i < jobs.length; i += PARALLEL) {
    results.push(
      ...(await Promise.all(jobs.slice(i, i + PARALLEL).map((job) => job().catch((error) => ({ error: String(error.message ?? error) }))))),
    );
  }
  return results;
}

/** YYYYMMDD in US Eastern, `offset` days from today. */
function easternDay(offset) {
  const now = new Date(Date.now() + offset * 86_400_000);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return parts.replaceAll('-', '');
}

// ---------- Reading the feed ----------

/** Only these coarse states ever leave this script. "Final/OT" and the like are never kept. */
function gameStatus(status) {
  const name = String(status?.type?.name ?? '').toUpperCase();
  if (name.includes('POSTPONED') || name.includes('SUSPENDED')) return 'postponed';
  if (name.includes('CANCEL')) return 'canceled';
  const state = status?.type?.state;
  if (state === 'in') return 'live';
  if (state === 'post') return 'ended';
  return 'scheduled';
}

function teamKey(league, team) {
  return `${league.group}:${team.id}`;
}

function cleanList(list) {
  const seen = new Set();
  const result = [];
  for (const raw of list) {
    const word = String(raw ?? '').trim();
    if (word.length < 3 && !word.startsWith('#')) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(word);
  }
  return result;
}

async function main() {
  const days = [];
  for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset++) days.push(easternDay(offset));

  // 1. The schedule: every league, every day.
  const scheduleJobs = config.leagues.flatMap((league) =>
    days.map((day) => async () => ({ league, data: await getJson(`${league.feed}/scoreboard?dates=${day}`) })),
  );
  const scheduleResults = await inBatches(scheduleJobs);
  const failedSchedule = scheduleResults.filter((result) => result.error);
  for (const failure of failedSchedule) console.error('Schedule download failed:', failure.error);
  if (failedSchedule.length * 2 > scheduleResults.length) {
    throw new Error(`${failedSchedule.length} of ${scheduleResults.length} schedule downloads failed; not writing a file.`);
  }

  const games = new Map();
  /** Raw team info by key, and which league feed it can be looked up in (for its roster). */
  const rawTeams = new Map();
  for (const result of scheduleResults) {
    if (result.error) continue;
    const { league, data } = result;
    for (const event of data.events ?? []) {
      const competition = event.competitions?.[0];
      const home = competition?.competitors?.find((side) => side.homeAway === 'home')?.team;
      const away = competition?.competitors?.find((side) => side.homeAway === 'away')?.team;
      const start = Date.parse(competition?.date ?? event.date ?? '');
      if (!home?.id || !away?.id || Number.isNaN(start)) continue;
      if ([home, away].some((team) => /^TBD/i.test(team.abbreviation ?? '') || /^TBD/i.test(team.displayName ?? ''))) continue;
      for (const team of [home, away]) {
        const key = teamKey(league, team);
        if (!rawTeams.has(key)) rawTeams.set(key, { team, league });
      }
      games.set(`${league.id}:${event.id}`, {
        id: `${league.id}:${event.id}`,
        league: league.id,
        start: new Date(start).toISOString(),
        status: gameStatus(event.status ?? competition?.status),
        home: teamKey(league, home),
        away: teamKey(league, away),
      });
    }
  }

  // 2. Rosters (and head coaches) for every team in the schedule.
  const keys = [...rawTeams.keys()];
  const rosterResults = await inBatches(
    keys.map((key) => async () => {
      const { team, league } = rawTeams.get(key);
      return getJson(`${league.feed}/teams/${team.id}/roster`);
    }),
  );
  const rosters = new Map();
  keys.forEach((key, index) => {
    const result = rosterResults[index];
    if (result?.error) {
      console.error('Roster download failed (team kept without players):', result.error);
      return;
    }
    const athletes = (result.athletes ?? []).flatMap((entry) => (Array.isArray(entry.items) ? entry.items : [entry]));
    const coaches = (result.coach ?? []).map((coach) => ({ fullName: `${coach.firstName ?? ''} ${coach.lastName ?? ''}`.trim(), lastName: coach.lastName }));
    rosters.set(key, [...athletes, ...coaches]);
  });

  // 3. The words for each team.
  const leagueById = new Map(config.leagues.map((league) => [league.id, league]));
  const shortCounts = new Map();
  for (const { team } of rawTeams.values()) {
    for (const word of [team.shortDisplayName, team.name]) {
      if (!word) continue;
      const lower = word.toLowerCase();
      shortCounts.set(lower, (shortCounts.get(lower) ?? 0) + 1);
    }
  }

  const teams = {};
  for (const [key, { team, league }] of rawTeams) {
    const extra = extras[`${league.group}:${team.abbreviation}`] ?? {};
    const isSoccer = league.group === 'soccer';
    const name = team.displayName ?? team.name;
    const short = team.shortDisplayName ?? team.name ?? name;
    const city = isSoccer ? null : (team.location ?? null);

    const aliases = [name, ...(extra.aliases ?? [])];
    const weak = [...(extra.weak ?? [])];
    const everyday = [];

    // The short name ("Chiefs", "Heat", "Liverpool", "Atlanta").
    if (short && short.toLowerCase() !== name.toLowerCase()) {
      const lower = short.toLowerCase();
      // MLS short names are places ("Atlanta", "Salt Lake"), unless listed as an alias ("NYCFC").
      const isPlace = league.id === 'mls' && !(extra.aliases ?? []).some((alias) => alias.toLowerCase() === lower);
      if (EVERYDAY_NICKNAMES.has(lower) || isPlace) {
        weak.push(short);
        everyday.push(short);
      } else if ((shortCounts.get(lower) ?? 0) > 1 || isDictionaryWord(short)) {
        weak.push(short);
      } else {
        aliases.push(short);
      }
    }
    // ESPN's nickname field for soccer clubs ("Gunners") is a fan name, not always reliable.
    if (isSoccer && team.nickname && team.nickname !== name && team.nickname !== short) weak.push(team.nickname);
    // The city ("Kansas City", "Boston") always needs backup.
    if (city && city.toLowerCase() !== name.toLowerCase()) {
      weak.push(city);
      everyday.push(city);
    }

    const people = [];
    for (const player of rosters.get(key) ?? []) {
      const full = String(player.fullName ?? player.displayName ?? '').trim();
      if (full.length < 3) continue;
      const parts = full.split(/\s+/);
      if (parts.length === 1) {
        // One-name players ("Rodri") count on their own only when the name is distinctive.
        if (isDistinctiveSurname(full)) people.push(full);
        else if (full.length >= 3) { weak.push(full); everyday.push(full); }
        continue;
      }
      people.push(full);
      // "Hardaway Jr." -> "Hardaway"; "De Jesus" stays whole.
      const last = String(player.lastName ?? parts.at(-1)).replace(/,?\s+(jr|sr|ii|iii|iv|v)\.?$/i, '').trim();
      if (last.length < 3 || /^(jr|sr|ii|iii|iv|v)\.?$/i.test(last)) continue;
      if (isDistinctiveSurname(last)) people.push(last);
      else {
        weak.push(last);
        everyday.push(last);
      }
    }

    const cleanAliases = cleanList(aliases);
    const cleanWeak = cleanList(weak);
    const weakSet = new Set(cleanWeak.map((word) => word.toLowerCase()));
    teams[key] = {
      league: league.group,
      name,
      short,
      abbr: team.abbreviation ?? '',
      accounts: cleanList(extra.accounts ?? []),
      // A word listed as weak anywhere is weak, even if it is also an alias.
      aliases: cleanAliases.filter((word) => !weakSet.has(word.toLowerCase())),
      people: cleanList(people).filter((word) => !weakSet.has(word.toLowerCase())),
      weak: cleanWeak,
      everyday: cleanList(everyday),
    };
  }

  const output = {
    format: 1,
    builtAt: new Date().toISOString(),
    source: 'ESPN public feeds (beta)',
    leagues: config.leagues.map(({ id, name, group, gameHours, accounts, hashtags, context }) => ({ id, name, group, gameHours, accounts, hashtags, context })),
    mediaAccounts: config.mediaAccounts,
    context: config.context,
    teams,
    games: [...games.values()].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id)),
  };
  for (const league of leagueById.values()) {
    const count = output.games.filter((game) => game.league === league.id).length;
    console.log(`${league.name}: ${count} games`);
  }
  console.log(`${Object.keys(teams).length} teams, ${rosters.size} rosters. Writing ${out}`);
  writeFileSync(out, JSON.stringify(output) + '\n');
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
