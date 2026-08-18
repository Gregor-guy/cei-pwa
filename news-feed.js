const STORAGE_KEY = 'cei.news.feed.v2';
const HOME_KEY = 'cei.home.dashboard.v2';

const defaultState = {
  signals: [],
  saved: [],
  talkingPoints: [],
  briefItems: [],
  predictions: [],
  processed: []
};
let state = loadState();

const $ = (id) => document.getElementById(id);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

function loadState(){
  try { return { ...structuredClone(defaultState), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
  catch { return structuredClone(defaultState); }
}
function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); render(); }
function persistOnly(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function stars(n){ return '★★★★★'.slice(0,n) + '☆☆☆☆☆'.slice(0,5-n); }
function priorityClass(p){ return p === 'High' ? 'red' : p === 'Medium' ? 'yellow' : 'gray'; }
function impactClass(i){ return i === 'Bullish' ? 'green' : i === 'Bearish' ? 'red' : i === 'Neutral' ? 'yellow' : 'gray'; }

function signalFromForm(){
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    title: $('signalTitle').value.trim(),
    source: $('signalSource').value.trim(),
    category: $('signalCategory').value,
    impact: $('signalImpact').value,
    priority: $('signalPriority').value,
    confidence: $('signalConfidence').value,
    relevance: Number($('signalRelevance').value),
    why: $('signalWhy').value.trim(),
    url: $('signalUrl').value.trim(),
    processed: false
  };
}
function clearForm(){
  ['signalTitle','signalSource','signalWhy','signalUrl'].forEach(id => $(id).value='');
  $('signalCategory').value = 'Rates'; $('signalImpact').value = 'Bullish'; $('signalPriority').value = 'High'; $('signalConfidence').value = 'High'; $('signalRelevance').value = 3; updateStars();
}
function addSignal(){
  const sig = signalFromForm();
  if(!sig.title){ alert('Add a signal headline first.'); return; }
  state.signals.unshift(sig); clearForm(); persist();
}
function addSamples(){
  const samples = [
    {title:'Rate outlook is stabilizing', source:'Bank of Canada / private bank analysis', category:'Rates', impact:'Bullish', priority:'High', confidence:'Medium', relevance:5, why:'Stable or improving borrowing conditions may support buyer qualification, absorption, and pro forma assumptions.', url:''},
    {title:'Fraser Valley inventory remains elevated', source:'FVREB / BCREA', category:'Housing', impact:'Neutral', priority:'Medium', confidence:'Medium', relevance:5, why:'Elevated inventory can improve buyer choice but may pressure pricing assumptions and phasing strategy.', url:''},
    {title:'Construction cost pressure is mixed', source:'Industry reports / contractor feedback', category:'Construction', impact:'Neutral', priority:'Medium', confidence:'Low', relevance:4, why:'Mixed cost pressure should be monitored before locking budgets or preparing acquisition assumptions.', url:''}
  ];
  samples.forEach(s => state.signals.unshift({id:uid(), createdAt:new Date().toISOString(), processed:false, ...s}));
  persist();
}

function render(){
  const unprocessed = state.signals.filter(s => !s.processed);
  const high = unprocessed.filter(s => s.priority === 'High').length;
  $('newSignalsCount').textContent = unprocessed.length;
  $('highImpactPill').textContent = `${high} high impact`;
  $('highImpactPill').className = 'pill ' + (high ? 'red' : 'blue');
  $('processedCount').textContent = state.processed.length;
  $('savedCount').textContent = state.saved.length;
  $('briefCount').textContent = state.briefItems.length;
  renderList('unprocessedList', unprocessed, true);
  renderList('savedList', state.saved, false);
  renderCompact('talkingList', state.talkingPoints);
  renderCompact('briefList', state.briefItems);
  $('backupPreview').value = JSON.stringify(state, null, 2);
}

