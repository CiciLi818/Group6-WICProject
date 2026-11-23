function runChartTests() {
 const results=[];
 function test(name,fn){try{fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
 function equal(actual,expected){if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error(JSON.stringify(actual)+' !== '+JSON.stringify(expected));}
 const row=(date,pain,symptoms=[])=>({entryDate:date,pain,symptoms});
 const entries=[row('2026-11-01',0,['headache','headache']),row('2026-11-02',4,['headache','fatigue']),row('2026-11-04',2,[])];
 const model=window.TrackerCharts.model;
 test('empty range has no invented scores',()=>{const m=model([]);equal([m.count,m.average,m.min,m.max],[0,null,null,null]);});
 test('zero pain is included in the average',()=>equal(model(entries).average,2));
 test('range includes both boundary dates',()=>equal(model(entries,{start:'2026-11-02',end:'2026-11-04'}).count,2));
 test('missing days do not get connecting lines',()=>equal(model(entries).segments.length,1));
 test('symptoms count days, not duplicate selections',()=>equal(model(entries).symptoms,[{name:'headache',count:2},{name:'fatigue',count:1}]));
 test('single entry has no line',()=>equal(model([entries[0]]).segments.length,0));
 test('entries without symptoms remain in denominator',()=>equal(model(entries).count,3));
 test('empty filtered range remains empty',()=>equal(model(entries,{start:'2026-12-01'}).count,0));
 test('sorting does not mutate stored entries',()=>{const copy=[entries[2],entries[0]];model(copy);equal(copy[0].entryDate,'2026-11-04');});
 test('consecutive dates connect across month boundaries',()=>equal(model([row('2026-10-31',1),row('2026-11-01',2)]).segments.length,1));
 return results;
}
