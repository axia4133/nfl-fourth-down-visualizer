/*
 * Fourth Down — You're the Coach | DSC 106
 * D3 visualization, interaction, and real-data loading.
 * Uses data-utils.js for normalization; never fabricates game outcomes.
 */
(function () {
  'use strict';
  const state = { position: 56, distance: 2, quarter: 4, choice: null, dataset: null };
  const names = { go: 'GO FOR IT', punt: 'PUNT', fg: 'FIELD GOAL' };
  const descriptions = {
    go: 'kept the offense on the field to attempt a conversion',
    punt: 'chose to punt',
    fg: 'attempted a field goal'
  };
  const colors = { go: '#d4fb75', punt: '#7e9fe4', fg: '#ffca7b' };
  const byId = id => document.getElementById(id);
  const number = n => n.toLocaleString('en-US');
  const MIN_HEAT_SAMPLE = 5;
  // A single tooltip is shared across D3 views; categorical labels + counts
  // make results usable even when a viewer cannot distinguish hues.
  function tooltip() {
    return d3.select('body').selectAll('.vis-tooltip').data([null]).join('div')
      .attr('class','vis-tooltip').attr('role','status').attr('aria-live','off');
  }
  function showTooltip(event, content) {
    const t=tooltip(); t.text(content).style('opacity',1);
    moveTooltip(event);
  }
  function moveTooltip(event) {
    const t=tooltip();
    const x=Math.min(window.innerWidth-280,Math.max(10,event.clientX+16));
    const y=Math.max(12,Math.min(window.innerHeight-70,event.clientY+18));
    t.style('left',`${x}px`).style('top',`${y}px`);
  }
  function hideTooltip() { tooltip().style('opacity',0); }


  function formatSpot(position) {
    const value = Math.round(Math.max(0, Math.min(100, position)));
    if (value === 50) return 'MIDFIELD';
    if (value <= 0) return 'OWN GOAL';
    if (value >= 100) return 'OPP GOAL';
    return value < 50 ? `OWN ${value}` : `OPP ${100 - value}`;
  }

  function renderField() {
    const svg = d3.select('#field-svg');
    svg.selectAll('*').remove();
    const x = d3.scaleLinear().domain([0, 100]).range([52, 888]);
    const left = x(0), top = 55, bottom = 257, height = bottom-top;
    svg.append('title').text('Interactive football field');
    svg.append('desc').text(`The ball is at ${formatSpot(state.position)} on fourth and ${state.distance}. Click a yard line to move the ball.`);
    const defs = svg.append('defs');
    const grass = defs.append('linearGradient').attr('id','grass').attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%');
    grass.append('stop').attr('offset','0%').attr('stop-color','#276a49');
    grass.append('stop').attr('offset','100%').attr('stop-color','#185337');
    svg.append('rect').attr('x',left).attr('y',top).attr('width',x(100)-left).attr('height',height).attr('fill','url(#grass)').attr('stroke','#cde7cf').attr('stroke-width',2);
    d3.range(0, 100, 10).forEach(i => {
      if (i%20===0) svg.append('rect').attr('x',x(i)).attr('y',top).attr('width',x(i+10)-x(i)).attr('height',height).attr('fill','#0c3c2d').attr('opacity',.17);
    });
    // End zones sit outside the 0–100-yard playable field.
    svg.append('rect').attr('x',left-37).attr('y',top).attr('width',37).attr('height',height).attr('fill','#092e26').attr('stroke','#cde7cf').attr('stroke-width',1.5);
    svg.append('rect').attr('x',x(100)).attr('y',top).attr('width',37).attr('height',height).attr('fill','#092e26').attr('stroke','#cde7cf').attr('stroke-width',1.5);
    d3.range(0, 101, 10).forEach(yard => {
      svg.append('line').attr('x1',x(yard)).attr('x2',x(yard)).attr('y1',top).attr('y2',bottom).attr('stroke','#e9f3e6').attr('stroke-width',yard===50?2.1:1.3).attr('opacity',.8);
      if (yard>0 && yard<100) {
        const shown = yard<=50?yard:100-yard;
        [100,222].forEach(vertical => svg.append('text').attr('x',x(yard)).attr('y',vertical).attr('fill','#dceee0').attr('font-size',17).attr('font-weight',800).attr('font-family','Barlow Condensed, sans-serif').attr('opacity',.78).attr('text-anchor','middle').text(shown));
      }
    });
    d3.range(5, 100, 5).forEach(yard => {
      [125,186].forEach(y => svg.append('line').attr('x1',x(yard)-2.7).attr('x2',x(yard)+2.7).attr('y1',y).attr('y2',y).attr('stroke','#fff').attr('stroke-width',2).attr('opacity',.52));
    });
    svg.append('text').attr('x',left-18).attr('y',161).attr('fill','#afdbc1').attr('font-family','Barlow Condensed').attr('font-weight',800).attr('font-size',19).attr('letter-spacing',1).attr('text-anchor','middle').attr('transform',`rotate(-90 ${left-18} 161)`).text('OWN');
    svg.append('text').attr('x',x(100)+18).attr('y',161).attr('fill','#afdbc1').attr('font-family','Barlow Condensed').attr('font-weight',800).attr('font-size',19).attr('letter-spacing',1).attr('text-anchor','middle').attr('transform',`rotate(90 ${x(100)+18} 161)`).text('OPP');
    const scrimmage = x(state.position);
    const first = x(Math.min(100, state.position+state.distance));
    svg.append('rect').attr('x',scrimmage).attr('y',top).attr('width',Math.max(0,first-scrimmage)).attr('height',height).attr('fill','#bfdbfe').attr('opacity',.16);
    svg.append('line').attr('x1',first).attr('x2',first).attr('y1',top).attr('y2',bottom).attr('stroke','#2563eb').attr('stroke-width',4).attr('stroke-dasharray','8,4');
    svg.append('line').attr('x1',scrimmage).attr('x2',scrimmage).attr('y1',top).attr('y2',bottom).attr('stroke','#c3eeff').attr('stroke-width',3);
    svg.append('ellipse').attr('cx',scrimmage).attr('cy',156).attr('rx',17).attr('ry',10).attr('fill','#5c3428').attr('stroke','#f3e9d3').attr('stroke-width',2);
    svg.append('line').attr('x1',scrimmage-8).attr('x2',scrimmage+8).attr('y1',156).attr('y2',156).attr('stroke','#fff').attr('stroke-width',2);
    [-4,0,4].forEach(offset => svg.append('line').attr('x1',scrimmage+offset).attr('x2',scrimmage+offset).attr('y1',153).attr('y2',159).attr('stroke','#fff').attr('stroke-width',1.2));
    const tagX = Math.max(95, Math.min(840, scrimmage));
    svg.append('rect').attr('x',tagX-55).attr('y',13).attr('width',110).attr('height',31).attr('rx',3).attr('fill','#2563eb');
    svg.append('text').attr('x',tagX).attr('y',34).attr('text-anchor','middle').attr('font-family','Arial, sans-serif').attr('font-size',18).attr('font-weight',700).attr('fill','#fff').text(`4TH & ${state.distance}`);
    svg.append('text').attr('x',left).attr('y',292).attr('fill','#444').attr('font-family','Arial, sans-serif').attr('font-size',12).attr('font-weight',700).text('YOUR GOAL');
    svg.append('text').attr('x',x(100)).attr('y',292).attr('fill','#444').attr('font-family','Arial, sans-serif').attr('font-size',12).attr('font-weight',700).attr('text-anchor','end').text('OPPONENT GOAL');
    svg.append('rect').attr('x',left).attr('y',top).attr('width',x(100)-left).attr('height',height).attr('fill','transparent').style('cursor','crosshair').attr('role','button').attr('aria-label','Select field position')
      .on('click', function (event) {
        const position = d3.pointer(event,svg.node())[0];
        state.position = Math.min(95,Math.max(5,Math.round(x.invert(position))));
        updateSituation();
      });
  }

  function setRangeFill(input) {
    const pct = 100*(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min));
    input.style.setProperty('--fill',`${pct}%`);
  }
  function updateSituation() {
    const position = byId('position-range');
    const distance = byId('distance-range');
    // There cannot be more yards to gain than yards left to the end zone.
    distance.max = String(Math.min(15,100-state.position));
    state.distance = Math.min(state.distance,Number(distance.max));
    position.value = state.position;
    distance.value = state.distance;
    setRangeFill(position);
    setRangeFill(distance);
    byId('position-output').textContent = `${state.position} yards from own goal`;
    byId('distance-output').textContent = `${state.distance} ${state.distance===1?'yard':'yards'}`;
    byId('field-text').textContent = formatSpot(state.position);
    byId('first-down-text').textContent = formatSpot(Math.min(100,state.position+state.distance));
    byId('field-heading').textContent = `4TH & ${state.distance} • Q${state.quarter}`;
    document.querySelectorAll('[data-quarter]').forEach(button => {
      const selected = Number(button.dataset.quarter) === state.quarter;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    renderField();
    renderResult();
    renderHeatmap();
  }

  function choosePlay(kind) {
    state.choice = kind;
    document.querySelectorAll('[data-choice]').forEach(button => {
      const selected = button.dataset.choice === kind;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    byId('choice-hint').textContent = `YOU CHOSE ${names[kind]}  •  SEE THE EVIDENCE ↓`;
    renderResult();
    const target = byId('evidence');
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start' });
  }
  function emptyChart(title, detail) {
    const chart = byId('decision-chart');
    d3.select(chart).selectAll('*').remove();
    const el = document.createElement('div'); el.className = 'empty-chart';
    const glyph = document.createElement('div'); glyph.className='empty-glyph'; glyph.textContent='↗';
    const h = document.createElement('h4'); h.textContent=title;
    const p = document.createElement('p'); p.textContent=detail;
    el.append(glyph,h,p); chart.appendChild(el);
  }
  function setInsight(value, headline, body) {
    byId('insight-value').textContent = value;
    byId('insight-headline').textContent = headline;
    byId('insight-body').textContent = body;
  }
  function renderResult() {
    if (!state.choice) {
      byId('sample-chip').textContent='AWAITING YOUR CALL';
      emptyChart('YOUR CALL STARTS THE STORY','Choose one of the three options above to reveal what teams actually did.');
      setInsight('—','First, make your fourth-down call.','Your prediction comes first; the data comes after.');
      byId('chart-caption').textContent='We will compare your call with actual recorded fourth-down decisions. No observations are fabricated.';
      return;
    }
    if (!state.dataset) {
      byId('sample-chip').textContent='AWAITING REAL DATA';
      emptyChart(`YOU CHOSE ${names[state.choice]}`,'Your decision is locked in. Load 2026_plays.csv above to reveal real NFL counts and percentages for a comparable situation.');
      setInsight('?',`You called ${names[state.choice].toLowerCase()}.`,'Connect the Kaggle CSV to learn how often teams made the same call. We intentionally do not display made-up statistics.');
      byId('chart-caption').textContent='Data pending. Your field and quarter controls work now; the charts populate after a valid CSV is loaded.';
      return;
    }
    const { n, byKind, percentages, expanded, window: bounds } = NFLData.matchSituations(state.dataset.plays,state);
    byId('sample-chip').textContent=`${number(n)} MATCHING ${n===1?'PLAY':'PLAYS'}`;
    if (!n) {
      emptyChart('NO COMPARABLE PLAYS','Try adjusting the quarter, field position, or yards to go. We do not extrapolate from an empty sample.');
      setInsight('0', 'No examples in this window.', 'This does not mean the situation never occurs — only that the current dataset has no recorded matching play within the displayed tolerance.');
      byId('chart-caption').textContent=`Q${state.quarter}, within ±${bounds.field} field yards and ±${bounds.distance} yards to go. No matches.`;
      return;
    }
    const keys = ['go','punt','fg'];
    const chart = d3.select('#decision-chart'); chart.selectAll('*').remove();
    const svg = chart.append('svg').attr('viewBox','0 0 700 310').attr('role','img').attr('aria-label',`NFL decision distribution from ${n} comparable plays`);
    svg.append('title').text('Fourth-down decision breakdown');
    const barStart = 190, barWidth=407, startY=36, step=82;
    const pctScale=d3.scaleLinear().domain([0,100]).range([barStart,barStart+barWidth]);
    keys.forEach((key,index) => {
      const y = startY + index*step;
      svg.append('text').attr('x',0).attr('y',y+18).attr('class','chart-label').text(names[key]);
      svg.append('text').attr('x',0).attr('y',y+39).attr('class','chart-subnote').text(`${number(byKind[key])} ${byKind[key]===1?'play':'plays'}`);
      svg.append('rect').attr('x',barStart).attr('y',y).attr('width',barWidth).attr('height',32).attr('rx',2).attr('fill','#243841');
      svg.append('rect').attr('x',barStart).attr('y',y).attr('width',pctScale(percentages[key])-barStart).attr('height',32).attr('rx',2).attr('fill',colors[key]);
      svg.append('rect').attr('x',barStart).attr('y',y).attr('width',barWidth).attr('height',32)
        .attr('fill','transparent').style('cursor','help').attr('tabindex',0)
        .attr('role','img').attr('aria-label',`${names[key]}: ${byKind[key]} of ${n} plays, ${percentages[key].toFixed(1)} percent`)
        .on('mouseenter',(event)=>showTooltip(event,`${names[key]} · ${byKind[key]} of ${n} plays (${percentages[key].toFixed(1)}%)`))
        .on('mousemove',moveTooltip).on('mouseleave',hideTooltip)
        .on('focus',(event)=>showTooltip({clientX:window.innerWidth/2,clientY:window.innerHeight/2},`${names[key]} · ${byKind[key]} plays (${percentages[key].toFixed(1)}%)`))
        .on('blur',hideTooltip);
      if (key===state.choice) {
        svg.append('rect').attr('x',barStart-3).attr('y',y-3).attr('width',barWidth+6).attr('height',38).attr('fill','none').attr('stroke',colors[key]).attr('stroke-width',1.5);
        svg.append('text').attr('x',barStart).attr('y',y+51).attr('class','chart-subnote').attr('fill',colors[key]).text('← YOUR PICK');
      }
      svg.append('text').attr('x',682).attr('y',y+24).attr('text-anchor','end').attr('class','chart-value').text(`${percentages[key].toFixed(1)}%`);
    });
    const axis=svg.append('g').attr('class','decision-axis')
      .attr('transform','translate(0,282)')
      .call(d3.axisBottom(pctScale).tickValues([0,25,50,75,100]).tickFormat(v=>`${v}%`).tickSize(6));
    axis.select('.domain').attr('stroke','#819b96');
    axis.selectAll('line').attr('stroke','#819b96');
    axis.selectAll('text').attr('fill','#c6dbd1').attr('font-size',12).attr('font-family','DM Sans');
    const chosen = percentages[state.choice];
    const mostCommon = [...keys].sort((a,b)=>byKind[b]-byKind[a])[0];
    const dominantNote = `The most frequent call here was ${names[mostCommon].toLowerCase()} (${percentages[mostCommon].toFixed(1)}%).`;
    setInsight(`${Math.round(chosen)}%`,`${number(byKind[state.choice])} of ${number(n)} recorded plays matched your call.`,
      `${chosen.toFixed(1)}% of comparable fourth downs ${descriptions[state.choice]}. ${dominantNote} ${n<10?'This is a small sample; interpret with care.':'Now change the situation and watch how the strategy shifts.'}`);
    byId('chart-caption').textContent=`${state.dataset.scope}, Q${state.quarter}: ${number(n)} recorded plays within ±${bounds.field} yards of your field position and ±${bounds.distance} yards to go. ${expanded?'The matching window was expanded because fewer than 8 plays met the tighter criteria.':'The initial matching window was sufficient.'} Percentages describe observed choices, not outcomes.`;
  }

  function renderHeatmap() {
    const container = d3.select('#heatmap');
    container.selectAll('*').remove();
    if (!state.dataset) {
      container.append('div').attr('class','empty-heatmap').text('LOAD A CSV TO BUILD THE FOURTH-DOWN HEATMAP FROM REAL PLAYS.');
      byId('heatmap-caption').textContent='Empty squares indicate no matching recorded plays.';
      return;
    }
    const cells = NFLData.makeHeatmap(state.dataset.plays,state.quarter);
    const width=1110,height=434, left=95,top=55,right=25,bottom=67;
    const colW=(width-left-right)/10,rowH=(height-top-bottom)/6;
    const svg=container.append('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('role','img').attr('aria-label',`Go-for-it rate by field position and yards to go in quarter ${state.quarter}`);
    svg.append('title').text('Fourth-down go-for-it heatmap');
    // Perceptually ordered sequential colors, not a misleading rainbow scale.
    const color=d3.scaleSequential(d3.interpolateViridis).domain([0,1]);
    svg.append('text').attr('x',left).attr('y',20).attr('class','heat-axis-title').text('YARDS FROM OWN GOAL →');
    svg.append('text').attr('x',19).attr('y',32).attr('class','heat-axis-title').text('TO GO');
    NFLData.FIELD_BINS.forEach((field,i)=>svg.append('text').attr('x',left+i*colW+colW/2).attr('y',43).attr('text-anchor','middle').attr('class','heat-tick').text(field.label));
    NFLData.DISTANCE_BINS.forEach((dist,i)=>svg.append('text').attr('x',left-13).attr('y',top+i*rowH+rowH/2+5).attr('text-anchor','end').attr('class','heat-tick').text(dist.label));
    const groups = svg.selectAll('.heat-group').data(cells).join('g').attr('class','heat-group').attr('transform',d=>`translate(${left+d.col*colW},${top+d.row*rowH})`);
    groups.append('rect').attr('class','heat-cell').attr('x',2).attr('y',2).attr('width',colW-4).attr('height',rowH-4).attr('rx',3)
      .attr('fill',d=>d.n >= MIN_HEAT_SAMPLE ? color(d.rate):'#263941').attr('opacity',1)
      .attr('stroke',d=>state.position>=d.field.min&&state.position<d.field.max && state.distance>=d.distance.min&&state.distance<=d.distance.max?'#f1ffe0':'#39514c')
      .attr('stroke-width',d=>state.position>=d.field.min&&state.position<d.field.max && state.distance>=d.distance.min&&state.distance<=d.distance.max?2.7:1)
      .attr('tabindex',0).attr('role','button')
      .attr('aria-label',d=>`Field ${d.field.label}, yards to go ${d.distance.label}, ${d.n} plays, ${d.n>=MIN_HEAT_SAMPLE?Math.round(d.rate*100)+' percent went for it':'insufficient sample to show a rate'}. Click to select.`)
      .on('mouseenter',(event,d)=>showTooltip(event,`${d.field.label} yards from own goal · ${d.distance.label} to go · ${d.n} recorded plays${d.n>=MIN_HEAT_SAMPLE?` · ${d.go} attempted (${Math.round(d.rate*100)}%)`:' · sample too small for display'}`))
      .on('mousemove',moveTooltip).on('mouseleave',hideTooltip)
      .on('focus',(event,d)=>showTooltip({clientX:window.innerWidth/2,clientY:window.innerHeight/2},`${d.n} plays · ${d.n>=MIN_HEAT_SAMPLE?Math.round(d.rate*100)+'% attempts':'sample too small'}`))
      .on('blur',hideTooltip)
      .on('click',(_,d)=>selectCell(d))
      .on('keydown',(event,d)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectCell(d);}});
    groups.append('text').attr('x',colW/2).attr('y',rowH/2+5).attr('text-anchor','middle').attr('font-family','Barlow Condensed').attr('font-weight',800).attr('font-size',21).attr('pointer-events','none').attr('fill',d=>d.n>=MIN_HEAT_SAMPLE && d.rate>.64?'#14231c':'#f0f7f0').text(d=>d.n>=MIN_HEAT_SAMPLE?`${Math.round(d.rate*100)}%`:'—');
    groups.append('title').text(d=>`${d.field.label} yards from own goal · ${d.distance.label} to go · ${d.go} go-for-it plays / ${d.n} total plays`);
    svg.append('text').attr('x',left).attr('y',height-16).attr('font-family','DM Sans').attr('font-size',11).attr('fill','#9bb9ae').text('Own territory');
    svg.append('text').attr('x',left+5*colW).attr('y',height-16).attr('text-anchor','middle').attr('font-family','DM Sans').attr('font-size',11).attr('fill','#9bb9ae').text('Midfield');
    svg.append('text').attr('x',width-right).attr('y',height-16).attr('text-anchor','end').attr('font-family','DM Sans').attr('font-size',11).attr('fill','#9bb9ae').text('Opponent territory');
    const sampled=cells.filter(d=>d.n).length;
    byId('heatmap-caption').textContent=`Q${state.quarter} · ${sampled} of ${cells.length} situations represented in the CSV. Percentages use the observed number of attempts divided by recorded fourth-down choices in each cell. Cells with fewer than 5 plays show no rate.`;
  }
  function selectCell(cell) {
    state.position = Math.max(5,Math.min(95,cell.field.center));
    state.distance = cell.distance.center;
    updateSituation();
    byId('heatmap-selection').textContent=`SELECTED ${cell.field.label} YARD ZONE · ${cell.distance.label} TO GO`;
    byId('coach').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  function updateDataNotice(type,title,message) {
    const notice=byId('data-notice');
    notice.classList.remove('loaded','error');
    if (type) notice.classList.add(type);
    byId('notice-title').textContent=title;
    byId('notice-text').textContent=message;
    const indicator=byId('data-indicator');
    indicator.classList.toggle('loaded',type==='loaded');
    byId('data-status-short').textContent=type==='loaded'?'2026 DATA CONNECTED':type==='error'?'CHECK CSV FORMAT':'DATA NOT LOADED';
  }
  function setDataset(text, name) {
    const rows=d3.csvParse(text);
    const dataset=NFLData.parseAndNormalize(rows,{maxWeek:9,only2026:true});
    state.dataset=dataset;
    const stats=dataset.stats;
    const excluded=stats.skippedMissing+stats.skippedUnknown;
    let summary=`${number(dataset.plays.length)} usable fourth-down plays from ${name} (${dataset.scope}). ${number(stats.fourthDownRows)} fourth-down rows identified.`;
    if (excluded) summary+=` ${number(excluded)} excluded for missing fields or unrecognized plays.`;
    if (stats.excludedWeeks) summary+=` ${number(stats.excludedWeeks)} plays from later weeks excluded.`;
    if (stats.excludedNonRegular) summary+=` ${number(stats.excludedNonRegular)} preseason/Hall of Fame records excluded.`;
    if (stats.skippedOutsideScope) summary+=` ${number(stats.skippedOutsideScope)} rows outside 2026 excluded.`;
    updateDataNotice('loaded','REAL NFL DATA CONNECTED',summary);
    renderResult();renderHeatmap();
  }
  async function autoLoad() {
    for (const url of ['./2026_plays.csv','./data/2026_plays.csv']) {
      try {
        const response=await fetch(url);
        if (response.ok) {setDataset(await response.text(),url);return;}
      } catch (_) { /* file:// origins and missing paths are expected. Manual upload works. */ }
    }
  }
  function initialize() {
    if (typeof d3==='undefined'||typeof NFLData==='undefined') {
      updateDataNotice('error','VISUALIZATION LIBRARY UNAVAILABLE','D3.js did not load. Check your internet connection and refresh this webpage.');
      return;
    }
    // The clickable field is keyboard-operable as well as pointer-operable.
    // Focus remains on the persistent SVG node while its children redraw.
    byId('field-svg').addEventListener('keydown', event => {
      const steps = {ArrowLeft:-1,ArrowRight:1,Home:-999,End:999};
      if (!(event.key in steps)) return;
      event.preventDefault();
      state.position = event.key === 'Home' ? 5 : event.key === 'End' ? 95 :
        Math.max(5,Math.min(95,state.position+steps[event.key]));
      updateSituation();
    });
    byId('position-range').addEventListener('input',event=>{state.position=Number(event.target.value);updateSituation();});
    byId('distance-range').addEventListener('input',event=>{state.distance=Number(event.target.value);updateSituation();});
    document.querySelectorAll('[data-quarter]').forEach(button=>button.addEventListener('click',()=>{state.quarter=Number(button.dataset.quarter);updateSituation();}));
    document.querySelectorAll('[data-choice]').forEach(button=>{
      button.setAttribute('aria-pressed','false');
      button.addEventListener('click',()=>choosePlay(button.dataset.choice));
    });
    byId('reset-btn').addEventListener('click',()=>{state.position=56;state.distance=2;state.quarter=4;state.choice=null;document.querySelectorAll('[data-choice]').forEach(button=>{button.classList.remove('selected');button.setAttribute('aria-pressed','false');});byId('choice-hint').textContent='PICK A PLAY TO REVEAL THE DATA ↓';updateSituation();});
    byId('csv-file').addEventListener('change',async function(event){
      const file=event.target.files?.[0];if(!file)return;
      try {setDataset(await file.text(),file.name);}
      catch(error){state.dataset=null;renderResult();renderHeatmap();updateDataNotice('error','CSV COULD NOT BE LOADED',error.message);}
      event.target.value='';
    });
    updateSituation();
    autoLoad().catch(error=>{updateDataNotice('error','DATA LOAD ERROR',error.message);});
  }
  if (document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);
  else initialize();
})();
