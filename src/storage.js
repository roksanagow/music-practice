/** IndexedDB adapter. All user data stays in the current browser / installed-app context. */
const DB_NAME='music-practice-companion';
export const TABLES=['profiles','folders','pieces','journals','assets','recordings','exerciseLogs','drafts','meta'];
let handle;
export function openDatabase(){
  if(handle)return handle;
  handle=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      for(const table of TABLES)if(!db.objectStoreNames.contains(table))db.createObjectStore(table,{keyPath:'id'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return handle;
}
async function operation(table, mode, callback){
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(table,mode);
    const request=callback(tx.objectStore(table));
    let result;
    if(request){request.onsuccess=()=>{result=request.result};request.onerror=()=>reject(request.error);}
    tx.oncomplete=()=>resolve(result);
    tx.onerror=()=>reject(tx.error||new Error('Storage failed'));
    tx.onabort=()=>reject(tx.error||new Error('Storage cancelled'));
  });
}
export const list=table=>operation(table,'readonly',store=>store.getAll());
export const get=(table,id)=>operation(table,'readonly',store=>store.get(id));
export const put=(table,item)=>operation(table,'readwrite',store=>store.put(item));
export const del=(table,id)=>operation(table,'readwrite',store=>store.delete(id));
export const clear=table=>operation(table,'readwrite',store=>store.clear());
export const newid=()=>crypto.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function defaults(){
  const now=new Date().toISOString();
  const mk=(id,kind,name,minMidi,maxMidi,comfortableMin,comfortableMax)=>({id,kind,name,minMidi,maxMidi,comfortableMin,comfortableMax,archived:false,createdAt:now});
  return {
    profiles:[
      mk('flute','flute','Flute',60,96,62,93),
      mk('piano','piano','Piano',21,108,48,84),
      mk('ukulele','ukulele','Ukulele',60,88,60,88),
      mk('ocarina','ocarina','Ocarina',60,84,60,84),
      mk('kalimba','kalimba','Kalimba',60,84,60,84)
    ],
    folders:[
      {id:'orchestra',name:'Orchestra',parentId:null,createdAt:now},
      {id:'favourites',name:'Favourites',parentId:null,createdAt:now},
      {id:'learning',name:'Learning',parentId:null,createdAt:now},
      {id:'challenges',name:'Future challenges',parentId:null,createdAt:now}
    ]
  };
}
export async function seedData(){
  const p=await list('profiles');
  if(p.length)return;
  const d=defaults();
  for(const x of d.profiles)await put('profiles',x);
  for(const x of d.folders)await put('folders',x);
  await put('pieces',{id:newid(),title:'Hungarian Dance No. 5',composer:'Johannes Brahms',instrumentIds:['flute'],folderIds:['favourites','learning'],status:'Learning',priority:2,goal:'Improve contrast, phrasing and character',sources:[],createdAt:new Date().toISOString()});
  await put('meta',{id:'activeProfile',value:'flute'});
}
export async function loadState(){
  const entries=await Promise.all(TABLES.map(async name=>[name,await list(name)]));
  return Object.fromEntries(entries);
}
/** Atomic full restore: either every table is replaced or the transaction aborts. */
export async function replaceAll(records){
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(TABLES,'readwrite');
    for(const table of TABLES){
      const store=tx.objectStore(table);store.clear();
      for(const item of records[table]||[])store.put(item);
    }
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error||new Error('Restore failed'));
    tx.onabort=()=>reject(tx.error||new Error('Restore cancelled'));
  });
}