function renderList(targetId, list, allowActions){
  const target = $(targetId); target.innerHTML = '';
  if(!list.length){ target.innerHTML = '<div class="empty">No signals here yet.</div>'; return; }
  list.forEach(signal => {
    const node = $('signalTemplate').content.cloneNode(true);
    const card = node.querySelector('.signal-card');
    card.querySelector('.signal-title').textContent = signal.title;
    card.querySelector('.signal-source').textContent = signal.source ? `Source: ${signal.source}` : 'Source: not recorded';
    const pill = card.querySelector('.signal-priority');
    pill.textContent = signal.priority;
    pill.className = 'signal-priority pill ' + priorityClass(signal.priority);
    card.querySelector('.signal-category').textContent = signal.category;
    const impact = card.querySelector('.signal-impact'); impact.textContent = signal.impact; impact.className = 'tag signal-impact ' + impactClass(signal.impact);
    card.querySelector('.signal-confidence').textContent = `Confidence: ${signal.confidence}`;
    card.querySelector('.signal-relevance').textContent = `${stars(signal.relevance)} Chilliwack`;
    card.querySelector('.signal-why').textContent = signal.why || 'No interpretation added yet.';
    card.querySelector('.bullish').onclick = () => classify(signal.id, 'Bullish');
    card.querySelector('.neutral').onclick = () => classify(signal.id, 'Neutral');
    card.querySelector('.bearish').onclick = () => classify(signal.id, 'Bearish');
    card.querySelector('.noise').onclick = () => classify(signal.id, 'Noise');
    card.querySelector('.save-top').onclick = () => saveTopSignal(signal);
    card.querySelector('.save-talk').onclick = () => addTalkingPoint(signal);
    card.querySelector('.save-prediction').onclick = () => addPrediction(signal);
    card.querySelector('.save-brief').onclick = () => addBriefItem(signal);
    card.querySelector('.details-btn').onclick = () => showDetails(signal);
if (!allowActions) {
  card.querySelectorAll('.action-grid').forEach(grid => {
    grid.style.display = 'none';
  });
}
    target.appendChild(node);
  });
}
function renderCompact(targetId, list){
  const target = $(targetId); target.innerHTML = '';
  if(!list.length){ target.innerHTML = '<div class="empty">Empty</div>'; return; }
  list.slice(0,8).forEach(item => {
    const div = document.createElement('div'); div.className='compact-item'; div.textContent = item.text || item.title || item;
    target.appendChild(div);
  });
}
function classify(id, impact){
  const sig = state.signals.find(s => s.id === id) || state.saved.find(s => s.id === id);
  if(!sig) return;
  sig.impact = impact; sig.processed = true;
  if(!state.processed.some(s => s.id === id)) state.processed.unshift({...sig});
  persist();
}
function saveTopSignal(signal){
  if(!state.saved.some(s => s.id === signal.id)) state.saved.unshift({...signal, savedAt:new Date().toISOString()});
  syncToHomeTopSignals(signal);
  persist();
}
function addTalkingPoint(signal){
  const text = `${signal.category}: ${signal.title}. ${signal.why || ''}`.slice(0,220);
  state.talkingPoints.unshift({id:uid(), signalId:signal.id, text});
  syncToHomeTalkingPoint(text);
  persist();
}
function addPrediction(signal){
  const text = `Prediction: ${signal.title} will affect ${signal.category.toLowerCase()} conditions in Chilliwack.`;
  state.predictions.unshift({id:uid(), signalId:signal.id, text, status:'Pending', confidence:signal.confidence, createdAt:new Date().toISOString()});
  persist();
}
function addBriefItem(signal){
  const text = `${signal.title} | Impact: ${signal.impact} | Relevance: ${stars(signal.relevance)} | Why it matters: ${signal.why || 'Interpretation not added.'}`;
  state.briefItems.unshift({id:uid(), signalId:signal.id, text});
  persist();
}
function syncToHomeTopSignals(signal){
  try{
    const home = JSON.parse(localStorage.getItem(HOME_KEY) || '{}');
    if(!home.signals) home.signals = [];
    home.signals.unshift({category:signal.category, text:signal.title, impact:signal.impact, confidence:signal.confidence});
    home.signals = home.signals.slice(0,5);
    localStorage.setItem(HOME_KEY, JSON.stringify(home));
  }catch{}
}
function syncToHomeTalkingPoint(text){
  try{
    const home = JSON.parse(localStorage.getItem(HOME_KEY) || '{}');
    if(!home.talking) home.talking = ['', '', ''];
    const existing = home.talking.filter(Boolean);
    home.talking = [text, ...existing].slice(0,3);
    while(home.talking.length<3) home.talking.push('');
    localStorage.setItem(HOME_KEY, JSON.stringify(home));
  }catch{}
}
function showDetails(signal){
  const urlLine = signal.url ? `<p><strong>URL:</strong> <a class="source-link" href="${signal.url}" target="_blank" rel="noopener">${signal.url}</a></p>` : '';
  $('detailsContent').innerHTML = `
    <p class="label">${signal.category}</p>
    <h2>${signal.title}</h2>
    <p><strong>Source:</strong> ${signal.source || 'Not recorded'}</p>
    <p><strong>Impact:</strong> ${signal.impact}</p>
    <p><strong>Priority:</strong> ${signal.priority}</p>
    <p><strong>Confidence:</strong> ${signal.confidence}</p>
    <p><strong>Chilliwack relevance:</strong> ${stars(signal.relevance)}</p>
    <p><strong>Why this matters:</strong><br>${signal.why || 'Not added.'}</p>
    ${urlLine}
    <p class="status-line">Created: ${new Date(signal.createdAt).toLocaleString()}</p>`;
  $('detailsPanel').classList.remove('hidden');
}
function generateDigest(){
  const pool = [...state.saved, ...state.processed].slice(0,30);
  const high = pool.filter(s => s.priority === 'High');
  const medium = pool.filter(s => s.priority === 'Medium');
  const low = pool.filter(s => s.priority === 'Low');
  const lines = [];
  lines.push('Weekly News & Intelligence Digest');
  lines.push('');
  lines.push(`High impact signals: ${high.length}`);
  lines.push(`Medium impact signals: ${medium.length}`);
  lines.push(`Low impact signals: ${low.length}`);
  lines.push('');
  lines.push('Top Signals:');
  pool.slice(0,10).forEach((s,i)=>lines.push(`${i+1}. ${s.category} | ${s.title} | ${s.impact} | ${stars(s.relevance)} | ${s.source || 'Source not recorded'}`));
  lines.push('');
  lines.push('Leadership Talking Points:');
  state.talkingPoints.slice(0,3).forEach((t,i)=>lines.push(`${i+1}. ${t.text}`));
  $('digestOutput').value = lines.join('\n');
}
function download(filename, text){
  const blob = new Blob([text], {type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href);
}
function updateStars(){ $('relevanceStars').textContent = stars(Number($('signalRelevance').value)); }

$('signalRelevance').addEventListener('input', updateStars);
$('addSignalBtn').onclick = addSignal;
$('clearFormBtn').onclick = clearForm;
$('seedBtn').onclick = addSamples;
$('generateDigestBtn').onclick = generateDigest;
$('copyDigestBtn').onclick = () => navigator.clipboard.writeText($('digestOutput').value || '');
$('clearSavedBtn').onclick = () => { if(confirm('Clear saved signals?')){ state.saved = []; persist(); } };
$('fab').onclick = () => { window.scrollTo({top:0, behavior:'smooth'}); $('signalTitle').focus(); };
$('backupBtn').onclick = () => $('backupPanel').classList.remove('hidden');
$('closeBackup').onclick = () => $('backupPanel').classList.add('hidden');
$('closeDetails').onclick = () => $('detailsPanel').classList.add('hidden');
$('exportBtn').onclick = () => download('cei-news-feed-backup.json', JSON.stringify(state, null, 2));
$('importFile').addEventListener('change', e => {
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = () => { try { state = JSON.parse(reader.result); persist(); alert('Import complete'); } catch { alert('Import failed'); } };
  reader.readAsText(file);
});
$('resetBtn').onclick = () => { if(confirm('Reset News Feed data?')){ state = structuredClone(defaultState); persist(); } };

if('serviceWorker' in navigator){ navigator.serviceWorker.register('./news-feed-sw.js').catch(()=>{}); }
updateStars(); render();
