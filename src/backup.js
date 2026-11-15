/** Portable, uncompressed ZIP backup. ZIP headers and CRC are written without dependencies. */
const encoder=new TextEncoder(),decoder=new TextDecoder();
const u16=(data,at,n)=>{data[at]=n&255;data[at+1]=(n>>>8)&255};
const u32=(data,at,n)=>{u16(data,at,n);u16(data,at+2,n>>>16)};
const read16=(b,i)=>b[i]|b[i+1]<<8;
const read32=(b,i)=>(b[i]|b[i+1]<<8|b[i+2]<<16|b[i+3]<<24)>>>0;
const crcTable=(()=>{const t=[];for(let k=0;k<256;k++){let c=k;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;t.push(c>>>0)}return t;})();
export function crc32(bytes){let c=0xffffffff;for(const n of bytes)c=crcTable[(c^n)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
const concat=arrays=>{const out=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let off=0;for(const a of arrays){out.set(a,off);off+=a.length;}return out;};
export function makeZip(entries){
  const locals=[],centrals=[];let offset=0;
  for(const [filename,contents] of entries){
    const file=encoder.encode(filename),data=contents instanceof Uint8Array?contents:encoder.encode(String(contents)),crc=crc32(data);
    const local=new Uint8Array(30+file.length);
    u32(local,0,0x04034b50);u16(local,4,20);u16(local,6,0x0800);u16(local,8,0);u32(local,14,crc);u32(local,18,data.length);u32(local,22,data.length);u16(local,26,file.length);local.set(file,30);
    locals.push(local,data);
    const central=new Uint8Array(46+file.length);
    u32(central,0,0x02014b50);u16(central,4,20);u16(central,6,20);u16(central,8,0x0800);u32(central,16,crc);u32(central,20,data.length);u32(central,24,data.length);u16(central,28,file.length);u32(central,42,offset);central.set(file,46);
    centrals.push(central);offset+=local.length+data.length;
  }
  const directory=concat(centrals),end=new Uint8Array(22);
  u32(end,0,0x06054b50);u16(end,8,entries.length);u16(end,10,entries.length);u32(end,12,directory.length);u32(end,16,offset);
  return concat([...locals,directory,end]);
}
export function parseZip(bytes){
  const files=new Map();let i=0;
  while(i+4<=bytes.length && read32(bytes,i)===0x04034b50){
    if(read16(bytes,i+8)!==0)throw Error('Backup contains compressed files; only exports made by this app are supported.');
    const flags=read16(bytes,i+6);if(flags&8)throw Error('ZIP data-descriptor format is unsupported');
    const expected=read32(bytes,i+14),length=read32(bytes,i+18),nameLength=read16(bytes,i+26),extra=read16(bytes,i+28);
    const start=i+30+nameLength+extra,end=start+length;
    if(end>bytes.length||length>512*1024*1024)throw Error('Invalid or too large backup file');
    const name=decoder.decode(bytes.slice(i+30,i+30+nameLength));
    if(name.startsWith('/')||name.includes('..'))throw Error('Invalid filename in backup');
    const payload=bytes.slice(start,end);
    if(crc32(payload)!==expected)throw Error(`Backup damaged: ${name}`);
    files.set(name,payload);i=end;
  }
  return files;
}
export function decodeFile(bytes){return JSON.parse(decoder.decode(bytes));}
export async function createBackup(state,full=true){
  const entries=[];
  const records={};
  for(const [key,values] of Object.entries(state))if(key!=='assets')records[key]=values;
  const assets=state.assets.map(({blob,...metadata})=>({...metadata,missing:!full}));
  records.assets=assets;
  const manifest={formatVersion:1,appVersion:'0.1.0',exportedAt:new Date().toISOString(),includesBlobs:full,counts:Object.fromEntries(Object.entries(state).map(([k,v])=>[k,v.length]))};
  entries.push(['backup-manifest.json',JSON.stringify(manifest,null,2)],['records.json',JSON.stringify(records,null,2)]);
  if(full)for(const asset of state.assets)if(asset.blob)entries.push([`blobs/${asset.id}`,new Uint8Array(await asset.blob.arrayBuffer())]);
  return new Blob([makeZip(entries)],{type:'application/zip'});
}
export function readBackup(bytes){
  const files=parseZip(bytes);
  if(!files.has('backup-manifest.json')||!files.has('records.json'))throw Error('Not a Music Practice Companion backup');
  const manifest=decodeFile(files.get('backup-manifest.json')); 
  if(manifest.formatVersion!==1)throw Error(`Unsupported backup version: ${manifest.formatVersion}`);
  const records=decodeFile(files.get('records.json'));
  if(!Array.isArray(records.pieces)||!Array.isArray(records.profiles)||!Array.isArray(records.assets))throw Error('Backup missing required records');
  const assets=records.assets.map(item=>{
    const bytes=files.get(`blobs/${item.id}`);
    return {...item,missing:!bytes,blob:bytes?new Blob([bytes],{type:item.type||'application/octet-stream'}):undefined};
  });
  return {manifest,records:{...records,assets}};
}
