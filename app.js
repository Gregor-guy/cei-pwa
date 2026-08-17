const STORAGE_KEY = 'cei.home.dashboard.v2';

const defaultState = {
  cdei: 0,
  points: 0,
  streak: 0,
  bestStreak: 0,
  predictions: { correct: 0, partial: 0, wrong: 0 },
  checks: { monday:false, wednesday:false, friday:false, predictions:false },
  talking: ['', '', ''],
  signals: [
    { category:'Housing', text:'', impact:'Neutral', confidence:'Medium' },
    { category:'Rates', text:'', impact:'Neutral', confidence:'Medium' },
    { category:'Retail', text:'', impact:'Neutral', confidence:'Medium' }
  ],
  snapshot: { housing:'Neutral', retail:'Neutral', multifamily:'Neutral', industrial:'Neutral', land:'Neutral', approvals:'Neutral' },
  quickNotes: []
};

let state = loadState();

const $ = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

function loadState(){
  try { return { ...structuredClone(defaultState), ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
  catch { return structuredClone(defaultState); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); render(); }
function download(filename, text){
  const blob = new Blob([text], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

function statusFor(score){
  if(score >= 70) return ['Tailwind','green'];
  if(score >= 50) return ['Neutral','yellow'];
  return ['Headwind','red'];
}
function totalPredictionAttempts(){ return state.predictions.correct + state.predictions.partial + state.predictions.wrong; }
function predictionPoints(){ return state.predictions.correct*3 + state.predictions.partial; }
function levelInfo(points){
  if(points >= 300) return ['Executive', 'Max'];
  if(points >= 201) return ['VP', 'Executive'];
  if(points >= 101) return ['Director', 'VP'];
  if(points >= 51) return ['Strategist', 'Director'];
  return ['Analyst', 'Strategist'];
}
function completionPercent(){
  const vals = Object.values(state.checks); const done = vals.filter(Boolean).length;
  return Math.round((done / vals.length) * 100);
}
function achievements(){
  const attempts = totalPredictionAttempts();
  const pts = predictionPoints()+state.points;
  return [
    ['First Forecast', attempts >= 1, 'Score your first prediction'],
    ['Signal Hunter', state.signals.filter(s=>s.text.trim()).length >= 5, 'Capture 5 signals'],
    ['Weekly Operator', completionPercent() === 100, 'Finish the weekly checklist'],
    ['Strategist', pts >= 51, 'Reach 51 points'],
    ['Director Level', pts >= 101, 'Reach 101 points'],
    ['Streak Builder', state.streak >= 4, 'Complete 4 weeks']
  ];
}

function render(){
  $('cdeiRange').value = state.cdei;
  $('cdeiScore').textContent = state.cdei;
  const [status, cls] = statusFor(state.cdei);
  $('statusPill').textContent = status;
  $('statusPill').className = 'pill ' + cls;
  const pts = predictionPoints()+state.points;
  const [level, next] = levelInfo(pts);
  $('levelText').textContent = level;
  $('pointsText').textContent = pts;
  $('nextLevelText').textContent = next;
  const attempts = totalPredictionAttempts();
  const accuracy = attempts ? Math.round(((state.predictions.correct + state.predictions.partial*0.5) / attempts) * 100) : 0;
  $('accuracyText').textContent = accuracy + '%';
  $('predictionBreakdown').textContent = `${state.predictions.correct} correct · ${state.predictions.partial} partial · ${state.predictions.wrong} wrong`;
  $('streakText').textContent = state.streak;
  $('bestStreakText').textContent = state.bestStreak;
  const pct = completionPercent();
  $('completionText').textContent = pct + '%';
  $('progressBar').style.width = pct + '%';
  qsa('[data-check]').forEach(input => { input.checked = !!state.checks[input.dataset.check]; });
  $('talk1').value = state.talking[0] || '';
  $('talk2').value = state.talking[1] || '';
  $('talk3').value = state.talking[2] || '';
  renderSignals();
  qsa('[data-snapshot]').forEach(sel => { sel.value = state.snapshot[sel.dataset.snapshot] || 'Neutral'; });
  renderAchievements();
  $('backupPreview').value = JSON.stringify(state, null, 2);
}

function renderSignals(){
  const list = $('signalsList');
  list.innerHTML = '';
  state.signals.slice(0,5).forEach((signal, index) => {
    const node = $('signalTemplate').content.cloneNode(true);
    const card = node.querySelector('.signal-card');
    card.querySelector('.signal-category').value = signal.category;
    card.querySelector('.signal-text').value = signal.text;
    card.querySelector('.signal-impact').value = signal.impact;
    card.querySelector('.signal-confidence').value = signal.confidence;
    card.querySelector('.signal-category').onchange = e => { state.signals[index].category = e.target.value; saveState(); };
    card.querySelector('.signal-text').oninput = e => { state.signals[index].text = e.target.value; persistOnly(); };
    card.querySelector('.signal-impact').onchange = e => { state.signals[index].impact = e.target.value; saveState(); };
    card.querySelector('.signal-confidence').onchange = e => { state.signals[index].confidence = e.target.value; saveState(); };
    card.querySelector('.remove-signal').onclick = () => { state.signals.splice(index,1); saveState(); };
    list.appendChild(node);
  });
}
function persistOnly(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function renderAchievements(){
  const wrap = $('achievements'); wrap.innerHTML = '';
  achievements().forEach(([name, unlocked, desc]) => {
    const div = document.createElement('div');
    div.className = 'achievement ' + (unlocked ? 'unlocked' : '');
    div.innerHTML = `<strong>${unlocked ? '🏅' : '⬜'} ${name}</strong><span>${desc}</span>`;
    wrap.appendChild(div);
  });
}

$('cdeiRange').addEventListener('input', e => { state.cdei = Number(e.target.value); saveState(); });
qsa('[data-check]').forEach(input => input.addEventListener('change', e => { state.checks[e.target.dataset.check] = e.target.checked; saveState(); }));
['talk1','talk2','talk3'].forEach((id, idx) => $(id).addEventListener('input', e => { state.talking[idx] = e.target.value; persistOnly(); }));
$('clearTalkingBtn').onclick = () => { state.talking = ['', '', '']; saveState(); };
$('addSignalBtn').onclick = () => { if(state.signals.length < 5){ state.signals.push({category:'Local', text:'', impact:'Neutral', confidence:'Medium'}); saveState(); } };
qsa('[data-snapshot]').forEach(sel => sel.addEventListener('change', e => { state.snapshot[e.target.dataset.snapshot] = e.target.value; saveState(); }));
$('completeWeekBtn').onclick = () => {
  state.checks = { monday:true, wednesday:true, friday:true, predictions:true };
  state.streak += 1;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  saveState();
};
$('fab').onclick = () => $('quickPanel').classList.remove('hidden');
$('closePanel').onclick = () => $('quickPanel').classList.add('hidden');
qsa('[data-quick]').forEach(btn => btn.onclick = () => { $('quickNote').value = btn.textContent.trim() + ': '; $('quickNote').focus(); });
$('saveQuickNote').onclick = () => {
  const note = $('quickNote').value.trim();
  if(!note) return;
  state.quickNotes.unshift({ date:new Date().toISOString(), note });
  $('quickNote').value=''; $('quickPanel').classList.add('hidden'); saveState();
};
$('backupBtn').onclick = () => $('backupPanel').classList.remove('hidden');
$('closeBackup').onclick = () => $('backupPanel').classList.add('hidden');
$('exportBtn').onclick = () => download('cei-home-dashboard-backup.json', JSON.stringify(state, null, 2));
$('importFile').addEventListener('change', e => {
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = () => { try { state = JSON.parse(reader.result); saveState(); alert('Import complete'); } catch { alert('Import failed'); } };
  reader.readAsText(file);
});
$('resetBtn').onclick = () => { if(confirm('Reset Home Dashboard data?')){ state = structuredClone(defaultState); saveState(); } };

if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
render();
