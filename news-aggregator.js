const STORAGE = {
  savedSignals:'ceiSavedSignals',
  talking:'ceiTalkingPoints',
  predictions:'ceiPredictions',
  briefs:'ceiBriefItems',
  reviewed:'ceiArticlesReviewed',
  dashboard:'cei.home.dashboard.v2'
};
const weeklyGoal = 20;
let activeFilter = 'All';
let articles = [];
const sampleArticles = [
  {id:'boc-rates',title:'Bank of Canada rate outlook',source:'Bank of Canada',url:'https://www.bankofcanada.ca/rss-feeds/',category:'Rates',tier:'Tier 1',relevance:5,impact:'Unclassified',why:'May affect borrowing conditions, mortgage qualification, buyer confidence, and future absorption assumptions.'},
  {id:'cmhc-starts',title:'CMHC housing starts update',source:'CMHC',url:'https://www.cmhc-schl.gc.ca/media-newsroom/cmhc-news-room-rss',category:'Housing',tier:'Tier 1',relevance:5,impact:'Unclassified',why:'Housing starts can indicate future inventory pressure and help inform phasing, pricing, and absorption assumptions.'},
  {id:'bcrea-market',title:'BCREA housing market update',source:'BCREA',url:'https://www.bcrea.bc.ca/economics/',category:'Housing',tier:'Tier 3',relevance:4,impact:'Unclassified',why:'BC housing market commentary can help frame buyer demand, listing pressure, and regional market risk.'},
  {id:'fvreb-market',title:'Fraser Valley market report',source:'FVREB',url:'https://www.fvreb.bc.ca/statistics/monthly-market-report/',category:'Fraser Valley',tier:'Tier 3',relevance:5,impact:'Unclassified',why:'Fraser Valley market trends are directly relevant to Chilliwack demand, pricing, and absorption assumptions.'},
  {id:'construction-costs',title:'Construction cost pressure remains mixed',source:'Industry scan',url:'https://www.altusgroup.com/insights/',category:'Construction',tier:'Tier 3',relevance:4,impact:'Unclassified',why:'Cost pressure affects pro formas, contingency assumptions, feasibility, and timing of commitments.'}
];
const $ = id => document.getElementById(id);
function get(key){return JSON.parse(localStorage.getItem(key)||'[]')}
function set(key,val){localStorage.setItem(key,JSON.stringify(val))}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),1700)}
function stars(n){return '★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n)}
function impactClass(i){return i==='Bullish'?'green':i==='Neutral'?'yellow':i==='Bearish'?'red':'gray'}
function loadArticles(){const stored=JSON.parse(localStorage.getItem('ceiAggregatorArticles')||'null');articles=stored||sampleArticles;render()}
function saveArticles(){localStorage.setItem('ceiAggregatorArticles',JSON.stringify(articles))}
function updateCounters(){
 const saved=get(STORAGE.savedSignals), talking=get(STORAGE.talking), preds=get(STORAGE.predictions), briefs=get(STORAGE.briefs), reviewed=get(STORAGE.reviewed);
 const total=reviewed.length+saved.length+talking.length+preds.length+briefs.length;
 $('pipelineTotal').textContent=total; $('articlesReviewedCount').textContent=reviewed.length; $('savedSignalsCount').textContent=saved.length; $('talkingPointsCount').textContent=talking.length; $('predictionsCount').textContent=preds.length; $('briefItemsCount').textContent=briefs.length;
 const pct=Math.min(100,Math.round(total/weeklyGoal*100)); $('weeklyPill').textContent=pct+'% weekly goal'; $('weeklyBar').style.width=pct+'%';
 $('articleCount').textContent=articles.length; $('highRelevanceCount').textContent=articles.filter(a=>a.relevance>=4).length; $('housingCount').textContent=articles.filter(a=>a.category==='Housing').length; $('ratesCount').textContent=articles.filter(a=>a.category==='Rates').length;
 generateDigest();
}
function reviewed(article){let r=get(STORAGE.reviewed); if(!r.some(x=>x.id===article.id)){r.unshift({id:article.id,title:article.title,date:new Date().toISOString()});set(STORAGE.reviewed,r)}}
function classify(article,impact){article.impact=impact; reviewed(article); saveArticles(); toast('Marked '+impact); render()}
function saveSignal(article){let arr=get(STORAGE.savedSignals); if(!arr.some(x=>x.id===article.id)) arr.unshift({...article,savedAt:new Date().toISOString()}); set(STORAGE.savedSignals,arr); reviewed(article); toast('Signal saved'); updateCounters()}
function talkingPoint(article){let arr=get(STORAGE.talking); arr.unshift({id:Date.now(),text:`${article.category}: ${article.title}. ${article.why}`,source:article.source,createdAt:new Date().toISOString()}); set(STORAGE.talking,arr); reviewed(article); toast('Talking point added'); updateCounters()}
function prediction(article){let arr=get(STORAGE.predictions); arr.unshift({id:Date.now(),title:`${article.title} will influence ${article.category.toLowerCase()} conditions`,source:article.source,category:article.category,confidence:'Medium',status:'Pending',createdAt:new Date().toISOString()}); set(STORAGE.predictions,arr); reviewed(article); toast('Prediction created'); updateCounters()}
function brief(article){let arr=get(STORAGE.briefs); arr.unshift({id:Date.now(),title:article.title,source:article.source,category:article.category,impact:article.impact,summary:article.why,createdAt:new Date().toISOString()}); set(STORAGE.briefs,arr); reviewed(article); toast('Added to brief'); updateCounters()}
function sendDashboard(article){let dash={}; try{dash=JSON.parse(localStorage.getItem(STORAGE.dashboard)||'{}')}catch{}; if(!dash.signals) dash.signals=[]; if(!dash.signals.some(s=>s.text===article.title)){dash.signals.unshift({category:article.category,text:article.title,impact:article.impact==='Unclassified'?'Neutral':article.impact,confidence:'Medium'});dash.signals=dash.signals.slice(0,5)} localStorage.setItem(STORAGE.dashboard,JSON.stringify(dash)); reviewed(article); toast('Sent to dashboard'); updateCounters()}
function openSource(article){ if(article.url){window.open(article.url,'_blank','noopener')} else toast('No source URL') }
function render(){
 const feed=$('feed'); feed.innerHTML=''; $('activeFilter').textContent=activeFilter;
 const filtered=activeFilter==='All'?articles:articles.filter(a=>a.category===activeFilter||a.title.includes(activeFilter)||a.source.includes(activeFilter));
 filtered.forEach(article=>{const node=$('articleTemplate').content.cloneNode(true); node.querySelector('.source-line').textContent=article.source; node.querySelector('.article-title').textContent=article.title; node.querySelector('.stars').textContent=stars(article.relevance); node.querySelector('.category-tag').textContent=article.category; node.querySelector('.tier-tag').textContent=article.tier; const impact=node.querySelector('.impact-tag'); impact.textContent=article.impact; impact.className='tag impact-tag '+impactClass(article.impact); node.querySelector('.why-text').textContent=article.why; node.querySelectorAll('[data-impact]').forEach(b=>b.onclick=()=>classify(article,b.dataset.impact)); node.querySelector('.save-signal').onclick=()=>saveSignal(article); node.querySelector('.talking-point').onclick=()=>talkingPoint(article); node.querySelector('.prediction').onclick=()=>prediction(article); node.querySelector('.brief').onclick=()=>brief(article); node.querySelector('.dashboard').onclick=()=>sendDashboard(article); node.querySelector('.open-source').onclick=()=>openSource(article); feed.appendChild(node)});
 updateCounters();
}
function generateDigest(){const saved=get(STORAGE.savedSignals), talking=get(STORAGE.talking), preds=get(STORAGE.predictions), briefs=get(STORAGE.briefs); const lines=['CEI Intelligence Pipeline Digest','',`Signals saved: ${saved.length}`,`Talking points: ${talking.length}`,`Predictions: ${preds.length}`,`Brief items: ${briefs.length}`,'','Top talking points:']; talking.slice(0,3).forEach((t,i)=>lines.push(`${i+1}. ${t.text}`)); $('digestOutput').value=lines.join('\n')}
function addManual(){const title=$('manualTitle').value.trim(); if(!title){toast('Add a title first');return} const article={id:'manual-'+Date.now(),title,source:$('manualSource').value.trim()||'Manual source',url:$('manualUrl').value.trim(),category:$('manualCategory').value,tier:'Manual',relevance:4,impact:'Unclassified',why:$('manualWhy').value.trim()||'Manual interpretation not added yet.'}; articles.unshift(article); saveArticles(); ['manualTitle','manualSource','manualUrl','manualWhy'].forEach(id=>$(id).value=''); toast('Article added'); render()}
document.querySelectorAll('#filters button').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('#filters button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');activeFilter=btn.dataset.filter;render()});
$('refreshBtn').onclick=()=>{articles=sampleArticles.map(a=>({...a}));saveArticles();toast('Sample news refreshed');render()};
$('clearDataBtn').onclick=()=>{if(confirm('Clear pipeline local data?')){Object.values(STORAGE).forEach(k=>{if(k!==STORAGE.dashboard)localStorage.removeItem(k)});toast('Pipeline cleared');render()}};
$('clearManualBtn').onclick=()=>['manualTitle','manualSource','manualUrl','manualWhy'].forEach(id=>$(id).value='');
$('addManualBtn').onclick=addManual;
$('copyDigestBtn').onclick=()=>navigator.clipboard.writeText($('digestOutput').value||'');
if('serviceWorker' in navigator){navigator.serviceWorker.register('./news-aggregator-sw.js').catch(()=>{})}
loadArticles();