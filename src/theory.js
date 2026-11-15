/** Pure, deterministic music generation. No browser APIs and no network access. */
export const GENERATOR_VERSION = '1.0.0';
const LETTERS = ['C','D','E','F','G','A','B'];
const NATURAL = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const ACC = {'bb':-2,'b':-1,'':0,'#':1,'x':2};
export const MAJOR_TONICS = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
export const MINOR_TONICS = ['C','C#','D','Eb','E','F','F#','G','G#','A','Bb','B'];
export const SCALE_TYPES = {
  major: [0,2,4,5,7,9,11],
  'natural-minor': [0,2,3,5,7,8,10],
  'harmonic-minor': [0,2,3,5,7,8,11],
  'melodic-minor-classical': [0,2,3,5,7,9,11]
};
const mod = (n,m) => ((n%m)+m)%m;
export function parseTonic(name) {
  const m=/^([A-G])(bb|b|#|x)?$/.exec(name||'');
  if(!m) throw Error(`Invalid tonic: ${name}`);
  return {letter:m[1],accidental:ACC[m[2]||'']};
}
export function pcOf(tonic){ return mod(NATURAL[tonic.letter]+tonic.accidental,12); }
export function midiOf(p){return 12*(p.octave+1)+NATURAL[p.letter]+p.accidental;}
export function displayPitch(p){const signs={'-2':'𝄫','-1':'♭','0':'','1':'♯','2':'𝄪'}; return `${p.letter}${signs[p.accidental]??'?'}${p.octave}`;}
export function displayTonic(s){const p=parseTonic(s);return displayPitch({...p,octave:4}).replace(/4$/,'');}
function diatonicDegree(tonic, startingOctave, degreeIndex, semiOffset) {
  const pos=LETTERS.indexOf(tonic.letter);
  const idx=pos+degreeIndex;
  const letter=LETTERS[mod(idx,7)];
  const octave=startingOctave+Math.floor(idx/7);
  const intended=12*(startingOctave+1)+NATURAL[tonic.letter]+tonic.accidental+semiOffset;
  const base=12*(octave+1)+NATURAL[letter];
  const accidental=intended-base;
  if(Math.abs(accidental)>2) throw Error(`Cannot spell note in ${tonic.letter} at degree ${degreeIndex+1}`);
  const pitch={letter,accidental,octave,midi:intended};
  if(midiOf(pitch)!==intended) throw Error('Internal spelling mismatch');
  return pitch;
}
export function scaleNotes({tonic='G',scaleType='harmonic-minor',octaves=1,startOctave=4,direction='up-and-down'}){
  if(!SCALE_TYPES[scaleType]) throw Error('Unsupported scale type');
  if(![1,2,3].includes(octaves)) throw Error('Octaves must be 1, 2 or 3');
  const t=parseTonic(tonic);
  const pat=SCALE_TYPES[scaleType];
  const top=7*octaves;
  const asc=Array.from({length:top+1},(_,i)=>diatonicDegree(t,startOctave,i,12*Math.floor(i/7)+pat[i%7]));
  if(direction==='up')return asc;
  const descending=[];
  const descentPattern=scaleType==='melodic-minor-classical'?SCALE_TYPES['natural-minor']:pat;
  for(let i=top;i>=0;i--){
    descending.push(diatonicDegree(t,startOctave,i,12*Math.floor(i/7)+descentPattern[i%7]));
  }
  if(direction==='down')return descending;
  if(direction!=='up-and-down')throw Error('Invalid direction');
  return asc.concat(descending.slice(1));
}
export function arpeggioNotes({tonic='G',quality='minor',octaves=1,startOctave=4,direction='up-and-down'}){
  const chord=quality==='major'?[0,4,7]:quality==='minor'?[0,3,7]:null;
  if(!chord)throw Error('Unknown triad quality');
  if(![1,2,3].includes(octaves))throw Error('Octaves must be 1–3');
  const t=parseTonic(tonic);
  const idx=[0,2,4];
  const up=Array.from({length:octaves*3+1},(_,i)=>{
    const degree=i%3,block=Math.floor(i/3);
    return diatonicDegree(t,startOctave,idx[degree]+block*7,chord[degree]+block*12);
  });
  if(direction==='up')return up;
  if(direction==='down')return [...up].reverse();
  if(direction!=='up-and-down')throw Error('Invalid direction');
  return up.concat([...up].reverse().slice(1));
}
const CHROMATIC_UP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const CHROMATIC_DOWN=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
function pitchFromMidi(midi,descending=false){
  const spelling=(descending?CHROMATIC_DOWN:CHROMATIC_UP)[mod(midi,12)];
  const t=parseTonic(spelling);
  const oct=Math.floor(midi/12)-1;
  return {...t,octave:oct,midi};
}
export function chromaticNotes({tonic='G',octaves=1,startOctave=4,direction='up-and-down'}) {
  if(![1,2,3].includes(octaves))throw Error('Octaves must be 1–3');
  const root={...parseTonic(tonic),octave:startOctave};
  const start=midiOf(root);
  const tonicAt=oct=>({...parseTonic(tonic),octave:oct,midi:start+12*(oct-startOctave)});
  const up=Array.from({length:12*octaves+1},(_,i)=>i%12===0?tonicAt(startOctave+Math.floor(i/12)):pitchFromMidi(start+i));
  if(direction==='up')return up;
  const down=Array.from({length:12*octaves+1},(_,i)=>i%12===0?tonicAt(startOctave+octaves-Math.floor(i/12)):pitchFromMidi(start+12*octaves-i,true));
  if(direction==='down')return down;
  if(direction==='up-and-down')return up.concat(down.slice(1));
  throw Error('Invalid direction');
}
export function seedNumber(seed){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function randomSeed(){return `${Date.now()}-${Math.floor(Math.random()*1e9)}`;}
function pick(a,seed){return a[seedNumber(seed)%a.length];}
export const FLUTE_RANGE={minMidi:60,maxMidi:96,comfortableMin:62,comfortableMax:93};
export const RHYTHMS = {'quarters':'Crotchets · 1 note per beat','eighths':'Quavers · 2 notes per beat','sixteenths':'Semiquavers · 4 notes per beat','long-short':'Dotted quaver + semiquaver · long–short','short-long':'Semiquaver + dotted quaver · short–long'};
export const ARTICULATIONS = {'tongued':'Tongue every note','slurred':'Slur smoothly','slur-2':'Slur in pairs','slur-4':'Slur in fours','tongue2-slur2':'Tongue 2, slur 2'};
export const DYNAMICS={'mp':'Steady mezzo-piano','mf':'Steady mezzo-forte','crescendo':'Gradually crescendo','diminuendo':'Gradually diminuendo','swell':'Crescendo then diminuendo'};
export function rhythmDurations(rhythm,length){
  if(!RHYTHMS[rhythm])throw Error('Unknown rhythm');
  return Array.from({length},(_,i)=>rhythm==='quarters'?1:rhythm==='eighths'?.5:rhythm==='sixteenths'?.25:rhythm==='long-short'?(i%2===0?.75:.25):(i%2===0?.25:.75));
}
/** Construct, validate, and freeze a reproducible exercise. Throws for explicit impossible requests. */
export function makeExercise(request={}, profile={kind:'flute', ...FLUTE_RANGE}) {
  const seed=request.seed??'default';
  const family=request.family??pick(['scale','scale','arpeggio','tone','octave-slurs','chromatic'],seed+'-family');
  const kind=profile.kind||'flute';
  if(kind!=='flute' && kind!=='piano'){
    const safe={ukulele:'Practise switching between two familiar chords for 60 seconds. Listen for even timing; use your own verified chord shapes.',ocarina:'Practise gentle sustained notes using your instrument’s known fingering chart. Listen for pitch and breath stability.',kalimba:'Play a short sequence using only tines present on your instrument. Aim for even volume and timing.'};
    return {id:`${seed}`,seed,version:GENERATOR_VERSION,kind,family:'guided',title:'Listening and control',notes:[],instruction:safe[kind]||'Practise a familiar passage slowly.',prompt:'Which part felt least consistent?',bpm:null,rhythm:null,articulation:null,dynamics:null};
  }
  const bpm=Number(request.bpm??72);
  if(!(bpm>=30 && bpm<=240))throw Error('Tempo must be between 30 and 240 BPM');
  const rhythm=request.rhythm??pick(['quarters','eighths','eighths','sixteenths'],seed+'-rhythm');
  const articulation=request.articulation??'tongued';
  const dynamics=request.dynamics??'mf';
  if(!RHYTHMS[rhythm]||!ARTICULATIONS[articulation]||!DYNAMICS[dynamics])throw Error('Unknown rhythm/articulation/dynamics');
  const common={id:seed,seed,version:GENERATOR_VERSION,kind,family,bpm,rhythm,articulation,dynamics};
  if(family==='tone'){
    if(request.rhythm && request.rhythm!=='quarters')throw Error('Long tones cannot use fast-note rhythms');
    const note=kind==='flute'?'A4':'C4';
    return {...common,title:'Long tones · dynamic control',notes:[],instruction:`Hold ${note} for 6–8 seconds with relaxed, steady sound. Repeat four times. Shape each note as ${DYNAMICS[dynamics].toLowerCase()}. Rest between attempts.`,prompt:'Did your tone and pitch stay steady until the end?'};
  }
  if(family==='octave-slurs'){
    if(kind!=='flute')throw Error('Octave slur exercise is flute-only');
    const notes=[{letter:'D',accidental:0,octave:5,midi:74},{letter:'D',accidental:0,octave:6,midi:86},{letter:'D',accidental:0,octave:5,midi:74},{letter:'E',accidental:0,octave:5,midi:76},{letter:'E',accidental:0,octave:6,midi:88},{letter:'E',accidental:0,octave:5,midi:76}];
    validateRange(notes,profile,false);
    return {...common,title:'Gentle octave slurs',notes,instruction:'Slowly slur lower–upper–lower on D, then E. Keep air and jaw relaxed; repeat after a short rest.',prompt:'Was the register change smooth without pressing or forcing?',durations:notes.map(()=>1)};
  }
  if(!['scale','arpeggio','chromatic'].includes(family))throw Error('Unsupported exercise family');
  const scaleType=request.scaleType??'major';
  const candidateTonics=(family==='scale'&&scaleType!=='major')?MINOR_TONICS:MAJOR_TONICS;
  const tonic=request.tonic??pick(candidateTonics,seed+'-tonic');
  const octaves=request.octaves??1;
  const direction=request.direction??'up-and-down';
  if(![1,2,3].includes(octaves))throw Error('Choose 1, 2 or 3 octaves');
  const create=startOctave=>family==='scale'?scaleNotes({tonic,scaleType,octaves,startOctave,direction}):family==='arpeggio'?arpeggioNotes({tonic,quality:request.quality??'minor',octaves,startOctave,direction}):chromaticNotes({tonic,octaves,startOctave,direction});
  const hardMin=profile.minMidi??(kind==='flute'?60:21),hardMax=profile.maxMidi??(kind==='flute'?96:108);
  const comfortMin=profile.comfortableMin??hardMin,comfortMax=profile.comfortableMax??hardMax;
  let notes,startingOctave;
  const candidates=request.startOctave!==undefined?[Number(request.startOctave)]:[3,4,5,2,6,1,0,7];
  for(const oc of candidates){
    const tryNotes=create(oc);
    if(tryNotes.every(n=>n.midi>=hardMin&&n.midi<=hardMax&&inventoryOK(n,profile))){
      if(request.startOctave!==undefined || tryNotes.every(n=>n.midi>=comfortMin&&n.midi<=comfortMax)){
        notes=tryNotes;startingOctave=oc;break;
      }
    }
  }
  if(!notes)throw Error(`No playable ${octaves}-octave ${tonic} exercise within this instrument's ${hardMin}–${hardMax} MIDI range and comfortable limits. Choose fewer octaves, a different tonic, or explicitly select a valid starting octave.`);
  validateRange(notes,profile,true);
  const durations=rhythmDurations(rhythm,notes.length);
  const title=family==='scale'?`${displayTonic(tonic)} ${scaleType.replaceAll('-',' ')} scale`:family==='arpeggio'?`${displayTonic(tonic)} ${request.quality??'minor'} arpeggio`:`${displayTonic(tonic)} chromatic scale`;
  return {...common,tonic,scaleType:family==='scale'?scaleType:null,quality:family==='arpeggio'?(request.quality??'minor'):null,octaves,direction,startingOctave,notes,durations,title,instruction:`${octaves} octave${octaves===1?'':'s'} · ${direction.replaceAll('-',' ')} · ${RHYTHMS[rhythm]} · ${ARTICULATIONS[articulation]} · ${DYNAMICS[dynamics]} · ♩=${bpm}. Pitch sequence is written out below. Treat it as an unmetered exercise.`,prompt:family==='arpeggio'?'Were larger leaps and register changes smooth and controlled?':family==='chromatic'?'Which semitone transitions were uneven?':'Which finger transition was least even? Did your articulation stay consistent?'};
}
function inventoryOK(n,profile){return !Array.isArray(profile.pitchInventory)||profile.pitchInventory.includes(n.midi);}
export function validateRange(notes,profile={},checkInventory=true){const min=profile.minMidi??60,max=profile.maxMidi??96;for(const n of notes){if(n.midi<min||n.midi>max)throw Error(`Note ${displayPitch(n)} is outside playable range`);if(checkInventory&&!inventoryOK(n,profile))throw Error(`Note ${displayPitch(n)} not available on this instrument`);}return true;}
export const SESSION_ALLOCATIONS={5:[1,2,1,1],10:[2,3,4,1],20:[4,5,9,2],30:[5,8,15,2],45:[7,12,23,3]};
export function allocateSession(minutes,mode='Balanced'){
  if(!Number.isInteger(minutes)||minutes<5||minutes>180)throw Error('Duration must be between 5 and 180 minutes');
  let vals=SESSION_ALLOCATIONS[minutes]?[...SESSION_ALLOCATIONS[minutes]]:null;
  if(!vals){const ratios=[.17,.27,.50,.06],exact=ratios.map(x=>x*minutes);vals=exact.map(Math.floor);let remainder=minutes-vals.reduce((a,b)=>a+b,0);const rank=exact.map((x,i)=>({i,f:x-Math.floor(x)})).sort((a,b)=>b.f-a.f);for(let j=0;j<remainder;j++)vals[rank[j].i]++;}
  if(mode==='Orchestra soon'||mode==='Enjoyment') {const shift=Math.min(vals[1]-1,Math.max(1,Math.round(minutes*.13)));vals[1]-=shift;vals[2]+=shift;}
  if(mode==='Technical'){const shift=Math.min(vals[2]-1,Math.max(1,Math.round(minutes*.15)));vals[2]-=shift;vals[1]+=shift;}
  if(mode==='Deadline week' && minutes>10)return allocateSession(10,'Balanced');
  return {minutes:vals.reduce((a,b)=>a+b,0),blocks:vals.map((m,i)=>({type:['warmup','technique','repertoire','reflection'][i],minutes:m}))};
}
