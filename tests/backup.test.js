import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeZip,parseZip,crc32,createBackup,readBackup} from '../src/backup.js';
test('Uncompressed ZIP archive roundtrips and checksums',()=>{
  const x=makeZip([['hello.txt','Hello world!']]);
  const files=parseZip(x);assert.equal(new TextDecoder().decode(files.get('hello.txt')),'Hello world!');
  assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
  x[41]^=1;assert.throws(()=>parseZip(x));
});
test('Full backup retains a private PDF binary and records',async()=>{
  const src={pieces:[{id:'piece',title:'test'}],profiles:[{id:'flute'}],assets:[{id:'pdf1',name:'score.pdf',type:'application/pdf',blob:new Blob(['PDF fake content'])}],folders:[],journals:[],recordings:[],exerciseLogs:[],drafts:[],meta:[]};
  const zip=await createBackup(src,true);
  const dest=readBackup(new Uint8Array(await zip.arrayBuffer()));
  assert.equal(dest.records.assets.length,1);
  assert.equal(await dest.records.assets[0].blob.text(),'PDF fake content');
  assert.equal(dest.records.pieces[0].title,'test');
});
