import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scaleNotes,arpeggioNotes,displayPitch,makeExercise,MAJOR_TONICS,MINOR_TONICS,allocateSession,FLUTE_RANGE,rhythmDurations} from '../src/theory.js';
const n = a=>a.map(displayPitch);
test('G harmonic minor spelled correctly',()=>{
  const ns=scaleNotes({tonic:'G',scaleType:'harmonic-minor',direction:'up'});
  assert.deepEqual(n(ns),['G4','A4','B♭4','C5','D5','E♭5','F♯5','G5']);
  assert.deepEqual(ns.map(x=>x.midi-ns[0].midi),[0,2,3,5,7,8,11,12]);
});
test('Classical melodic minor differs descending',()=>{
  const ns=scaleNotes({tonic:'G',scaleType:'melodic-minor-classical',direction:'up-and-down'});
  assert.deepEqual(n(ns),['G4','A4','B♭4','C5','D5','E5','F♯5','G5','F5','E♭5','D5','C5','B♭4','A4','G4']);
});
test('Enharmonic spelling F sharp and G flat major',()=>{
  assert.ok(n(scaleNotes({tonic:'F#',scaleType:'major',direction:'up'})).includes('E♯5'));
  assert.ok(n(scaleNotes({tonic:'Gb',scaleType:'major',direction:'up'})).includes('C♭5'));
});
test('Every tonic and required scale type builds exact intervals',()=>{
  const types={'major':[0,2,4,5,7,9,11,12],'natural-minor':[0,2,3,5,7,8,10,12],'harmonic-minor':[0,2,3,5,7,8,11,12],'melodic-minor-classical':[0,2,3,5,7,9,11,12]};
  for(const [type,pat] of Object.entries(types)) for(const tonic of (type==='major'?MAJOR_TONICS:MINOR_TONICS)) {
    const a=scaleNotes({tonic,scaleType:type,direction:'up'});
    assert.deepEqual(a.map(x=>x.midi-a[0].midi),pat,`${tonic} ${type}`);
    assert.equal(a.length,8);
  }
});
test('Two-octave scale plays turnaround only once',()=>{
  const a=scaleNotes({tonic:'G',scaleType:'harmonic-minor',octaves:2,direction:'up-and-down'});
  assert.equal(a.length,29);assert.equal(a[14].midi,91);assert.equal(a[0].midi,67);assert.equal(a.at(-1).midi,67);
});
test('Minor and major arpeggios semitones',()=>{
  for(const q of ['major','minor'])for(const tonic of MAJOR_TONICS){const a=arpeggioNotes({tonic,quality:q,direction:'up'});assert.deepEqual(a.map(x=>x.midi-a[0].midi),[0,q==='major'?4:3,7,12]);}
});
test('Exercise retains locked tempo and rejects impossible ranges',()=>{
  const p={kind:'flute',...FLUTE_RANGE};
  const a=makeExercise({family:'scale',tonic:'G',scaleType:'harmonic-minor',octaves:2,startOctave:4,bpm:80,seed:'same'},p);
  assert.deepEqual(a,makeExercise({family:'scale',tonic:'G',scaleType:'harmonic-minor',octaves:2,startOctave:4,bpm:80,seed:'same'},p));
  assert.equal(a.notes.at(-1).midi,67);assert.equal(a.bpm,80);
  assert.throws(()=>makeExercise({family:'scale',tonic:'B',octaves:2,startOctave:3},p),/No playable/);
  assert.throws(()=>makeExercise({family:'tone',rhythm:'sixteenths'},p),/cannot/);
});
test('Range and inventory never violated by generated exercises',()=>{
  for(let i=0;i<1000;i++){
    const a=makeExercise({family:'scale',seed:`seed-${i}`},{kind:'flute',...FLUTE_RANGE});
    assert.ok(a.notes.every(x=>x.midi>=60&&x.midi<=96));
  }
});
test('Rhythm rational durations and session totals',()=>{
  assert.deepEqual(rhythmDurations('long-short',4),[.75,.25,.75,.25]);
  for(const m of [5,10,20,30,45,37,89])for(const mode of ['Balanced','Technical','Orchestra soon','Enjoyment']){
    const b=allocateSession(m,mode).blocks;assert.equal(b.reduce((s,x)=>s+x.minutes,0),m);assert.ok(b.every(x=>x.minutes>=0));
  }
  assert.deepEqual(allocateSession(30).blocks.map(x=>x.minutes),[5,8,15,2]);
});
test('Chromatic tonic enharmonic spelling stays locked',async()=>{
  const {chromaticNotes}=await import('../src/theory.js');
  const a=chromaticNotes({tonic:'C#',direction:'up-and-down',startOctave:4,octaves:1});
  assert.equal(displayPitch(a[0]),'C♯4');
  assert.equal(displayPitch(a[12]),'C♯5');
  assert.equal(displayPitch(a.at(-1)),'C♯4');
  assert.equal(a.length,25);
});
