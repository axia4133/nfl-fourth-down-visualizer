/*
 * Fourth Down — You're the Coach
 * Pure CSV normalization + analysis helpers. Works in a browser and in Node.
 * Never generates synthetic NFL observations.
 */
(function (root) {
  'use strict';

  const FIELD_BINS = Array.from({ length: 10 }, (_, i) => ({
    min: i * 10, max: (i + 1) * 10,
    label: `${i * 10}–${(i + 1) * 10}`,
    center: i * 10 + 5
  }));
  const DISTANCE_BINS = [
    { min: 1, max: 1, label: '1', center: 1 },
    { min: 2, max: 3, label: '2–3', center: 2 },
    { min: 4, max: 5, label: '4–5', center: 4 },
    { min: 6, max: 7, label: '6–7', center: 6 },
    { min: 8, max: 10, label: '8–10', center: 9 },
    { min: 11, max: 15, label: '11–15', center: 12 }
  ];

  const COLUMN_NAMES = {
    down: ['down', 'down_number', 'downnum', 'current_down', 'downs'],
    playStart: ['playstart', 'play_start', 'start_of_play'],
    distance: ['ydstogo', 'yards_to_go', 'yards_to_first_down', 'yards_to_gain', 'to_go', 'togo', 'distance', 'distance_to_go', 'down_distance', 'yards_needed', 'yardsneeded'],
    progress: ['los', 'field_position', 'fieldposition', 'offense_yardline', 'offense_field_position', 'yardline_from_own_goal', 'yards_from_own_goal', 'line_of_scrimmage'],
    toGoal: ['yardline_100', 'yards_to_goal', 'distance_to_goal', 'distance_to_endzone', 'yards_from_opponent_goal'],
    yardText: ['yardline', 'yard_line', 'yard_line_string', 'yardline_text', 'location', 'field_location', 'spot'],
    side: ['side_of_field', 'field_side', 'yardline_side', 'side'],
    offense: ['posteam', 'possession_team', 'possessionteam', 'offense_team', 'offense', 'poss_team', 'teamwithpossession'],
    quarter: ['qtr', 'quarter', 'period', 'game_quarter', 'quarter_number'],
    week: ['week', 'week_number', 'game_week'],
    season: ['season', 'season_year', 'year'],
    playType: ['play_type', 'playtype', 'play_type_nfl', 'play_type_name', 'play_result_type', 'type', 'playcategory', 'playoutcome', 'play_outcome'],
    description: ['desc', 'description', 'play_description', 'play_text', 'details', 'play_by_play', 'result', 'text', 'short_text', 'long_description', 'playdescription'],
    noPlay: ['no_play', 'is_no_play']
  };

  function canonical(key) {
    return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function mapColumns(keys) {
    const normalized = new Map(keys.map(key => [canonical(key), key]));
    const fields = {};
    Object.entries(COLUMN_NAMES).forEach(([field, aliases]) => {
      fields[field] = aliases.map(alias => normalized.get(canonical(alias))).find(Boolean) || null;
    });
    return fields;
  }
  function numeric(value) {
    if (value === null || value === undefined) return null;
    const str = String(value).trim();
    if (!str || /^(nan|null|none|na|n\/a|undefined)$/i.test(str)) return null;
    const n = Number(str);
    return Number.isFinite(n) ? n : null;
  }
  function nFromText(value) {
    const direct = numeric(value);
    if (direct !== null) return direct;
    const found = String(value ?? '').match(/\b(\d+(?:\.\d+)?)\b/);
    return found ? Number(found[1]) : null;
  }
  function read(row, col) { return col ? row[col] : null; }
  function quarterValue(value) {
    const ordinal = String(value ?? '').match(/^\s*([1-4])(?:st|nd|rd|th)\s+Quarter\b/i);
    if (ordinal) return Number(ordinal[1]);
    const n = nFromText(value);
    return n !== null && Number.isInteger(n) ? n : null;
  }
  function downValue(value, description) {
    const down = nFromText(value);
    if (down !== null) return down;
    const text = String(description || '');
    const found = text.match(/\b(1st|2nd|3rd|4th)\s*(?:and\b|&)/i);
    return found ? ['1st','2nd','3rd','4th'].indexOf(found[1].toLowerCase()) + 1 : null;
  }
  function distanceValue(value, description, yardsToGoal) {
    let n = numeric(value);
    if (n === null && String(value || '').trim().toLowerCase() === 'goal') n = yardsToGoal;
    if (n === null) {
      const found = String(description || '').match(/\b4th\s*(?:and|&)\s*(\d+|goal)\b/i);
      if (found) n = found[1].toLowerCase() === 'goal' ? yardsToGoal : Number(found[1]);
    }
    return n !== null && n >= 1 && n <= 99 ? n : null;
  }
  // The Kaggle 2026_plays.csv uses full team names in TeamWithPossession,
  // but abbreviations in PlayStart (e.g. "4th & 2 at CAR 44").
  // Normalizing both sides prevents silently reversing field positions.
  const TEAM_CODES = {
    'arizona cardinals':'AZ', 'atlanta falcons':'ATL', 'baltimore ravens':'BAL',
    'buffalo bills':'BUF', 'carolina panthers':'CAR', 'chicago bears':'CHI',
    'cincinnati bengals':'CIN', 'cleveland browns':'CLE', 'dallas cowboys':'DAL',
    'denver broncos':'DEN', 'detroit lions':'DET', 'green bay packers':'GB',
    'houston texans':'HOU', 'indianapolis colts':'IND', 'jacksonville jaguars':'JAX',
    'kansas city chiefs':'KC', 'las vegas raiders':'LV', 'los angeles chargers':'LAC',
    'los angeles rams':'LAR', 'miami dolphins':'MIA', 'minnesota vikings':'MIN',
    'new england patriots':'NE', 'new orleans saints':'NO', 'new york giants':'NYG',
    'new york jets':'NYJ', 'philadelphia eagles':'PHI', 'pittsburgh steelers':'PIT',
    'san francisco 49ers':'SF', 'seattle seahawks':'SEA', 'tampa bay buccaneers':'TB',
    'tennessee titans':'TEN', 'washington commanders':'WAS'
  };
  const CODE_ALIASES = { ARI:'AZ', ARZ:'AZ', JAC:'JAX', LA:'LAR', STL:'LAR', SD:'LAC',
    OAK:'LV', WSH:'WAS', WFT:'WAS', WAS:'WAS' };
  function normalizeTeam(value) {
    const raw = String(value ?? '').trim();
    const code = TEAM_CODES[raw.toLowerCase()] || raw.toUpperCase();
    return CODE_ALIASES[code] || code;
  }
  function weekValue(value) {
    const str = String(value ?? '').trim();
    if (/^\d{1,2}$/.test(str)) return Number(str);
    // Preseason / Hall of Fame rows are excluded rather than numbered as Week 1.
    const match = str.match(/^WEEK\s+(\d{1,2})$/i);
    return match ? Number(match[1]) : null;
  }
  function fieldProgress(row, fields) {
    // nflverse's yardline_100 counts *backward* from the opponent's goal.
    const toGoal = numeric(read(row, fields.toGoal));
    if (toGoal !== null && toGoal >= 0 && toGoal <= 100) return 100 - toGoal;
    // nflverse's los and expressly named field_position count *forward* from own goal.
    const progress = numeric(read(row, fields.progress));
    if (progress !== null && progress >= 0 && progress <= 100) return progress;

    // Kaggle's PlayStart: "4th & 2 at KC 42", "4th & Goal at AZ 3", or "at 50".
    const start = String(read(row, fields.playStart) ?? '').trim();
    if (start) {
      const match = start.match(/\b(?:[1-4](?:st|nd|rd|th))\s*(?:&|and)\s*(?:\d+|goal)\s+at\s+([A-Za-z]{2,4})\s+(\d{1,2})\b/i);
      if (/\bat\s+(?:50|midfield)\b/i.test(start)) return 50;
      if (match) {
        const side = normalizeTeam(match[1]);
        const offense = normalizeTeam(read(row, fields.offense));
        const yard = Number(match[2]);
        if (offense && side && yard >= 0 && yard <= 50) return side === offense ? yard : 100-yard;
      }
    }
    // A bare "yard_line=40" is ambiguous. Only use it with offense + field side.
    const spot = String(read(row, fields.yardText) ?? '').trim();
    const offense = normalizeTeam(read(row, fields.offense));
    const sideFromColumn = normalizeTeam(read(row, fields.side));
    const match = spot.match(/^([A-Za-z]{2,4})\s*[- ]?\s*(\d{1,2})$/);
    let side = sideFromColumn;
    let yard = numeric(spot);
    if (match) { side = normalizeTeam(match[1]); yard = Number(match[2]); }
    if (yard === null || yard < 0 || yard > 50) return null;
    if (side === 'OWN' || side === 'HOME') return yard;
    if (side === 'OPP' || side === 'OPPONENT' || side === 'AWAY') return 100 - yard;
    if (offense && side) return offense === side ? yard : 100 - yard;
    return null;
  }
  function classify(row, fields) {
    const raw = String(read(row, fields.playType) ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
    const desc = String(read(row, fields.description) ?? '').trim().toLowerCase();
    const noPlay = String(read(row, fields.noPlay) ?? '').trim().toLowerCase();
    if (/\bkneels?\b/i.test(desc) || ['1','true','yes'].includes(noPlay) || /\bno play\b/i.test(desc) || /^(no play|timeout|penalty|qb kneel|kneel|spike|extra point|kickoff|end of|two minute warning)$/i.test(raw) || /\bpenalty\b/i.test(raw)) return null;
    if (/fake\s*(punt|field\s*goal)/.test(raw) || /fake\s*(punt|field\s*goal)/.test(desc)) return 'go';
    if (/\bpunt\b/.test(raw)) return 'punt';
    if (/\b(field\s*goal|fg\s*(attempt|kick)?|fieldgoal)\b/.test(raw)) return 'fg';
    if (/\b(pass|rush|run|scramble|sack|qb sneak)\b/.test(raw)) return 'go';
    // Last resort: use the actual play description for datasets without a type column.
    if (/\b(punts?|punt by|punter)\b/.test(desc)) return 'punt';
    if (/\b(field goal|fg attempt|kick is (good|no good)|field goal attempt)\b/.test(desc)) return 'fg';
    if (/\b(pass (complete|incomplete|intended|to)|passes|sacked|rushed|rushes|ran for|runs for|scrambles?|up the middle|left end|right end|left guard|right guard|left tackle|right tackle|quarterback sneak|qb sneak|no gain)\b/.test(desc)) return 'go';
    // Result-only labels hide the *called play* (e.g. Touchdown or Turnover on Downs).
    // Punt and field-go descriptions have already been handled above.
    if (/^(touchdown|turnover on downs|interception|fumble)$/.test(raw)) return 'go';
    return null;
  }
  function parseAndNormalize(rows, options = {}) {
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('The CSV is empty. Please use a play-by-play CSV with data rows.');
    const keys = Object.keys(rows[0]);
    const fields = mapColumns(keys);
    if (!fields.down && !fields.playStart && !fields.description) throw new Error('Cannot find a down or PlayStart column containing fourth-down plays.');
    if (!fields.playType && !fields.description) throw new Error('Cannot find a play type or description column.');
    if (!fields.quarter) throw new Error('Cannot find a quarter column (for example, qtr or quarter).');
    if (!fields.toGoal && !fields.progress && !fields.yardText && !fields.playStart) throw new Error('Cannot find field position (for example, PlayStart or yardline_100).');
    if (!fields.distance && !fields.playStart && !fields.description) throw new Error('Cannot find yards-to-go (ydstogo or PlayStart).');

    const stats = { totalRows: rows.length, fourthDownRows: 0, skippedMissing: 0, skippedUnknown: 0, skippedOutsideScope: 0, duplicates: 0, excludedWeeks: 0, excludedNonRegular: 0, typeExamples: [] };
    const unknownTypes = new Map();
    const plays = [];
    const maxWeek = options.maxWeek === undefined ? 9 : options.maxWeek;

    for (const row of rows) {
      const start = read(row, fields.playStart);
      const desc = read(row, fields.description);
      if (downValue(read(row, fields.down), start || desc) !== 4) continue;
      stats.fourthDownRows++;
      const season = numeric(read(row, fields.season));
      const week = fields.week ? weekValue(read(row, fields.week)) : null;
      if (fields.week && week === null) { stats.excludedNonRegular++; continue; }
      if (season !== null && season !== 2026 && options.only2026 !== false) { stats.skippedOutsideScope++; continue; }
      if (week !== null && maxWeek !== null && week > maxWeek) { stats.excludedWeeks++; continue; }
      const quarter = quarterValue(read(row, fields.quarter));
      const position = fieldProgress(row, fields);
      const toGoal = numeric(read(row, fields.toGoal)) ?? (position === null ? null : 100-position);
      const distance = distanceValue(read(row, fields.distance), start || desc, toGoal);
      const kind = classify(row, fields);
      if (!kind) {
        stats.skippedUnknown++;
        const name = String(read(row, fields.playType) ?? '(missing type)');
        unknownTypes.set(name, (unknownTypes.get(name) || 0) + 1);
        continue;
      }
      // Fourth-down Goal-to-Go may use "Goal" instead of a numeric distance.
      if (quarter === null || quarter < 1 || quarter > 4 || distance === null || position === null) {
        stats.skippedMissing++; continue;
      }
      // Do not deduplicate without reliable row IDs: repeated text can be distinct plays.
      plays.push({ kind, quarter, distance, position, week, season });
    }
    stats.typeExamples = [...unknownTypes.entries()].sort((a,b) => b[1]-a[1]).slice(0,4);
    if (stats.fourthDownRows === 0) throw new Error('No fourth-down plays found. Check that this is a play-by-play dataset, not game scores.');
    if (plays.length === 0) throw new Error(`Found ${stats.fourthDownRows} fourth-down rows, but none had usable play type, field position, distance, and quarter. Please upload the CSV here so we can inspect its schema.`);
    return { plays, fields, stats, scope: fields.week && maxWeek !== null ? `2026 regular-season Weeks 1–${maxWeek}` : 'Available rows' };
  }
  function matchSituations(plays, params) {
    const quarter = Number(params.quarter);
    const position = Number(params.position);
    const distance = Number(params.distance);
    const narrow = { field: 12, distance: 2 };
    const broad = { field: 20, distance: 4 };
    const within = (width) => plays.filter(p => p.quarter === quarter && Math.abs(p.position - position) <= width.field && Math.abs(p.distance - distance) <= width.distance);
    let subset = within(narrow);
    let expanded = false;
    if (subset.length < 8) { subset = within(broad); expanded = true; }
    const byKind = {go:0,punt:0,fg:0};
    subset.forEach(p => { byKind[p.kind]++; });
    const n = subset.length;
    return { subset, byKind, n, expanded, window: expanded ? broad : narrow, percentages: Object.fromEntries(Object.entries(byKind).map(([k,v]) => [k,n ? 100*v/n : 0])) };
  }
  function makeHeatmap(plays, quarter) {
    return DISTANCE_BINS.flatMap((distance, row) => FIELD_BINS.map((field, col) => {
      const members = plays.filter(p => p.quarter === Number(quarter) && p.position >= field.min && (col === FIELD_BINS.length-1 ? p.position <= field.max : p.position < field.max) && p.distance >= distance.min && p.distance <= distance.max);
      const go = members.filter(p => p.kind === 'go').length;
      return { field, distance, col, row, n: members.length, go, rate: members.length ? go/members.length : null };
    }));
  }
  const api = { parseAndNormalize, matchSituations, makeHeatmap, mapColumns, fieldProgress, classify, FIELD_BINS, DISTANCE_BINS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NFLData = api;
})(typeof window !== 'undefined' ? window : globalThis);
