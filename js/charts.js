/* Buildless charts. Saved records stay in SymptomStore; sample mode never writes. */
window.TrackerCharts = (() => {
  const day = value => Date.parse(value + 'T00:00:00Z') / 86400000;
  const format = value => new Date(value + 'T12:00:00').toLocaleDateString(undefined, {month:'short',day:'numeric',year:'numeric'});
  function model(entries, range = {}) {
    const rows = entries.filter(e => (!range.start || e.entryDate >= range.start) && (!range.end || e.entryDate <= range.end)).slice().sort((a,b)=>a.entryDate.localeCompare(b.entryDate));
    const counts = new Map();
    rows.forEach(e => [...new Set(e.symptoms)].forEach(s=>counts.set(s,(counts.get(s)||0)+1)));
    const symptoms = [...counts].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
    const values = rows.map(e=>e.pain);
    const segments=[];
    rows.forEach((e,i)=>{if(i && day(e.entryDate)-day(rows[i-1].entryDate)===1)segments.push([rows[i-1],e]);});
    return {rows,symptoms,segments,count:rows.length,average:rows.length?Math.round(values.reduce((a,b)=>a+b,0)/rows.length*10)/10:null,min:rows.length?Math.min(...values):null,max:rows.length?Math.max(...values):null};
  }
  function mount(root, store) {
    root.innerHTML = `<h1>Trends</h1><p class="muted">Patterns from your check-ins, at your own pace.</p><form class="card chart-filters"><div class="grid"><label>From<input type="date" name="start"></label><label>Through<input type="date" name="end"></label></div><div class="actions"><button class="primary" type="submit">Apply dates</button><button type="button" data-action="month">This month</button><button type="button" data-action="all">All dates</button><button type="button" data-action="sample" aria-pressed="false">View sample data</button></div><p class="message" data-error role="alert" hidden></p></form><p data-context role="status" aria-live="polite"></p><div data-results></div><p class="muted">Based only on recorded entries. Missing days are not zero-pain days. These charts do not diagnose conditions or explain what caused symptoms.</p>`;
    const form=root.querySelector('form'),results=root.querySelector('[data-results]'),error=root.querySelector('[data-error]'),context=root.querySelector('[data-context]');
    let sample=false;
    const el=(tag,text,parent,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;parent.append(n);return n;};
    function card(title) {const n=el('section',undefined,results,'card');el('h2',title,n);return n;}
    function svgNode(tag,attributes,parent,text) {const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attributes).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;parent.append(n);return n;}
    function samples() {const today=store.todayString();return [0,1,2,4,5,7,8].map((offset,i)=>{const d=new Date(today+'T12:00:00');d.setDate(d.getDate()-8+offset);return {entryDate:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,pain:[4,6,3,0,2,3,1][i],symptoms:i<4?['headache','fatigue']:i===4?['fatigue']:[]};});}
    function draw() {
      error.hidden=true;results.replaceChildren();context.textContent='Loading charts…';
      try {
        const range={start:form.elements.start.value,end:form.elements.end.value};
        if(range.start && range.end && range.start>range.end)throw Error('Choose an end date on or after the start date.');
        const response=store.listEntries(range);
        if(!response.ok)throw Error(Object.values(response.errors).join(' '));
        const data=model(sample?samples():response.data,range);
        const period=range.start&&range.end?`${format(range.start)} – ${format(range.end)}`:range.start?`From ${format(range.start)}`:range.end?`Through ${format(range.end)}`:'All dates';
        context.textContent=`${sample?'Sample data · ':''}${period} · ${data.count} logged ${data.count===1?'day':'days'}`;
        const pain=card('Pain over time');el('p','Reported pain: 0 = none, 10 = highest.',pain,'muted');
        if(data.count<2) {
          el('p',data.count?'One entry is recorded. Add a check-in on another date to see pain over time.':'No entries in this date range. Add a check-in or choose a different range.',pain);
          if(data.count)el('p',`${format(data.rows[0].entryDate)}: pain ${data.rows[0].pain} out of 10.`,pain);
          const a=el('a','Go to check-in',pain,'action');a.href='#check-in';
        } else {
          const summary=`Based on your ${data.count} entries in this range, reported pain averaged ${data.average} out of 10, with scores from ${data.min} to ${data.max}.`;
          const scroll=el('div',undefined,pain,'chart-scroll');
          const svg=svgNode('svg',{viewBox:'0 0 720 260',role:'img','aria-label':summary},scroll);
          svgNode('title',{},svg,'Pain scores on recorded dates');
          const first=day(range.start||data.rows[0].entryDate),last=day(range.end||data.rows[data.count-1].entryDate);
          const x=d=>52+(day(d)-first)/Math.max(1,last-first)*620,y=v=>210-v*18;
          [0,2,4,6,8,10].forEach(v=>{svgNode('line',{x1:52,y1:y(v),x2:672,y2:y(v),stroke:'#ddd'},svg);svgNode('text',{x:37,y:y(v)+5,'text-anchor':'end'},svg,String(v));});
          data.segments.forEach(([a,b])=>svgNode('line',{x1:x(a.entryDate),y1:y(a.pain),x2:x(b.entryDate),y2:y(b.pain),stroke:'#555','stroke-width':2},svg));
          data.rows.forEach(r=>{const dot=svgNode('circle',{cx:x(r.entryDate),cy:y(r.pain),r:4,fill:'#333'},svg);svgNode('title',{},dot,`${format(r.entryDate)}: ${r.pain}/10`);});
          const ticks=[first,Math.round((first+last)/2),last];[...new Set(ticks)].forEach((d,i)=>{const date=new Date(d*86400000).toISOString().slice(0,10);svgNode('text',{x:x(date),y:242,'text-anchor':i===0?'start':d===last?'end':'middle'},svg,format(date));});
          el('p',summary,pain);el('p','Lines connect consecutive logged days only. Gaps mean no check-in was recorded.',pain,'muted');
        }
        const frequency=card('Symptom frequency');el('p','Number of logged days each symptom was recorded. A day can include more than one symptom.',frequency,'muted');
        if(!data.count)el('p','No entries in this date range. Your recorded symptoms will appear here.',frequency);
        else if(!data.symptoms.length)el('p',`No symptoms were selected in the ${data.count} logged ${data.count===1?'day':'days'} in this range. This does not tell us whether symptoms occurred.`,frequency);
        else {
          const list=el('ul',undefined,frequency,'frequency-list');
          data.symptoms.forEach(s=>{const li=el('li',undefined,list);const label=el('div',undefined,li,'frequency-label');el('span',s.name,label);el('span',`${s.count} of ${data.count} ${data.count===1?'day':'days'}`,label);const track=el('div',undefined,li,'frequency-track');track.setAttribute('aria-hidden','true');const bar=el('div',undefined,track,'frequency-bar');bar.style.width=`${s.count/data.count*100}%`;});
          const top=data.symptoms[0];el('p',`Based on your entries, ${top.name} was recorded on ${top.count} of ${data.count} logged ${data.count===1?'day':'days'} in this range.`,frequency);
        }
        if(data.count){const details=el('details',undefined,results,'card');el('summary','View chart data as a table',details);const wrap=el('div',undefined,details,'chart-table-scroll');const table=el('table',undefined,wrap);el('caption','Recorded entries in the selected range',table);const head=el('tr',undefined,el('thead',undefined,table));['Date','Pain (0–10)','Symptoms'].forEach(t=>{const th=el('th',t,head);th.scope='col';});const body=el('tbody',undefined,table);data.rows.forEach(r=>{const tr=el('tr',undefined,body);[format(r.entryDate),String(r.pain),r.symptoms.join(', ')||'None selected'].forEach(t=>el('td',t,tr));});}
      } catch(e) {context.textContent='Charts could not be loaded.';error.hidden=false;error.textContent=e.message+' Adjust the range or try Apply dates again.';error.className='message error';}
    }
    function month(){const today=store.todayString();form.elements.start.value=today.slice(0,8)+'01';form.elements.end.value=today;draw();}
    form.addEventListener('submit',e=>{e.preventDefault();draw();});
    form.querySelector('[data-action=month]').onclick=month;
    form.querySelector('[data-action=all]').onclick=()=>{form.reset();draw();};
    form.querySelector('[data-action=sample]').onclick=e=>{sample=!sample;e.currentTarget.textContent=sample?'View my entries':'View sample data';e.currentTarget.setAttribute('aria-pressed',String(sample));draw();};
    month();
  }
  return {model,mount};
})();
