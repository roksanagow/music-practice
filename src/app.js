import {seedData,loadState,put,del,clear,get,newid,TABLES,replaceAll} from './storage.js';
import {makeExercise,randomSeed,allocateSession,displayPitch,MAJOR_TONICS,MINOR_TONICS,RHYTHMS,ARTICULATIONS,DYNAMICS} from './theory.js';
import {createBackup,readBackup} from './backup.js';
import {instrumentIcon} from './instrument-icons.js';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FOCUS={
  'Tone / timbre':'Does the sound remain clear, consistent and appropriate to the phrase?',
  'Dynamics':'Are the loud–quiet contrasts convincing? Are dynamic changes controlled?',
  'Rhythm / tempo':'Is the pulse steady? Where do I rush or drag?',
  'Articulation':'Are attacks clean and note lengths intentional?',
  'Technique':'Which fingering or transition is unreliable?',
  'Phrasing':'Does each phrase have direction and a natural point of arrival?',
  'Expression':'Does the character of the music come across?',
  'Confidence':'Could I play this reliably in a rehearsal or performance?',
  'Chord transitions':'Can I change chords cleanly without losing the beat?',
  'Voicing / pedalling':'Is the melody clear above the accompaniment? Is the pedal clean?',
  'Strumming / plucking':'Is my attack even and appropriate to the style?'
};
const TABS={today:['Today','◷'],library:['Library','▤'],technique:['Technique','♮'],journal:['Journal','✎'],settings:['Settings','⚙']};
const KINDS={flute:'Flute',piano:'Piano',ukulele:'Ukulele',ocarina:'Ocarina',kalimba:'Kalimba'};
const todayISO=()=>new Date().toISOString();
const date=s=>{if(!s)return'Unknown date';return new Date(s).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})};
const field=(name,label,value='',type='text',extra='')=>`<div class="field-group"><label class="field" for="${esc(name)}">${esc(label)}</label><input class="field-input" id="${esc(name)}" name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}></div>`;
const select=(name,label,options,value,extra='')=>`<div class="field-group"><label class="field" for="${esc(name)}">${esc(label)}</label><select class="field-input" id="${esc(name)}" name="${esc(name)}" ${extra}>${options.map(o=>{const [v,t]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`}).join('')}</select></div>`;
const btn=(label,action,cls='button',attrs='')=>`<button class="${cls}" type="button" data-action="${action}" ${attrs}>${label}</button>`;
let state;
let ui={tab:'today',profileId:'flute',folderId:'all',pieceId:null,search:'',status:'all',duration:30,mode:'Balanced',plan:null,exercise:null,exerciseError:'',tech:{family:'scale',tonic:'G',scaleType:'harmonic-minor',octaves:'1',startOctave:'auto',direction:'up-and-down',bpm:'72',rhythm:'eighths',articulation:'slur-4',dynamics:'mf'},recordStatus:'none',temporaryBlob:null,temporaryUrl:null};
let recorder=null,mediaStream=null,recordedChunks=[],currentPdfUrl=null,currentPdfAsset=null,activeAudioUrls=[];
let timerInterval=null,timerElapsed=0,timerRunning=false,metronomeInterval=null,audioContext=null;
const profile=()=>state.profiles.find(p=>p.id===ui.profileId)||state.profiles[0];
const getPiece=id=>state.pieces.find(p=>p.id===id);
const lastEntry=id=>state.journals.filter(x=>x.pieceId===id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
const latestPieces=()=>state.pieces.filter(p=>(p.instrumentIds||[]).includes(ui.profileId)).sort((a,b)=>b.priority-a.priority||a.title.localeCompare(b.title));
function toast(msg,error=false){const t=$('#toast');t.textContent=msg;t.style.cssText=`position:fixed;z-index:200;right:18px;bottom:82px;max-width:350px;padding:12px 16px;border-radius:11px;box-shadow:0 10px 28px #243a2f40;background:${error?'#a04d46':'#365b4d'};color:white;font-size:.9rem`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>{t.textContent='';t.removeAttribute('style')},3900);}
async function refresh(){state=await loadState();render();}
async function guarded(fn){try{await fn()}catch(err){console.error(err);toast(err.message||'Unable to save; please check storage.',true);}}
function statusTag(v){return `<span class="chip ${v==='Want to learn'?'gold':''}">${esc(v||'Learning')}</span>`;}
function render(){
  activeAudioUrls.forEach(URL.revokeObjectURL);activeAudioUrls=[];
  const p=profile();
  $('#app').innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand"><div class="brand-icon">𝄞</div><div><strong>Cadence</strong><span class="brand-sub">Music practice</span></div></div><nav class="nav" aria-label="Main navigation">${Object.entries(TABS).map(([id,[label,symbol]])=>`<button type="button" class="nav-button ${ui.tab===id?'active':''}" data-action="tab" data-id="${id}" ${ui.tab===id?'aria-current="page"':''}><span class="nav-symbol">${symbol}</span><span class="nav-label">${label}</span></button>`).join('')}</nav><div class="sidebar-foot">Your music, reflections and recordings stay on this device unless you export a backup.</div></aside><main class="main"><div class="topbar"><div class="context">A little practice, often.</div><div class="instrument-picker" role="group" aria-label="Choose instrument">${state.profiles.filter(x=>!x.archived).map(x=>`<button type="button" class="instrument-choice" data-action="profile-change" data-id="${esc(x.id)}" aria-pressed="${x.id===p.id}">${instrumentIcon(x.kind)}<span>${esc(x.name)}</span></button>`).join('')}</div></div><div class="content">${ui.tab==='today'?renderToday(p):ui.tab==='library'?(ui.pieceId?renderPiece(getPiece(ui.pieceId)):renderLibrary()):ui.tab==='technique'?renderTechnique(p):ui.tab==='journal'?renderJournal():renderSettings(p)}<p class="footer-note">Cadence v0.1 · Local-first · No accounts, tracking or automatic audio assessment</p></div></main></div>`;
}
function renderToday(p){
  const pieces=latestPieces(),recent=state.journals.filter(j=>pieces.some(x=>x.id===j.pieceId)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return `<div class="section-head"><div><div class="eyebrow">Your practice desk</div><h1>Make time for music.</h1><p class="lead">A focused session, even on the busiest days. Play, listen, reflect, and pick up where you left off.</p></div></div>
  <div class="top-cards"><div class="card-dark"><div class="eyebrow" style="color:#c5d9c9">Plan a session</div><h2>What can you manage today?</h2><p style="max-width:48ch">Blend a gentle warm-up, technique, your current repertoire, and time to listen back.</p><form id="plan-form" class="stack" style="margin-top:23px"><div class="form-grid">${select('duration','Duration',[[5,'5 min'],[10,'10 min'],[20,'20 min'],[30,'30 min'],[45,'45 min'] ],ui.duration)}${select('mode','Practice mode',['Balanced','Orchestra soon','Technical','Enjoyment','Deadline week'],ui.mode)}</div><button class="button" style="width:100%;border:0" type="submit">Generate my practice →</button></form></div><div class="card"><div class="eyebrow">At a glance</div><div class="grid" style="gap:19px"><div><div class="stat">${pieces.length}</div><small>pieces for ${esc(p.name.toLowerCase())}</small></div><div><div class="stat">${recent.length}</div><small>journal entries</small></div></div><div class="divider"></div><h3 style="font-size:1rem">Continue where you left off</h3>${recent[0]?`<p class="hint">${esc(getPiece(recent[0].pieceId)?.title||'Practice')}</p><p style="font-size:.9rem">${esc(recent[0].nextTime||recent[0].reflection||'Listen again to your last passage.')}</p>${btn('Open piece →','open-piece','button small',`data-id="${esc(recent[0].pieceId)}"`)}`:`<p class="hint">Your next steps will appear here as you start recording reflections.</p>`}</div></div>
  ${ui.plan?renderPlan():''}<div class="section-head" style="margin-top:32px"><div><h2>Your repertoire</h2><p class="muted">Favourite pieces and current projects</p></div>${btn('View library →','tab','button small',`data-id="library"`)}</div>${pieces.length?`<div class="piece-list">${pieces.slice(0,4).map(pieceCard).join('')}</div>`:`<div class="empty"><strong>Your library starts here.</strong>Add your first piece in Library, then it will appear in your practice plans.</div>`}`;
}
function formatTimer(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function renderPlan(){
  const plan=ui.plan,done=plan.blocks.filter(b=>b.status==='done').length;
  const labels={warmup:'Warm up',technique:'Technical practice',repertoire:'Repertoire',reflection:'Listen and reflect'};
  return `<section class="card" style="margin-top:22px"><div class="row space-between" style="margin-bottom:11px"><div><div class="eyebrow">Today’s session</div><h2>${plan.minutes} minutes · ${esc(plan.mode)}</h2></div><span class="chip">${done} / ${plan.blocks.length} done</span></div><div class="row-wrap" style="margin-bottom:14px"><span class="timercount" id="timer-text">${formatTimer(timerElapsed)}</span>${btn(timerRunning?'Pause timer':'Start timer','timer-toggle','button small')}${btn('Reset','timer-reset','button small ghost')}</div><div class="progress-rail"><div class="progress-fill" style="width:${done/plan.blocks.length*100}%"></div></div><div style="margin-top:15px">${plan.blocks.map((b,i)=>`<div class="block-line" style="opacity:${b.status==='skipped'?.55:1}"><div class="time-number">${b.minutes}<small>min</small></div><div class="block-main"><div class="row-wrap"><strong>${labels[b.type]}</strong>${b.status!=='pending'?`<span class="chip">${b.status}</span>`:''}</div><p>${esc(b.detail)}</p>${b.pieceId?btn('Open score / journal →','open-piece','link',`data-id="${esc(b.pieceId)}"`):b.type==='technique'?btn('Go to generator →','tab','link',`data-id="technique"`):''}</div><div class="stack-sm">${b.status==='pending'?`${btn('Done','plan-status','button small primary',`data-id="${i}" data-status="done"`)}${btn('Skip','plan-status','button small ghost',`data-id="${i}" data-status="skipped"`)}`:btn('Undo','plan-status','button small',`data-id="${i}" data-status="pending"`)}</div></div>`).join('')}</div><div class="row-wrap" style="margin-top:18px">${btn('Clear plan','clear-plan','button small danger')}</div></section>`;
}
function findFolder(id){return state.folders.find(f=>f.id===id)}
function foldersByDepth(){const output=[],visited=new Set();const visit=(id,depth)=>{if(visited.has(id))return;visited.add(id);const item=findFolder(id);if(!item)return;output.push({...item,depth});state.folders.filter(x=>x.parentId===id).sort((a,b)=>a.name.localeCompare(b.name)).forEach(f=>visit(f.id,depth+1));};state.folders.filter(x=>!x.parentId||!findFolder(x.parentId)).sort((a,b)=>a.name.localeCompare(b.name)).forEach(f=>visit(f.id,0));return output;}
function pieceCard(p){const last=lastEntry(p.id);return `<button type="button" class="piece-card" data-action="open-piece" data-id="${esc(p.id)}"><div class="row space-between"><div class="icon-letter">${instrumentIcon(profile()?.kind)}</div>${statusTag(p.status)}</div><h3>${esc(p.title)}</h3><div class="composer">${esc(p.composer||'Composer not set')}</div><div class="row-wrap">${(p.folderIds||[]).map(id=>findFolder(id)).filter(Boolean).slice(0,3).map(f=>`<span class="chip">${esc(f.name)}</span>`).join('')}</div><div class="micro" style="margin-top:14px">${esc(last?.nextTime||p.goal||'Add a focus for next practice')}</div></button>`;}
function renderLibrary(){
  const pcs=latestPieces().filter(p=>ui.folderId==='all'||(p.folderIds||[]).includes(ui.folderId)).filter(p=>ui.status==='all'||p.status===ui.status).filter(p=>`${p.title} ${p.composer||''} ${(p.tags||[]).join(' ')}`.toLowerCase().includes(ui.search.toLowerCase()));
  const tree=foldersByDepth();return `<div class="section-head"><div><div class="eyebrow">Your music collection</div><h1>The library.</h1><p class="lead">One piece, one journal — in as many folders as you like.</p></div><div class="section-actions">${btn('+ New folder','folder-add','button')}${btn('+ Add piece','piece-add','button primary')}</div></div><div class="split"><div class="card folders-panel"><div class="eyebrow" style="margin:8px 11px 10px">Folders</div><button type="button" class="folder-button ${ui.folderId==='all'?'active':''}" data-action="folder-filter" data-id="all"><span>▤</span> All pieces <span class="folder-count">${latestPieces().length}</span></button>${tree.map(f=>`<div class="row" style="gap:0;padding-left:${Math.min(f.depth,5)*13}px"><button type="button" class="folder-button ${ui.folderId===f.id?'active':''}" data-action="folder-filter" data-id="${esc(f.id)}"><span>◫</span><span style="overflow:hidden;text-overflow:ellipsis">${esc(f.name)}</span><span class="folder-count">${latestPieces().filter(x=>(x.folderIds||[]).includes(f.id)).length}</span></button>${ui.folderId===f.id?btn('⋯','folder-edit','button small ghost',`data-id="${esc(f.id)}" aria-label="Edit folder"`):''}</div>`).join('')}<p class="hint" style="padding:13px 10px">Deleting a folder never deletes its pieces or journals.</p></div><div class="stack"><div class="card"><div class="form-grid">${field('library-search','Search music',ui.search,'search','placeholder="Title, composer or tag"')}${select('library-status','Status',['all','Favourite','Learning','Maintaining','Want to learn','Performance-ready'],ui.status)}</div></div>${pcs.length?`<div class="piece-list">${pcs.map(pieceCard).join('')}</div>`:`<div class="empty"><strong>No pieces found.</strong>Change filters or add a piece to this instrument.</div>`}</div></div>`;
}
function renderPiece(p){
  if(!p){ui.pieceId=null;return renderLibrary()}
  const entries=state.journals.filter(j=>j.pieceId===p.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const recs=state.recordings.filter(r=>r.pieceId===p.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const draft=state.drafts.find(d=>d.id===p.id)||{};
  const focus=draft.focus||'Dynamics';
  const prompts=Object.keys(FOCUS);
  return `<div class="row-wrap" style="margin-bottom:25px">${btn('← Library','piece-back','button small ghost')}<span class="muted">/ ${esc(p.title)}</span></div><div class="section-head"><div><div class="eyebrow">${esc((p.instrumentIds||[]).map(id=>state.profiles.find(x=>x.id===id)?.name).filter(Boolean).join(' · '))}</div><h1>${esc(p.title)}</h1><p class="lead">${esc(p.composer||'Composer not specified')}</p><div class="row-wrap">${statusTag(p.status)}${(p.folderIds||[]).map(id=>findFolder(id)).filter(Boolean).map(f=>`<span class="chip">${esc(f.name)}</span>`).join('')}</div></div><div class="section-actions">${btn('Edit piece','piece-edit','button',`data-id="${esc(p.id)}"`)}${btn('Add score / link','source-add','button primary',`data-id="${esc(p.id)}"`)}</div></div>
  ${p.goal?`<div class="notice info" style="margin-bottom:20px"><strong>Current goal:</strong> ${esc(p.goal)}</div>`:''}
  <div class="two-panel"><div class="stack"><section class="card"><div class="row space-between"><h2 style="margin:0">Practice journal</h2><span class="chip">${entries.length} entries</span></div><p class="hint">Choose one focus to listen for. Notes are saved as a draft while you type.</p><form id="journal-form" data-piece-id="${esc(p.id)}" class="stack" style="margin-top:19px"><div class="form-grid">${select('focus','Today’s focus',prompts,focus)}${select('secondary','Optional second focus',[['','None'],...prompts.map(x=>[x,x])],draft.secondary||'')}${field('passage','Passage / bars',draft.passage||'','text','placeholder="e.g. bars 12–16"')}${field('minutes','Minutes spent',draft.minutes||'','number','min="0" max="300" placeholder="Optional"')}</div><div id="focus-prompt" class="focus-prompt">${esc(FOCUS[focus])}</div><div>${field('rating','Confidence 1–5 (optional)',draft.rating||'','number','min="1" max="5" placeholder="No automatic score"')}</div><div class="field-group"><label class="field" for="reflection">What did you notice?</label><textarea class="field-input" name="reflection" id="reflection" rows="3" placeholder="Listen, compare, and describe what you heard">${esc(draft.reflection||'')}</textarea></div><div class="field-group"><label class="field" for="improved">What improved?</label><textarea class="field-input" name="improved" id="improved" rows="2">${esc(draft.improved||'')}</textarea></div><div class="field-group"><label class="field" for="needsWork">What still needs work?</label><textarea class="field-input" name="needsWork" id="needsWork" rows="2">${esc(draft.needsWork||'')}</textarea></div><div class="field-group"><label class="field" for="nextTime">Exactly what next time?</label><textarea class="field-input" name="nextTime" id="nextTime" rows="2" placeholder="e.g. bars 42–48 at 72 bpm">${esc(draft.nextTime||'')}</textarea></div><div class="row space-between"><span class="hint" id="draft-state">Draft saved locally</span><button class="button primary" type="submit">Save journal entry</button></div></form></section><section class="card"><h2>Practice history</h2>${entries.length?`<div class="timeline">${entries.map(j=>`<div class="entry"><div class="date">${date(j.createdAt)} · ${esc(j.focus)}${j.minutes?' · '+j.minutes+' min':''}${j.rating?' · self-rated '+j.rating+'/5':''}</div>${j.passage?`<p><strong>Passage:</strong> ${esc(j.passage)}</p>`:''}${j.reflection?`<p>${esc(j.reflection)}</p>`:''}${j.improved?`<p><strong>Improved:</strong> ${esc(j.improved)}</p>`:''}${j.needsWork?`<p><strong>Work on:</strong> ${esc(j.needsWork)}</p>`:''}${j.nextTime?`<p><strong>Next time:</strong> ${esc(j.nextTime)}</p>`:''}</div>`).join('')}</div>`:'<p class="hint">Your first journal entry will appear here.</p>'}</section></div>
  <div class="stack"><section class="card"><h2>Scores and references</h2><p class="hint">Imported PDFs are private and work offline. Google Drive and other web links open externally.</p>${(p.sources||[]).length?p.sources.map((s,i)=>`<div class="source-item"><div class="row" style="min-width:0"><span class="icon-outline">${s.kind==='pdf'?'▣':'↗'}</span><div style="min-width:0"><strong>${esc(s.label||'Untitled source')}</strong><div class="hint">${s.kind==='pdf'?'Saved on this device':'External · internet and access may be required'}</div></div></div><div class="row-wrap">${btn(s.kind==='pdf'?'View':'Open','source-open','button small',`data-id="${esc(p.id)}" data-index="${i}"`)}${btn('×','source-remove','button small ghost',`data-id="${esc(p.id)}" data-index="${i}" aria-label="Remove source"`)}</div></div>`).join(''):'<p class="hint">No score linked yet. Add a PDF from Files or paste a Google Drive / YouTube URL.</p>'}${btn('+ Add score or link','source-add','button small',`data-id="${esc(p.id)}"`)}</section>
  <section class="card"><h2>Record and listen</h2><p class="hint">No automatic grading. Record a short passage, listen back, then save only the clips that matter.</p><div class="record-bar">${ui.recordStatus==='recording'?`<span class="recording-live"></span><strong>Recording…</strong>${btn('Stop recording','record-stop','button small danger')}`:btn('● Record passage','record-start','button small primary')}${ui.temporaryBlob&&ui.recordStatus==='preview'?`<audio controls src="${esc(ui.temporaryUrl)}"></audio><div class="row-wrap">${btn('Save milestone','record-save','button small primary')}${btn('Discard','record-discard','button small')}</div>`:''}</div>${recs.length?`<div style="margin-top:15px" class="stack-sm">${recs.map(r=>`<div class="source-item"><div><strong>${esc(r.label||'Practice take')}</strong><div class="hint">${date(r.createdAt)}${r.passage?' · '+esc(r.passage):''}</div><div id="player-${esc(r.id)}"></div></div><div class="row-wrap">${btn('Play','play-recording','button small',`data-id="${esc(r.id)}"`)}${btn('×','delete-recording','button small ghost',`data-id="${esc(r.id)}" aria-label="Delete recording"`)}</div></div>`).join('')}</div>`:''}</section>
  ${entries[0]?.nextTime?`<div class="card-soft"><div class="eyebrow">Remember for next time</div><p>${esc(entries[0].nextTime)}</p></div>`:''}</div></div>`;
}
function staffSVG(notes){
  if(!notes?.length)return '';
  const letters=['C','D','E','F','G','A','B'];
  const y=n=>80-((n.octave-4)*7+letters.indexOf(n.letter)-2)*5;
  const minY=Math.min(30,...notes.map(y))-18,maxY=Math.max(90,...notes.map(y))+17;
  const offset=-minY+13,width=Math.max(680,50+notes.length*32),height=maxY-minY+27;
  const lines=[40,50,60,70,80].map(v=>`<line x1="8" x2="${width-8}" y1="${v+offset}" y2="${v+offset}" stroke="#9ba99c" stroke-width="1"/>`).join('');
  const notesSVG=notes.map((n,i)=>{
    const px=30+i*32,py=y(n)+offset,low=py>(60+offset);
    let ledger='';for(let ly=30;ly>=Math.round(y(n));ly-=10)ledger+=`<line x1="${px-12}" x2="${px+12}" y1="${ly+offset}" y2="${ly+offset}" stroke="#87968b"/>`;
    for(let ly=90;ly<=Math.round(y(n));ly+=10)ledger+=`<line x1="${px-12}" x2="${px+12}" y1="${ly+offset}" y2="${ly+offset}" stroke="#87968b"/>`;
    const accident=n.accidental===1?'♯':n.accidental===-1?'♭':n.accidental===2?'𝄪':n.accidental===-2?'𝄫':'';
    return `<g>${ledger}${accident?`<text x="${px-18}" y="${py+5}" font-size="16" fill="#4e6957">${accident}</text>`:''}<ellipse cx="${px}" cy="${py}" rx="7.4" ry="4.9" fill="#385d50" transform="rotate(-19 ${px} ${py})"/><line x1="${px+(low?7:-7)}" x2="${px+(low?7:-7)}" y1="${py}" y2="${py+(low?-29:29)}" stroke="#385d50" stroke-width="1.8"/><title>${esc(displayPitch(n))}</title></g>`;
  }).join('');
  return `<div class="sheet-scroll" aria-label="Pitch guide (unmetered; follow rhythm instructions)" role="img"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width:${width}px;height:${height}px;max-width:none">${lines}${notesSVG}</svg></div><p class="hint">Pitch guide only. Rhythm and articulation are given in the written instructions; this is not a fully engraved rhythmic score.</p>`;
}
function renderTechnique(p){
  const flute=p.kind==='flute',piano=p.kind==='piano';
  const families=flute?['scale','arpeggio','chromatic','tone','octave-slurs']:piano?['scale','arpeggio','tone']:['guided'];
  const opts=ui.tech,ex=ui.exercise;
  const recent=state.exerciseLogs.filter(x=>x.profileId===p.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6);
  return `<div class="section-head"><div><div class="eyebrow">A little better every time</div><h1>Technique studio.</h1><p class="lead">Generate structured exercises with clear goals, musical rules and something specific to listen for.</p></div></div><div class="two-panel"><div class="card"><div class="row space-between"><h2>Exercise settings</h2><span class="chip">${esc(p.name)}</span></div><form id="tech-form" class="stack"><div class="form-grid">${select('family','Exercise family',families.map(x=>[x,x==='octave-slurs'?'Octave slurs':x[0].toUpperCase()+x.slice(1)]),opts.family==='guided'?'guided':families.includes(opts.family)?opts.family:families[0])}${select('tonic','Key',Array.from(new Set([...MAJOR_TONICS,...MINOR_TONICS])),opts.tonic)}${select('scaleType','Scale mode',[['major','Major'],['natural-minor','Natural minor'],['harmonic-minor','Harmonic minor'],['melodic-minor-classical','Classical melodic minor']],opts.scaleType)}${select('octaves','Octaves',[[1,'1 octave'],[2,'2 octaves'],[3,'3 octaves']],opts.octaves)}${select('startOctave','Starting octave',[['auto','Automatic'],[3,'3'],[4,'4'],[5,'5']],opts.startOctave)}${select('direction','Direction',[['up','Ascending'],['down','Descending'],['up-and-down','Up and down']],opts.direction)}${field('bpm','Quarter-note BPM',opts.bpm,'number','min="30" max="240"')}${select('rhythm','Rhythm',Object.keys(RHYTHMS).map(x=>[x,RHYTHMS[x]]),opts.rhythm)}${select('articulation','Articulation',Object.keys(ARTICULATIONS).map(x=>[x,ARTICULATIONS[x]]),opts.articulation)}${select('dynamics','Dynamics',Object.keys(DYNAMICS).map(x=>[x,DYNAMICS[x]]),opts.dynamics)}</div><button class="button primary" type="submit">Generate exercise →</button></form>${!flute&&!piano?'<p class="notice info" style="margin-top:18px">This instrument currently uses guided practice rather than automatically generated scales. Configure its actual tuning and playable notes before more advanced drills are added.</p>':''}</div><div class="stack"><div class="card-soft"><div class="eyebrow">Your next challenge</div>${ui.exerciseError?`<div class="notice error">${esc(ui.exerciseError)}</div>`:ex?`<h2>${esc(ex.title)}</h2><p class="hint">${esc(ex.instruction)}</p>${ex.notes?.length?`${staffSVG(ex.notes)}<div class="note-sequence" style="margin-top:12px">${ex.notes.map(n=>`<span class="note">${esc(displayPitch(n))}</span>`).join('')}</div>`:''}<div class="focus-prompt" style="margin-top:14px">${esc(ex.prompt)}</div><div class="divider"></div><div class="row-wrap">${ex.bpm?btn('▶ Metronome','metronome-toggle','button small',`data-bpm="${ex.bpm}"`):''}${btn('New variation','tech-regenerate','button small') }</div><form id="exercise-log-form" class="stack-sm" style="margin-top:17px"><div class="form-grid">${field('achievedBpm','Tempo achieved',ex.bpm||'','number','min="30" max="240"')}${field('exerciseNote','Reflection / next step','','text','placeholder="What did you notice?"')}</div><div class="row-wrap">${['Completed','Too easy','Too hard','Skipped'].map(x=>`<button class="button small ${x==='Completed'?'primary':''}" type="submit" name="outcome" value="${x}">${x}</button>`).join('')}</div></form>`:`<h2>Ready when you are.</h2><p>Choose a focus and generate an exercise. Notes will be checked against your instrument’s configured range.</p><p class="hint">Suggestion for returning flautists: start with one-octave scales at 60–80 bpm, then build range and speed gradually.</p>`}</div><div class="card"><h3>Recent technical practice</h3>${recent.length?recent.map(l=>`<div class="source-item"><div><strong>${esc(l.exercise?.title||'Technique')}</strong><p class="hint" style="margin:3px 0">${date(l.createdAt)} · ${esc(l.outcome)}${l.achievedBpm?' · '+l.achievedBpm+' bpm':''}</p>${l.note?`<p class="hint" style="margin:4px 0">${esc(l.note)}</p>`:''}</div></div>`).join(''):'<p class="hint">Generated exercise attempts will be recorded here.</p>'}</div></div></div>`;
}
function renderJournal(){
  const pieces=latestPieces(),entries=state.journals.filter(x=>pieces.some(p=>p.id===x.pieceId)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const exercises=state.exerciseLogs.filter(x=>x.profileId===ui.profileId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return `<div class="section-head"><div><div class="eyebrow">Practice over perfection</div><h1>Your journal.</h1><p class="lead">Follow your musical development through what you noticed, not through streaks.</p></div></div><div class="grid" style="margin-bottom:20px"><div class="card"><div class="stat">${entries.length}</div><div class="muted">Piece reflections</div></div><div class="card"><div class="stat">${exercises.length}</div><div class="muted">Technical attempts</div></div></div><section class="card"><h2>Recent reflections</h2>${entries.length?`<div class="timeline">${entries.map(j=>`<div class="entry"><div class="date">${date(j.createdAt)} · ${esc(j.focus)}${j.rating?' · self-rated '+j.rating+'/5':''}</div><h3>${esc(getPiece(j.pieceId)?.title||'Unknown piece')}</h3>${j.passage?`<span class="chip">${esc(j.passage)}</span>`:''}${j.reflection?`<p>${esc(j.reflection)}</p>`:''}${j.nextTime?`<p><strong>Next:</strong> ${esc(j.nextTime)}</p>`:''}${btn('Open piece →','open-piece','link',`data-id="${esc(j.pieceId)}"`)}</div>`).join('')}</div>`:'<div class="empty"><strong>Start with one observation.</strong>Open a piece from your library, choose a focus and save a reflection.</div>'}</section>`;
}
function renderSettings(p){
  const blobs=state.assets.reduce((s,a)=>s+(a.size||0),0),totalMB=(blobs/1024/1024).toFixed(1);
  return `<div class="section-head"><div><div class="eyebrow">Your workspace</div><h1>Settings & privacy.</h1><p class="lead">Everything you enter is stored locally on this device. Export backups before clearing browser data or moving to another device.</p></div></div><div class="two-panel"><div class="stack"><section class="card"><h2>Instrument profiles</h2><p class="hint">Select an instrument in the top bar to edit its settings.</p><div class="stack-sm">${state.profiles.map(q=>`<button class="folder-button ${q.id===p.id?'active':''}" type="button" data-action="profile-change" data-id="${esc(q.id)}">${instrumentIcon(q.kind)} ${esc(q.name)} <span class="folder-count">${esc(KINDS[q.kind]||q.kind)}</span></button>`).join('')}</div><div class="divider"></div><h3>Playable range: ${esc(p.name)}</h3><form id="profile-form" class="form-grid">${field('profileName','Display name',p.name)}${field('minMidi','Lowest MIDI pitch',p.minMidi,'number','min="0" max="127"')}${field('maxMidi','Highest MIDI pitch',p.maxMidi,'number','min="0" max="127"')}${field('comfortableMin','Comfortable low pitch',p.comfortableMin,'number','min="0" max="127"')}${field('comfortableMax','Comfortable high pitch',p.comfortableMax,'number','min="0" max="127"')}<div class="span-2"><p class="hint">These numbers are MIDI note values, not a fingering chart. Flute C4 = 60, G6 = 91. Keep comfortable bounds within hard bounds. Ocarina and kalimba exercises remain guided until an actual note inventory is configured.</p><button type="submit" class="button primary">Save profile settings</button></div></form></section></div><div class="stack"><section class="card"><h2>Your data & backups</h2><div class="row space-between"><span class="muted">Pieces</span><strong>${state.pieces.length}</strong></div><div class="divider"></div><div class="row space-between"><span class="muted">Local attachments and clips</span><strong>${state.assets.length} · ${totalMB} MB</strong></div><p class="hint" style="margin-top:16px">A full ZIP includes PDFs and saved audio; a metadata-only ZIP keeps journal/history but does not include binaries. Neither is uploaded anywhere.</p><div class="stack-sm">${btn('Download full backup (ZIP)','backup-full','button primary')}${btn('Download metadata only (ZIP)','backup-meta','button')}<div class="field-group"><label class="field" for="import-zip">Restore from a backup ZIP</label><input class="field-input" id="import-zip" type="file" accept=".zip,application/zip"/><p class="hint">Restoring replaces all current data after a confirmation. Export a backup first.</p></div></div></section><section class="card"><h2>Installation & offline use</h2><p>In Safari on your iPad, open your GitHub Pages address, tap Share and choose <strong>Add to Home Screen</strong>.</p><p class="hint">After an initial online visit, the app shell can work offline. Local PDFs, journals and saved audio are stored in IndexedDB. External Drive, web and YouTube links still require access to their original sites. Safari and an installed Home Screen app may not share the same data store, so export/import a backup if needed.</p><div class="notice info">Microphone access is requested only when you tap Record. Audio is never analysed or sent to a server.</div></section></div></div>`;
}
function showModal(html){const d=$('#modal');d.innerHTML=html;d.showModal();}
function closeModal(){const d=$('#modal');if(d.open)d.close();if(currentPdfUrl){URL.revokeObjectURL(currentPdfUrl);currentPdfUrl=null;currentPdfAsset=null;}}
function editPieceModal(piece=null){
  const q=piece||{id:'',title:'',composer:'',instrumentIds:[ui.profileId],folderIds:ui.folderId!=='all'?[ui.folderId]:[],status:'Learning',priority:1,goal:'',tags:[]};
  showModal(`<h2>${piece?'Edit piece':'Add a piece'}</h2><form id="piece-form" data-id="${esc(q.id)}" class="stack"><div class="form-grid">${field('pieceTitle','Title',q.title,'text','required')}${field('composer','Composer / artist',q.composer)}${select('pieceStatus','Status',['Learning','Favourite','Maintaining','Want to learn','Performance-ready'],q.status)}${select('priority','Priority',[[1,'Normal'],[2,'High'],[3,'Very high']],q.priority)}<div class="span-2">${field('pieceGoal','What are you working on?',q.goal||'')}</div><div class="span-2">${field('tags','Tags (comma separated)',(q.tags||[]).join(', '))}</div></div><label class="field">Instruments</label><div class="check-grid">${state.profiles.map(p=>`<label class="checkbox"><input type="checkbox" name="instrumentIds" value="${esc(p.id)}" ${(q.instrumentIds||[]).includes(p.id)?'checked':''}>${instrumentIcon(p.kind)}${esc(p.name)}</label>`).join('')}</div><label class="field">Folders (select any number)</label><div class="check-grid">${foldersByDepth().map(f=>`<label class="checkbox"><input type="checkbox" name="folderIds" value="${esc(f.id)}" ${(q.folderIds||[]).includes(f.id)?'checked':''}>${'· '.repeat(Math.min(f.depth,5))}${esc(f.name)}</label>`).join('')}</div><div class="modal-actions">${btn('Cancel','modal-close','button')}${piece?btn('Delete piece','piece-delete','button danger',`data-id="${esc(q.id)}"`):''}<button type="submit" class="button primary">${piece?'Save changes':'Add piece'}</button></div></form>`);
}
function isDescendant(folderId,parentId){let current=findFolder(parentId),seen=new Set();while(current&&!seen.has(current.id)){if(current.id===folderId)return true;seen.add(current.id);current=findFolder(current.parentId)}return false;}
function editFolderModal(folder=null){
  showModal(`<h2>${folder?'Edit folder':'New folder'}</h2><form id="folder-form" data-id="${esc(folder?.id||'')}" class="stack">${field('folderName','Folder name',folder?.name||'','text','required')}${select('parentId','Parent folder',[['','Top-level folder'],...foldersByDepth().filter(f=>!folder||f.id!==folder.id&&!isDescendant(folder.id,f.id)).map(f=>[f.id,`${'· '.repeat(f.depth)}${f.name}`])],folder?.parentId||'')}<div class="modal-actions">${btn('Cancel','modal-close','button')}${folder?btn('Delete folder','folder-delete','button danger',`data-id="${esc(folder.id)}"`):''}<button type="submit" class="button primary">Save folder</button></div></form>`);
}
function addSourceModal(pieceId){
  const p=getPiece(pieceId);
  showModal(`<h2>Add score or reference</h2><p class="hint">${esc(p?.title||'Piece')} · PDFs are stored privately on this device. Drive links are bookmarks, not downloaded or shared.</p><form id="source-form" data-id="${esc(pieceId)}" class="stack">${field('sourceLabel','Label (optional)','','text','placeholder="e.g. Orchestra flute part"')}<div class="field-group"><label for="pdfFile" class="field">Import a PDF from Files</label><input class="field-input" id="pdfFile" name="pdfFile" type="file" accept="application/pdf,.pdf"></div><div class="row"><span class="hint">— or add a web link —</span></div>${field('sourceUrl','Google Drive / score / YouTube URL','','url','placeholder="https://…"')}${select('sourceKind','Link type',[['drive','Google Drive'],['web','Online sheet music'],['youtube','YouTube'],['reference','Other reference']], 'drive')}<div class="modal-actions">${btn('Cancel','modal-close','button')}<button type="submit" class="button primary">Add to piece</button></div></form>`);
}
function cancelRecording(){if(recorder&&recorder.state!=='inactive'){recorder.onstop=null;recorder.stop()}mediaStream?.getTracks().forEach(t=>t.stop());recorder=null;mediaStream=null;recordedChunks=[];ui.recordStatus='none';ui.temporaryBlob=null;if(ui.temporaryUrl)URL.revokeObjectURL(ui.temporaryUrl);ui.temporaryUrl=null;}
function stopMetronome(){if(metronomeInterval){clearInterval(metronomeInterval);metronomeInterval=null;}}
function navigate(tab,pieceId=null){
  const journalForm=$('#journal-form');
  if(journalForm){clearTimeout(journalDraftTimer);guarded(()=>saveDraft(journalForm));}
  if(ui.recordStatus==='recording'||ui.temporaryBlob)cancelRecording();
  stopMetronome();
  ui.tab=tab;
  ui.pieceId=pieceId;
  render();
  window.scrollTo({top:0,behavior:'auto'});
}
function makePlan(){
  const mode=ui.mode,dur=Number(ui.duration),allocation=allocateSession(dur,mode),pieces=latestPieces();
  const orch=pieces.find(p=>(p.folderIds||[]).includes('orchestra'));
  const favourite=pieces.find(p=>(p.folderIds||[]).includes('favourites'));
  const chosen=mode==='Orchestra soon'?(orch||pieces[0]):mode==='Enjoyment'?(favourite||pieces[0]):(orch||pieces[0]);
  const ex=makeExercise({family:'scale',tonic:'G',scaleType:'harmonic-minor',octaves:1,seed:'plan-'+new Date().toDateString()},profile());
  const blocks=allocation.blocks.map(b=>({...b,status:'pending',pieceId:b.type==='repertoire'?chosen?.id:null,detail:b.type==='warmup'?'Comfortable long tones, relaxed sound and slow register changes':b.type==='technique'?`${ex.title}. Practise deliberately, not at maximum speed.`:b.type==='repertoire'?chosen?`${chosen.title}${lastEntry(chosen.id)?.nextTime?' · '+lastEntry(chosen.id).nextTime:chosen.goal?' · '+chosen.goal:''}`:'Pick a piece from your library and focus on one passage': 'Listen back if helpful; note one improvement and one next step.'}));
  ui.plan={minutes:allocation.minutes,mode,profileId:ui.profileId,blocks};
  put('meta',{id:'currentPlan',value:ui.plan}).catch(err=>toast('Could not save session plan: '+err.message,true));
}
function getDraftFormValues(form){
  const fd=new FormData(form);const data={id:form.dataset.pieceId};
  for(const key of ['focus','secondary','passage','minutes','rating','reflection','improved','needsWork','nextTime'])data[key]=fd.get(key)?.toString()||'';
  return data;
}
async function saveDraft(form){
  const data=getDraftFormValues(form);
  await put('drafts',data);
  const i=state.drafts.findIndex(x=>x.id===data.id);if(i>=0)state.drafts[i]=data;else state.drafts.push(data);
  const status=$('#draft-state');if(status)status.textContent='Draft saved locally';
}
async function savePiece(form){
  const data=new FormData(form),id=form.dataset.id||newid(),prev=getPiece(id);
  const title=String(data.get('pieceTitle')||'').trim();if(!title)throw Error('Please enter a title');
  const instrumentIds=data.getAll('instrumentIds').map(String);
  if(!instrumentIds.length)throw Error('Choose at least one instrument');
  const item={...prev,id,title,composer:String(data.get('composer')||'').trim(),instrumentIds,folderIds:data.getAll('folderIds').map(String),status:String(data.get('pieceStatus')),priority:Number(data.get('priority'))||1,goal:String(data.get('pieceGoal')||'').trim(),tags:String(data.get('tags')||'').split(',').map(s=>s.trim()).filter(Boolean),sources:prev?.sources||[],createdAt:prev?.createdAt||todayISO()};
  await put('pieces',item);closeModal();ui.tab='library';ui.pieceId=id;await refresh();toast(prev?'Piece updated.':'Piece added.');
}
async function saveFolder(form){
  const data=new FormData(form),id=form.dataset.id||newid(),parentId=String(data.get('parentId')||'')||null,name=String(data.get('folderName')||'').trim();
  if(!name)throw Error('Folder needs a name');
  if(parentId===id||isDescendant(id,parentId))throw Error('A folder cannot be placed inside its descendant');
  await put('folders',{...findFolder(id),id,name,parentId,createdAt:findFolder(id)?.createdAt||todayISO()});
  closeModal();await refresh();toast('Folder saved.');
}
async function saveSource(form){
  const id=form.dataset.id,prev=getPiece(id);if(!prev)throw Error('Piece no longer exists');
  const fd=new FormData(form),file=fd.get('pdfFile'),url=String(fd.get('sourceUrl')||'').trim(),label=String(fd.get('sourceLabel')||'').trim(),sources=[...(prev.sources||[])];
  if(!(file instanceof File && file.size>0)&&!url)throw Error('Choose a PDF or enter a URL');
  if(file instanceof File&&file.size){
    if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf'))throw Error('Please choose a PDF file');
    const assetId=newid();await put('assets',{id:assetId,name:file.name,type:'application/pdf',size:file.size,blob:file,createdAt:todayISO()});
    sources.push({id:newid(),kind:'pdf',assetId,label:label||file.name});
  }
  if(url){let parsed;try{parsed=new URL(url)}catch{throw Error('Please enter a complete URL beginning https://')};if(!['https:','http:'].includes(parsed.protocol))throw Error('Only http(s) links are supported');sources.push({id:newid(),kind:String(fd.get('sourceKind')||'web'),url:parsed.href,label:label||parsed.hostname});}
  await put('pieces',{...prev,sources});closeModal();await refresh();toast('Source added to this piece.');
}
async function addJournal(form){
  clearTimeout(journalDraftTimer);
  const data=getDraftFormValues(form);
  const item={...data,id:newid(),pieceId:form.dataset.pieceId,createdAt:todayISO(),minutes:data.minutes?Number(data.minutes):null,rating:data.rating?Number(data.rating):null};
  await put('journals',item);await del('drafts',form.dataset.pieceId);await refresh();toast('Reflection saved to this piece’s journal.');
}
async function startRecording(){
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw Error('Microphone recording is not supported in this browser. Use Safari on HTTPS.');
  if(ui.recordStatus==='recording')return;
  mediaStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  const options=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  recorder=new MediaRecorder(mediaStream,options?{mimeType:options}:undefined);
  recordedChunks=[];
  recorder.ondataavailable=e=>{if(e.data?.size)recordedChunks.push(e.data)};
  recorder.onstop=()=>{
    const blob=new Blob(recordedChunks,{type:recorder.mimeType||recordedChunks[0]?.type||'audio/webm'});
    mediaStream?.getTracks().forEach(t=>t.stop());mediaStream=null;recorder=null;
    if(!blob.size){ui.recordStatus='none';toast('No audio captured.',true);render();return;}
    ui.temporaryBlob=blob;ui.temporaryUrl=URL.createObjectURL(blob);ui.recordStatus='preview';render();
  };
  recorder.onerror=()=>{mediaStream?.getTracks().forEach(t=>t.stop());ui.recordStatus='none';toast('Recording failed.',true);render();};
  recorder.start(250);ui.recordStatus='recording';render();
}
function stopRecording(){if(recorder?.state==='recording'){recorder.stop();}}
async function saveRecording(){
  if(!ui.temporaryBlob||!ui.pieceId)return;
  const label=window.prompt('Name this milestone recording:',`Practice take · ${date(todayISO())}`);
  if(label===null)return;
  const blob=ui.temporaryBlob,id=newid(),ext=blob.type.includes('mp4')?'m4a':blob.type.includes('ogg')?'ogg':'webm';
  await put('assets',{id,name:`recording-${id}.${ext}`,type:blob.type,size:blob.size,blob,createdAt:todayISO()});
  await put('recordings',{id:newid(),pieceId:ui.pieceId,assetId:id,label:label.trim()||'Practice take',createdAt:todayISO(),passage:$('#passage')?.value||''});
  cancelRecording();await refresh();toast('Recording saved privately.');
}
async function openSource(pieceId,index){
  const src=getPiece(pieceId)?.sources?.[index];if(!src)throw Error('Source not found');
  if(src.kind!=='pdf'){const url=new URL(src.url);if(!['http:','https:'].includes(url.protocol))throw Error('External URL is not a web link');window.open(url.href,'_blank','noopener,noreferrer');return;}
  const asset=state.assets.find(a=>a.id===src.assetId);
  if(!asset?.blob)throw Error('This PDF is missing. Restore a full backup or import it again.');
  currentPdfAsset=asset;
  currentPdfUrl=URL.createObjectURL(asset.blob);
  showModal(`<div class="row space-between"><h2 style="margin:0">${esc(src.label||asset.name)}</h2>${btn('Close','modal-close','button small')}</div><p class="hint">Private PDF, loaded from your device. If the embedded viewer does not display on your iPad, use the open/download button.</p><iframe title="Imported PDF" src="${esc(currentPdfUrl)}" style="width:100%;height:min(66vh,630px);border:1px solid #d9e1d8;border-radius:8px"></iframe><div style="margin-top:12px" class="row-wrap">${btn('Open PDF in viewer','pdf-new-tab','button primary')}${btn('Save a copy','pdf-download','button')}</div>`);
}
async function removeSource(pieceId,index){
  const p=getPiece(pieceId),source=p?.sources?.[index];if(!p||!source)return;
  if(!confirm(`Remove “${source.label}” from this piece?`))return;
  const sources=p.sources.filter((_,i)=>i!==index);
  await put('pieces',{...p,sources});
  if(source.assetId&&!state.pieces.some(x=>x.id!==p.id&&x.sources?.some(s=>s.assetId===source.assetId)))await del('assets',source.assetId);
  await refresh();
}
async function deleteFolder(id){
  const f=findFolder(id);if(!f)return;
  if(!confirm(`Delete folder “${f.name}”? Pieces and journals will be kept. Any subfolders will move to its parent.`))return;
  for(const sub of state.folders.filter(x=>x.parentId===id))await put('folders',{...sub,parentId:f.parentId});
  for(const piece of state.pieces.filter(x=>x.folderIds?.includes(id)))await put('pieces',{...piece,folderIds:piece.folderIds.filter(x=>x!==id)});
  await del('folders',id);ui.folderId='all';closeModal();await refresh();toast('Folder removed. Pieces are still in your library.');
}
async function deletePiece(id){
  const p=getPiece(id);if(!p)return;
  if(!confirm(`Delete “${p.title}”, all its journal entries and saved recordings? This cannot be undone.`))return;
  for(const entry of state.journals.filter(x=>x.pieceId===id))await del('journals',entry.id);
  for(const r of state.recordings.filter(x=>x.pieceId===id)){await del('recordings',r.id);await del('assets',r.assetId)}
  for(const src of p.sources||[])if(src.assetId&&!state.pieces.some(x=>x.id!==id&&x.sources?.some(s=>s.assetId===src.assetId)))await del('assets',src.assetId);
  await del('pieces',id);await del('drafts',id);closeModal();ui.pieceId=null;await refresh();toast('Piece deleted.');
}
function startMetronome(bpm){
  stopMetronome();
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)throw Error('Web Audio is unavailable in this browser');
  audioContext ||= new Ctx();
  const interval=60000/bpm;
  const click=()=>{
    if(audioContext.state==='suspended')audioContext.resume();
    const osc=audioContext.createOscillator(),gain=audioContext.createGain(),t=audioContext.currentTime;
    osc.frequency.value=880;gain.gain.setValueAtTime(.10,t);gain.gain.exponentialRampToValueAtTime(.001,t+.07);
    osc.connect(gain).connect(audioContext.destination);osc.start(t);osc.stop(t+.075);
  };
  click();metronomeInterval=setInterval(click,interval);toast(`Metronome started at ${bpm} bpm. Tap again to stop.`);
}
function saveDownload(blob,filename){
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function exportBackup(full){
  const blob=await createBackup(state,full);
  const day=new Date().toISOString().slice(0,10);
  saveDownload(blob,`cadence-${full?'full':'metadata'}-${day}.zip`);
  toast('Backup generated. Save it somewhere safe, such as Files or iCloud Drive.');
}
async function importBackup(file){
  if(!file)return;
  const contents=readBackup(new Uint8Array(await file.arrayBuffer()));
  const c=contents.manifest.counts;
  const ok=confirm(`Restore backup from ${date(contents.manifest.exportedAt)}?\n\n${c.pieces||0} pieces, ${c.journals||0} reflections, ${c.assets||0} attachments.\n\nThis will REPLACE all current data on this device. Export a current backup first if you want to keep it.`);
  if(!ok)return;
  await replaceAll(contents.records);
  ui.profileId=contents.records.profiles.find(x=>!x.archived)?.id||'flute';
  ui.tab='today';ui.pieceId=null;ui.plan=null;ui.exercise=null;
  await refresh();toast('Backup restored successfully.');
}
async function handleClick(e){
  const t=e.target.closest('[data-action]');if(!t)return;
  const action=t.dataset.action,id=t.dataset.id,index=Number(t.dataset.index||0);
  switch(action){
    case'tab':navigate(id);break;
    case'open-piece':if(getPiece(id)){navigate('library',id)}break;
    case'piece-back':navigate('library');break;
    case'piece-add':editPieceModal();break;
    case'piece-edit':editPieceModal(getPiece(id));break;
    case'piece-delete':await deletePiece(id);break;
    case'folder-add':editFolderModal();break;
    case'folder-edit':editFolderModal(findFolder(id));break;
    case'folder-filter':ui.folderId=id;ui.pieceId=null;render();break;
    case'folder-delete':await deleteFolder(id);break;
    case'modal-close':closeModal();break;
    case'source-add':addSourceModal(id);break;
    case'source-open':await openSource(id,index);break;
    case'source-remove':await removeSource(id,index);break;
    case'record-start':await startRecording();break;
    case'record-stop':stopRecording();break;
    case'record-discard':cancelRecording();render();break;
    case'record-save':await saveRecording();break;
    case'play-recording':{
      const r=state.recordings.find(x=>x.id===id),asset=state.assets.find(a=>a.id===r?.assetId);
      if(!asset?.blob)throw Error('Recording file is missing. Restore a full backup.');
      const root=document.getElementById(`player-${id}`);
      if(root){const u=URL.createObjectURL(asset.blob);activeAudioUrls.push(u);root.innerHTML=`<audio controls autoplay src="${esc(u)}"></audio>`;}
      break;
    }
    case'delete-recording':{
      if(!confirm('Delete this saved recording permanently?'))return;
      const r=state.recordings.find(x=>x.id===id);if(r){await del('recordings',id);await del('assets',r.assetId);await refresh()}break;
    }
    case'plan-status':if(ui.plan){ui.plan.blocks[index].status=t.dataset.status;await put('meta',{id:'currentPlan',value:ui.plan});render()}break;
    case'timer-toggle':{if(timerRunning){clearInterval(timerInterval);timerInterval=null;timerRunning=false;}else{timerRunning=true;timerInterval=setInterval(()=>{timerElapsed++;const el=$('#timer-text');if(el)el.textContent=formatTimer(timerElapsed);},1000)}render();break;}
    case'timer-reset':{clearInterval(timerInterval);timerInterval=null;timerElapsed=0;timerRunning=false;render();break;}
    case'clear-plan':ui.plan=null;timerElapsed=0;clearInterval(timerInterval);timerInterval=null;timerRunning=false;await del('meta','currentPlan');render();break;
    case'tech-regenerate':generateTech();render();break;
    case'metronome-toggle':if(metronomeInterval){stopMetronome();toast('Metronome stopped.')}else startMetronome(Number(t.dataset.bpm));break;
    case'profile-change':{
      if(id===ui.profileId)break;
      const journalForm=$('#journal-form');
      if(journalForm){clearTimeout(journalDraftTimer);await saveDraft(journalForm);}
      const fromPicker=!!t.closest('.instrument-picker');
      await put('meta',{id:'activeProfile',value:id});
      ui.profileId=id;ui.pieceId=null;ui.exercise=null;ui.plan=null;
      render();
      const choices=document.querySelectorAll(fromPicker?'.instrument-choice':'[data-action="profile-change"]');
      Array.from(choices).find(button=>button.dataset.id===id)?.focus();
      break;
    }
    case'backup-full':await exportBackup(true);break;
    case'backup-meta':await exportBackup(false);break;
    case'pdf-new-tab':if(currentPdfUrl)window.open(currentPdfUrl,'_blank','noopener');break;
    case'pdf-download':if(currentPdfAsset?.blob)saveDownload(currentPdfAsset.blob,currentPdfAsset.name||'score.pdf');break;
  }
}
function generateTech(){
  const p=profile();
  const args={family:ui.tech.family,tonic:ui.tech.tonic,scaleType:ui.tech.scaleType,octaves:Number(ui.tech.octaves),direction:ui.tech.direction,bpm:Number(ui.tech.bpm),rhythm:ui.tech.rhythm,articulation:ui.tech.articulation,dynamics:ui.tech.dynamics,seed:randomSeed()};
  if(ui.tech.startOctave!=='auto')args.startOctave=Number(ui.tech.startOctave);
  try{ui.exercise=makeExercise(args,p);ui.exerciseError='';}catch(err){ui.exercise=null;ui.exerciseError=err.message;}
}
async function handleSubmit(event){
  const form=event.target;if(!(form instanceof HTMLFormElement))return;
  if(!['piece-form','folder-form','source-form','journal-form','plan-form','tech-form','exercise-log-form','profile-form'].includes(form.id))return;
  event.preventDefault();
  await guarded(async()=>{
    switch(form.id){
      case'piece-form':await savePiece(form);break;
      case'folder-form':await saveFolder(form);break;
      case'source-form':await saveSource(form);break;
      case'journal-form':await addJournal(form);break;
      case'plan-form':{
        const fd=new FormData(form);ui.duration=Number(fd.get('duration'));ui.mode=String(fd.get('mode'));makePlan();render();break;
      }
      case'tech-form':{
        const fd=new FormData(form);
        for(const name of ['family','tonic','scaleType','octaves','startOctave','direction','bpm','rhythm','articulation','dynamics'])ui.tech[name]=String(fd.get(name));
        generateTech();render();break;
      }
      case'exercise-log-form':{
        if(!ui.exercise)throw Error('Generate an exercise first');
        const fd=new FormData(form),submitter=event.submitter;
        const outcome=submitter?.value||'Completed';
        const achievedBpm=fd.get('achievedBpm')?Number(fd.get('achievedBpm')):null;
        await put('exerciseLogs',{id:newid(),createdAt:todayISO(),profileId:ui.profileId,exercise:ui.exercise,outcome,achievedBpm,note:String(fd.get('exerciseNote')||'')});
        await refresh();toast('Technical practice saved.');break;
      }
      case'profile-form':{
        const fd=new FormData(form),p=profile();
        const val=n=>Number(fd.get(n));
        const range={minMidi:val('minMidi'),maxMidi:val('maxMidi'),comfortableMin:val('comfortableMin'),comfortableMax:val('comfortableMax')};
        if(Object.values(range).some(x=>!Number.isInteger(x)||x<0||x>127)||range.minMidi>range.comfortableMin||range.comfortableMin>range.comfortableMax||range.comfortableMax>range.maxMidi)throw Error('Invalid pitch bounds: hard min ≤ comfortable min ≤ comfortable max ≤ hard max');
        const name=String(fd.get('profileName')||'').trim();if(!name)throw Error('Instrument name is required');
        await put('profiles',{...p,...range,name});ui.exercise=null;await refresh();toast('Profile saved.');break;
      }
    }
  });
}
let journalDraftTimer;
function handleInput(e){
  const el=e.target;
  if(el.id==='library-search'){ui.search=el.value;const start=el.selectionStart;render();const input=$('#library-search');input?.focus();input?.setSelectionRange(start,start);return;}
  if(el.closest('#journal-form')){
    if(el.id==='focus'){const prompt=$('#focus-prompt');if(prompt)prompt.textContent=FOCUS[el.value]||'';}
    const status=$('#draft-state');if(status)status.textContent='Saving draft…';
    clearTimeout(journalDraftTimer);journalDraftTimer=setTimeout(()=>{
      const f=$('#journal-form');if(f)guarded(()=>saveDraft(f));
    },400);
  }
}
async function handleChange(e){
  const t=e.target;
  if(t.id==='library-status'){ui.status=t.value;render()}
  if(t.id==='import-zip'&&t.files?.[0])await importBackup(t.files[0]);
  if(t.closest('#journal-form')){const f=$('#journal-form');if(f)await saveDraft(f)}
}
async function boot(){
  try{
    await seedData();state=await loadState();
    const stored=state.meta.find(x=>x.id==='activeProfile')?.value;
    if(state.profiles.some(x=>x.id===stored))ui.profileId=stored;
    const savedPlan=state.meta.find(x=>x.id==='currentPlan')?.value;
    if(savedPlan?.profileId===ui.profileId)ui.plan=savedPlan;
    render();
    document.addEventListener('click',e=>{guarded(()=>handleClick(e))});
    document.addEventListener('submit',handleSubmit);
    document.addEventListener('input',handleInput);
    document.addEventListener('change',e=>guarded(()=>handleChange(e)));
    $('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
    $('#modal').addEventListener('close',()=>{if(currentPdfUrl){URL.revokeObjectURL(currentPdfUrl);currentPdfUrl=null}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMetronome()});
    window.addEventListener('pagehide',()=>{stopMetronome();if(recorder?.state==='recording')cancelRecording()});
    if('serviceWorker' in navigator&&['https:','http:'].includes(location.protocol)){
      navigator.serviceWorker.register('./service-worker.js').catch(err=>console.info('Offline worker unavailable:',err));
    }
  }catch(err){console.error(err);$('#app').innerHTML=`<div class="loading-screen"><h2>Could not open the local library.</h2><p>${esc(err.message)}</p><p>Try Safari on a secure GitHub Pages URL. Do not clear your browser data without exporting a backup.</p></div>`;}
}
boot();
