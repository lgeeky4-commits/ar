'use strict';
/* SKYLOCK - fictional aircraft simulation. No actual geolocation, hacking, or weapon functionality. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PORT = Number(process.env.PORT || 3000);
const STATIC = path.join(__dirname, 'public');
const MAX_BYTES = 120_000;
const rooms = new Map();
const actors = new Map();
const id = () => crypto.randomBytes(12).toString('hex');
const safeText = (v,n=120) => String(v ?? '').trim().slice(0,n);
const reply = (res,code,obj) => {res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj));};
const error = (msg,status=400) => {const e=new Error(msg);e.status=status;throw e;};
function code(){let c;do{c=crypto.randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(c));return c;}
function initialContacts(){return [
  {id:'ECHO-01',x:20,y:30,range:4200,bearing:26,alt:1700,kind:'TRAINER',status:'active'},
  {id:'DELTA-07',x:68,y:20,range:6100,bearing:114,alt:2300,kind:'DRONE PROP',status:'active'},
  {id:'NOVA-12',x:44,y:63,range:2900,bearing:210,alt:980,kind:'FICTIONAL JET',status:'active'},
  {id:'FALCON-03',x:78,y:72,range:8400,bearing:310,alt:3600,kind:'ARCADE PLANE',status:'active'}
];}
function publicRoom(r){return {code:r.code,pc:!!r.pc,mobile:!!r.mobile,contacts:r.contacts,selected:r.selected,telemetry:r.telemetry,shared:r.shared,mode:r.mode,events:r.events.slice(-35),challenge:r.challenge};}
function send(a,type,data){if(!a?.stream||a.stream.destroyed)return;try{a.stream.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)}catch{}}
function broadcast(r,type,data){for(const token of [r.pc,r.mobile])if(token)send(actors.get(token),type,data);}
function publish(r,type,data){broadcast(r,type,data);}
function log(r,label,detail){const item={id:id(),ts:Date.now(),label:safeText(label,70),detail:safeText(detail,220)};r.events.push(item);if(r.events.length>70)r.events.shift();publish(r,'log',item);}
function newRoom(){const c=code();const r={code:c,pc:null,mobile:null,contacts:initialContacts(),selected:'ECHO-01',telemetry:{pitch:0,roll:0,heading:0,online:false},shared:false,mode:'NORMAL',events:[],challenge:{key:String(Math.floor(1000+Math.random()*9000)),solved:false},updated:Date.now()};rooms.set(c,r);return r;}
function actor(token){const a=actors.get(String(token||''));if(!a)error('Session expired. Reconnect using your room code.',401);return a;}
function roomFor(a){const r=rooms.get(a.code);if(!r)error('Room expired.',404);return r;}
function closeActor(a){if(!a)return;const r=rooms.get(a.code);actors.delete(a.token);if(a.stream&&!a.stream.destroyed)a.stream.end();if(r){if(r[a.role]===a.token)r[a.role]=null;if(a.role==='mobile'){r.shared=false;r.telemetry.online=false;}log(r,'DISCONNECTED',`${a.role.toUpperCase()} session left`);publish(r,'state',publicRoom(r));if(!r.pc&&!r.mobile)rooms.delete(r.code);}}
function handleAction(a,body){const r=roomFor(a);const act=body.action;
 if(act==='telemetry'){
   if(a.role!=='mobile')error('Mobile telemetry only.',403);
   const cap=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
   r.telemetry={pitch:cap(body.pitch,-90,90),roll:cap(body.roll,-90,90),heading:cap(body.heading,0,359),online:true};
   send(actors.get(r.pc),'telemetry',r.telemetry);return {};
 }
 if(act==='share'){
   if(a.role!=='mobile')error('Only the phone can enable its camera.',403);
   r.shared=body.enabled===true;publish(r,'state',publicRoom(r));log(r,r.shared?'CAMERA READY':'CAMERA OFF',r.shared?'Phone opted in to share a camera track':'Phone stopped sharing');return {};
 }
 if(act==='select'){
   const target=r.contacts.find(t=>t.id===body.target&&t.status==='active');if(!target)error('Select a valid fictional contact.');
   r.selected=target.id;publish(r,'select',{target:target.id});return {};
 }
 if(act==='virtualLaunch'){
   const target=r.contacts.find(t=>t.id===r.selected&&t.status==='active');if(!target)error('No active simulated target selected.');
   target.status='tagged';log(r,'VIRTUAL INTERCEPT',`${a.role.toUpperCase()} tagged ${target.id} in arcade mode`);
   publish(r,'effect',{kind:'launch',target:target.id,success:true,ts:Date.now()});publish(r,'state',publicRoom(r));return {target:target.id};
 }
 if(act==='scan'){
   for(const tagged of r.contacts)if(tagged.status==='tagged')tagged.status='active';
   log(r,'RADAR SCAN',`${a.role.toUpperCase()} refreshed fictional radar contacts`);
   publish(r,'effect',{kind:'scan',ts:Date.now()});publish(r,'state',publicRoom(r));return {};
 }
 if(act==='mode'){
   if(!['NORMAL','NIGHT','THERMAL','WIRE'].includes(body.mode))error('Unknown visual filter.');
   r.mode=body.mode;publish(r,'state',publicRoom(r));log(r,'VISUAL MODE',`Switched to ${r.mode} simulation filter`);return {};
 }
 if(act==='scenario'){
   if(a.role!=='pc')error('Scenario tools are desktop-only.',403);
   const what=safeText(body.what,20);
   if(what==='spawn'){
     if(r.contacts.length>=10)error('Maximum ten fictional contacts. Reset the scenario to add more.');
     const n=r.contacts.length+1;
     const t={id:`GHOST-${String(n).padStart(2,'0')}`,x:12+Math.floor(Math.random()*75),y:13+Math.floor(Math.random()*74),range:2000+Math.floor(Math.random()*6500),bearing:Math.floor(Math.random()*359),alt:500+Math.floor(Math.random()*2600),kind:'ARCADE PROP',status:'active'};
     r.contacts.push(t);log(r,'SIM CONTACT',`${t.id} has been added to the fictional sky`);
   }else if(what==='advance'){
     for(const t of r.contacts){t.x=Math.min(88,Math.max(12,t.x+(Math.random()-.5)*9));t.y=Math.min(87,Math.max(13,t.y+(Math.random()-.5)*9));t.range=Math.max(700,Math.min(9600,Math.round(t.range+(Math.random()-.5)*600)));}
     log(r,'SIMULATION TICK','Fictional contact positions advanced');
   }else if(what==='reset'){
     r.contacts=initialContacts();r.selected=r.contacts[0].id;log(r,'SCENARIO RESET','All arcade contacts restored');
   }else error('Unknown scenario action.');
   publish(r,'state',publicRoom(r));return {};
 }
 if(act==='puzzle'){
   const correct=safeText(body.answer,10)===r.challenge.key;
   if(correct){r.challenge.solved=true;log(r,'PRACTICE TERMINAL',`${a.role.toUpperCase()} unlocked fictional signal tools`);publish(r,'state',publicRoom(r));}
   return {correct};
 }
 if(act==='deploy'){
   if(!r.challenge.solved)error('Complete the fictional terminal puzzle first.',403);
   const tool=safeText(body.tool,30);
   if(!['DECOY','JAMMER','SHIELD','PULSE'].includes(tool))error('Unknown arcade action.');
   log(r,'ARCADE SYSTEM',`${tool} visual effect triggered by ${a.role.toUpperCase()}`);
   publish(r,'effect',{kind:tool.toLowerCase(),ts:Date.now()});return {};
 }
 if(act==='signal'){
   // Signaling is exchanged only between consenting paired room participants.
   const recipient=actors.get(r[a.role==='pc'?'mobile':'pc']);
   if(!recipient)error('Other device is not connected.',409);
   if(!r.shared)error('Phone camera sharing has not been enabled.',403);
   if(!body.signal||typeof body.signal!=='object')error('Invalid signaling payload.');
   const content=JSON.stringify(body.signal);
   if(content.length>20_000)error('Signaling payload is too large.');
   send(recipient,'signal',{from:a.role,signal:body.signal});return {};
 }
 error('Unknown action.');
}
function readBody(req){return new Promise((resolve,reject)=>{const chunks=[];let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>MAX_BYTES){reject(Object.assign(new Error('Request is too large.'),{status:413}));req.destroy();return;}chunks.push(chunk);});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'))}catch{reject(Object.assign(new Error('Invalid JSON.'),{status:400}))}});req.on('error',reject);});}
function serve(pathname,res){let filename=pathname==='/'?'/index.html':pathname;if(filename.includes('\\')||filename.includes('\0'))return reply(res,400,{error:'Invalid path'});const file=path.resolve(STATIC,'.'+filename);if(!file.startsWith(STATIC+path.sep))return reply(res,403,{error:'Forbidden'});fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('Not found');return;}res.writeHead(200,{'content-type':{'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream','cache-control':'no-cache','x-content-type-options':'nosniff'});fs.createReadStream(file).pipe(res);});}
const server=http.createServer(async(req,res)=>{
 let u;try{u=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`)}catch{return reply(res,400,{error:'Invalid URL'})}
 try{
  if(req.method==='GET'&&u.pathname==='/health')return reply(res,200,{status:'ok',rooms:rooms.size,players:actors.size});
  if(req.method==='POST'&&u.pathname==='/api/start'){
    const body=await readBody(req);const role=body.role;if(!['pc','mobile'].includes(role))error('Choose PC or Mobile.');
    let r;if(body.code){r=rooms.get(safeText(body.code,12).toUpperCase());if(!r)error('Pairing code not found.',404);}else{r=newRoom();}
    if(r[role])error('A device already has that role in this room.',409);
    const token=id();const a={token,role,code:r.code,stream:null};actors.set(token,a);r[role]=token;
    log(r,'CONNECTED',`${role.toUpperCase()} joined SKYLOCK`);reply(res,200,{ok:true,token,role,room:publicRoom(r)});publish(r,'state',publicRoom(r));return;
  }
  if(req.method==='GET'&&u.pathname==='/api/state'){
    const a=actor(u.searchParams.get('token'));return reply(res,200,{ok:true,role:a.role,room:publicRoom(roomFor(a))});
  }
  if(req.method==='POST'&&u.pathname==='/api/action'){
    const body=await readBody(req);const a=actor(body.token);const out=handleAction(a,body);return reply(res,200,{ok:true,...out});
  }
  if(req.method==='POST'&&u.pathname==='/api/leave'){
    const body=await readBody(req);closeActor(actor(body.token));return reply(res,200,{ok:true});
  }
  if(req.method==='GET'&&u.pathname==='/api/events'){
    const a=actor(u.searchParams.get('token'));
    if(a.stream&&!a.stream.destroyed)a.stream.end();
    res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-cache, no-transform','connection':'keep-alive','x-accel-buffering':'no'});
    a.stream=res;res.write(': connected\n\n');send(a,'state',publicRoom(roomFor(a)));
    const ping=setInterval(()=>{if(!res.destroyed)res.write(': keepalive\n\n');},16000);
    res.on('close',()=>{clearInterval(ping);if(a.stream===res)a.stream=null;});return;
  }
  if(req.method==='GET')return serve(decodeURIComponent(u.pathname),res);
  reply(res,405,{error:'Method not allowed'});
 }catch(e){if(!res.headersSent)reply(res,e.status||500,{ok:false,error:e.message||'Server error'});}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`SKYLOCK fictional game listening at http://localhost:${PORT}`));
