/* Optional local sanity checks. Run: node test-data-utils.js */
const assert = require('node:assert/strict');
const {parseAndNormalize, matchSituations, makeHeatmap, fieldProgress, mapColumns} = require('./data-utils.js');
// These are fabricated *test fixtures*, NOT used as NFL observations in the site.
const fixtures = [
  {down:'4',qtr:'4',ydstogo:'2',yardline_100:'44',play_type:'run',week:'7',season:'2026'},
  {down:'4',qtr:'4',ydstogo:'3',yardline_100:'45',play_type:'pass',week:'7',season:'2026'},
  {down:'4',qtr:'4',ydstogo:'2',yardline_100:'40',play_type:'punt',week:'7',season:'2026'},
  {down:'4',qtr:'4',ydstogo:'4',yardline_100:'41',play_type:'field_goal',week:'7',season:'2026'},
  {down:'4',qtr:'4',ydstogo:'2',yardline_100:'44',play_type:'no_play',week:'7',season:'2026'},
  {down:'3',qtr:'4',ydstogo:'2',yardline_100:'44',play_type:'pass',week:'7',season:'2026'},
  {down:'4',qtr:'3',ydstogo:'2',yardline_100:'44',play_type:'run',week:'7',season:'2026'},
  {down:'4',qtr:'4',ydstogo:'2',yardline_100:'44',play_type:'pass',week:'10',season:'2026'}
];
const parsed = parseAndNormalize(fixtures);
assert.equal(parsed.plays.length,5);
assert.equal(parsed.stats.fourthDownRows,7);
assert.equal(parsed.stats.excludedWeeks,1);
assert.equal(parsed.stats.skippedUnknown,1);
assert.equal(parsed.plays[0].position,56);
const result = matchSituations(parsed.plays, {position:56,distance:2,quarter:4});
assert.equal(result.n,4);
assert.deepEqual(result.byKind, {go:2,punt:1,fg:1});
assert.equal(result.percentages.go,50);
assert.equal(makeHeatmap(parsed.plays,4).length,60);
const fields = mapColumns(['yard_line','side_of_field','posteam']);
assert.equal(fieldProgress({yard_line:'KC 42',side_of_field:'',posteam:'KC'},fields),42);
assert.equal(fieldProgress({yard_line:'BUF 42',side_of_field:'',posteam:'KC'},fields),58);
assert.equal(fieldProgress({yard_line:42,side_of_field:'',posteam:'KC'},fields),null);
console.log('All data parsing and aggregation sanity checks passed.');

// Kaggle's *actual* column naming convention, including ordinal quarter labels,
// textual field spots, and regular season filtering. Test rows are fixtures.
const kaggleFixture = [
  {Season:'2026',Week:'WEEK 3',Quarter:'4th Quarter',TeamWithPossession:'Kansas City Chiefs',PlayStart:'4th & 2 at LV 44',PlayOutcome:'Pass Incomplete',PlayDescription:'— Player pass incomplete to receiver.'},
  {Season:'2026',Week:'WEEK 3',Quarter:'4th Quarter',TeamWithPossession:'Kansas City Chiefs',PlayStart:'4th & Goal at LV 3',PlayOutcome:'Turnover on Downs',PlayDescription:'— Quarterback right guard to LV 3 for no gain.'},
  {Season:'2026',Week:'WEEK 3',Quarter:'4th Quarter',TeamWithPossession:'Kansas City Chiefs',PlayStart:'4th & 8 at 50',PlayOutcome:'Punt',PlayDescription:'— Player punts 45 yards.'},
  {Season:'2026',Week:'PRESEASON WEEK 1',Quarter:'4th Quarter',TeamWithPossession:'Kansas City Chiefs',PlayStart:'4th & 1 at KC 40',PlayOutcome:'Punt',PlayDescription:'— Player punts 42 yards.'},
  {Season:'2026',Week:'WEEK 3',Quarter:'2nd Quarter',TeamWithPossession:'Kansas City Chiefs',PlayStart:'4th & 1 at LV 21',PlayOutcome:'-5 Yard Penalty',PlayDescription:'— Delay of Game, enforced at LV 21 - No Play.'},
  {Season:'2026',Week:'WEEK 3',Quarter:'4th Quarter',TeamWithPossession:'Kansas City Chiefs',PlayStart:'4th & 5 at KC 45',PlayOutcome:'Touchdown',PlayDescription:'— punter punts 55 yards, return for TOUCHDOWN.'}
];
const kg=parseAndNormalize(kaggleFixture);
assert.equal(kg.plays.length,4);
assert.equal(kg.stats.excludedNonRegular,1);
assert.equal(kg.stats.skippedUnknown,1);
assert.equal(kg.plays[0].position,56); // opponent's LV 44
assert.equal(kg.plays[1].position,97); // opponent's LV 3
assert.equal(kg.plays[1].distance,3); // goal-to-go
assert.equal(kg.plays[2].position,50); // midfield
assert.equal(kg.plays[3].kind,'punt'); // punt-return touchdown stays a punt
