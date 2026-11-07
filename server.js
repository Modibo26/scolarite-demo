// Serveur : node server.js  (Node 18+, aucune dépendance)
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const DIR=process.env.DATA_DIR||__dirname;fs.mkdirSync(DIR,{recursive:true});
const F=path.join(DIR,'data.json'),BK=path.join(DIR,'backups'),PORT=process.env.PORT||3000;
const dy=()=>{const d=new Date(),y=d.getMonth()>=7?d.getFullYear():d.getFullYear()-1;return y+'-'+(y+1)};
const newYear=(nom,from)=>{const c=from?JSON.parse(JSON.stringify(from)):null;return{config:c?{...c.config,annee:nom}:{nom:'',annee:nom,type:'classique',noteSur:20,seuil:10,periodes:[],categories:[{nom:'Devoirs',poids:50},{nom:'Examen',poids:50}],logo:''},classes:c?c.classes:[],eleves:[],affectations:c?c.affectations:[],notes:{},closed:[],extra:{}}};
let D=fs.existsSync(F)?JSON.parse(fs.readFileSync(F)):{years:{},current:'',users:[],log:[]};
if(D.config){const k=D.config.annee||dy();D.years={[k]:{config:D.config,classes:D.classes,eleves:D.eleves,affectations:D.affectations,notes:D.notes,closed:[],extra:{}}};D.current=k;D.log=[];['config','classes','eleves','affectations','notes'].forEach(x=>delete D[x])}
const save=()=>{if(fs.existsSync(F)){fs.mkdirSync(BK,{recursive:true});const p=path.join(BK,new Date().toISOString().slice(0,10)+'.json');if(!fs.existsSync(p)){fs.copyFileSync(F,p);const l=fs.readdirSync(BK).filter(x=>x.endsWith('.json')).sort();l.slice(0,Math.max(0,l.length-60)).forEach(x=>fs.unlinkSync(path.join(BK,x)))}}fs.writeFileSync(F+'.tmp',JSON.stringify(D));fs.renameSync(F+'.tmp',F)};
if(!D.created){D.created=Date.now();save()}
/* --- licence signée (Ed25519) : essai 30 jours, avertissement 30 jours avant, grâce 15 jours, puis lecture seule --- */
const LF=path.join(DIR,'license.json');
const PUB=(()=>{try{if(process.env.LICENSE_PUBKEY)return process.env.LICENSE_PUBKEY;const p=[path.join(DIR,'license.pub'),path.join(__dirname,'license.pub')].find(x=>fs.existsSync(x));return p?fs.readFileSync(p,'utf8'):null}catch(e){return null}})();
if(!PUB)console.log('⚠ license.pub absent : licences désactivées (mode illimité)');
const canon=l=>[l.school,l.expires,l.max||0,l.issued].join('|');
const lverify=l=>{try{return!!PUB&&crypto.verify(null,Buffer.from(canon(l)),PUB,Buffer.from(l.sig,'base64'))}catch(e){return false}};
const lread=()=>{try{const l=JSON.parse(fs.readFileSync(LF,'utf8'));return lverify(l)?l:null}catch(e){return null}};
const licInfo=()=>{if(!PUB)return{status:'off',days:null,max:0};const l=lread(),day=864e5;
 if(!l){const left=Math.ceil((D.created+30*day-Date.now())/day);return{status:left>0?'trial':'expired',days:Math.max(left,0),readonly:left<=0,max:0}}
 const left=Math.ceil((Date.parse(l.expires+'T23:59:59Z')-Date.now())/day),st=left>30?'ok':left>0?'warn':left>-15?'grace':'expired';
 return{status:st,days:left,school:l.school,expires:l.expires,max:l.max||0,readonly:st==='expired'}};
const pl=()=>{if(process.env.DEMO)return{status:'demo'};const i=licInfo();return{status:i.status,days:i.days,school:i.school,expires:i.expires,max:i.max}};
const tokens=new Map(),attempts={};
const hash=(p,s)=>crypto.scryptSync(p,s,32).toString('hex');
const setPw=(u,p)=>{u.salt=crypto.randomBytes(8).toString('hex');u.hash=hash(p,u.salt)};
const mkUser=(nom,login,pass,role)=>{const u={id:crypto.randomUUID(),nom,login,role,mc:false};setPw(u,pass);return u};
const weak=(p='',l='')=>{const m=[];if(p.length<8)m.push('8 caractères minimum');if(!/[A-Z]/.test(p))m.push('une majuscule');if(!/[a-z]/.test(p))m.push('une minuscule');if(!/\d/.test(p))m.push('un chiffre');if(!/[^A-Za-z0-9\s]/.test(p))m.push('un caractère spécial');if(/\s/.test(p))m.push('aucun espace');if(l.length>=3&&p.toLowerCase().includes(l.toLowerCase()))m.push('sans le nom d\'utilisateur');return m.length?'Mot de passe trop faible. Exigé : '+m.join(', '):null};
const SEC={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'"};
const audit=(u,a,d)=>{D.log.push({t:Date.now(),u,y:D.current,a,d});if(D.log.length>5000)D.log.shift()};
const send=(r,c,o)=>{r.writeHead(c,{'Content-Type':'application/json',...SEC});r.end(JSON.stringify(o))};
const login=(u,res)=>{const t=crypto.randomBytes(24).toString('hex');tokens.set(t,{id:u.id,exp:Date.now()+12*36e5});send(res,200,{token:t})};
const STATIC={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/script.js':'script.js','/manifest.json':'manifest.json','/sw.js':'sw.js','/icon.svg':'icon.svg'};
{const miss=[...new Set(Object.values(STATIC))].filter(f=>!fs.existsSync(path.join(__dirname,f)));if(miss.length)console.error('⚠ FICHIERS MANQUANTS dans le dossier de l\'application : '+miss.join(', ')+' — envoyez-les sur GitHub à la racine du dépôt.')}
process.on('uncaughtException',e=>console.error('Erreur inattendue (le serveur continue) :',e&&e.message));
const MIME={html:'text/html',css:'text/css',js:'text/javascript',json:'application/json',svg:'image/svg+xml'};
/* --- mode démonstration (DEMO=1) : école fictive recréée à chaque démarrage si la base est vide --- */
if(process.env.DEMO&&!D.users.length){(()=>{
 let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647,cl20=x=>Math.max(0,Math.min(20,Math.round(x*4)/4));
 const yk=dy(),y=newYear(yk),P=['1er Trimestre','2ème Trimestre','3ème Trimestre'];
 Object.assign(y.config,{nom:'Complexe Scolaire Démo',sigle:'CSD',devise:'Travail – Discipline – Réussite',periodes:P,mentions:[10,12,14,16]});
 const mats=[['Mathématiques',4],['Français',4],['Anglais',2],['SVT',2],['Histoire-Géographie',2]];
 y.classes=[['c6a','6ème A'],['c5b','5ème B']].map(([id,nom])=>({id,nom,filiere:'',matieres:mats.map(([n,c],i)=>({id:id+'-m'+(i+1),nom:n,ar:'',coef:c}))}));
 const E=[['c6a','DIALLO','Aly','M'],['c6a','TRAORE','Fanta','F'],['c6a','KEITA','Moussa','M'],['c6a','COULIBALY','Awa','F'],['c6a','SIDIBE','Ibrahim','M'],['c6a','DEMBELE','Mariam','F'],['c6a','TOURE','Oumar','M'],['c6a','CAMARA','Kadiatou','F'],['c5b','BAGAYOKO','Seydou','M'],['c5b','DOUMBIA','Aminata','F'],['c5b','KONE','Bakary','M'],['c5b','SANOGO','Salimata','F'],['c5b','MAIGA','Adama','M'],['c5b','DRAME','Hawa','F']];
 y.eleves=E.map(([c,n,p,s],i)=>({id:'e'+(i+1),classeId:c,matricule:'M'+String(i+1).padStart(3,'0'),nom:n,prenom:p,sexe:s,naissance:'',parent:'Parent de '+p,tel:'+2237000'+(1000+i)}));
 for(const e of y.eleves){const lvl=6+rnd()*10,c=y.classes.find(x=>x.id===e.classeId);
  for(const m of c.matieres)P.slice(0,2).forEach((per,pi)=>{y.notes[[e.id,m.id,per,'Devoirs'].join('|')]=cl20(lvl+(rnd()-.5)*6);if(pi===0||rnd()<.3)y.notes[[e.id,m.id,per,'Examen'].join('|')]=cl20(lvl+(rnd()-.5)*8)})}
 y.abs={'2026-10-05':{e1:'A',e2:'R'},'2026-10-12':{e1:'R',e5:'A'}};y.extra={'e1|1er Trimestre':{appr:'Élève sérieux : continuez ainsi.'}};y.published=['1er Trimestre'];
 y.affectations=[{profId:'u-pm',classeId:'c6a',matId:'c6a-m1'},{profId:'u-pm',classeId:'c5b',matId:'c5b-m1'},{profId:'u-pf',classeId:'c6a',matId:'c6a-m2'},{profId:'u-pf',classeId:'c5b',matId:'c5b-m2'}];
 const U=(id,nom,login,pw,role,mats)=>{const u=mkUser(nom,login,pw,role);u.id=id;if(mats)u.mats=mats;return u};
 D.users=[U('u-dir','Directeur Démo','directeur','Demo#Admin2026','admin'),U('u-pm','Prof Mathématiques','prof.maths','Demo#Prof2026','prof'),U('u-pf','Prof Français','prof.francais','Demo#Prof2026','prof'),U('u-par','Parent de Aly Diallo','parent.diallo','Demo#Parent2026','parent',['M001'])];
 D.years={[yk]:y};D.current=yk;audit('Système','Mode démonstration initialisé');save();console.log('Mode démonstration : école fictive créée')})()}
http.createServer((req,res)=>{
 const url=req.url.split('?')[0];
 if(process.env.TRUST_PROXY&&req.headers['x-forwarded-proto']==='https')res.setHeader('Strict-Transport-Security','max-age=31536000');
 if(url==='/diagnostic'&&(process.env.DEMO||process.env.DIAG)){let w='non';try{const t=path.join(DIR,'.test');fs.writeFileSync(t,'1');fs.unlinkSync(t);w='OK'}catch(e){w='ÉCHEC : '+e.message}
  const fl=[...new Set(Object.values(STATIC))],txt=['DIAGNOSTIC DE L\'APPLICATION','','Node : '+process.version,'Mode démonstration : '+(process.env.DEMO?'oui':'non'),'Dossier de l\'application : '+__dirname,'','Fichiers requis :',...fl.map(f=>(fs.existsSync(path.join(__dirname,f))?'  [OK]       ':'  [MANQUANT] ')+f),'','Dossier des données : '+DIR+' (écriture : '+w+')','Comptes : '+D.users.length+' | Années : '+Object.keys(D.years).length,'','Si un fichier est [MANQUANT] : envoyez-le sur GitHub à la racine du dépôt.'].join('\n');
  res.writeHead(200,{'Content-Type':'text/plain;charset=utf-8','Cache-Control':'no-store'});return res.end(txt)}
 if(!url.startsWith('/api/')){const f=STATIC[url];if(!f){res.writeHead(404);return res.end()}let body;try{body=fs.readFileSync(path.join(__dirname,f))}catch(e){console.error('Fichier manquant sur le serveur : '+f);res.writeHead(404,{'Content-Type':'text/plain;charset=utf-8'});return res.end('Fichier manquant : '+f)}res.writeHead(200,{'Content-Type':MIME[f.split('.').pop()]+';charset=utf-8','Cache-Control':'no-store',...SEC});return res.end(body)}
 let b='';req.on('data',c=>{b+=c;if(b.length>2e7)req.destroy()});
 req.on('end',()=>{try{
  const B=b?JSON.parse(b):{},ep=url.slice(5).split('/'),q=new URLSearchParams(req.url.split('?')[1]||''),yk=q.get('y')||D.current,Y=D.years[yk];
  const tkn=(req.headers.authorization||'').slice(7),tk=tokens.get(tkn);
  const me=tk&&tk.exp>Date.now()?D.users.find(u=>u.id===tk.id):null;
  const adm=me&&me.role==='admin',ok=()=>send(res,200,{ok:1});
  if(ep[0]==='status')return send(res,200,{setup:!D.users.length,demo:!!process.env.DEMO});
  if(ep[0]==='setup'&&!D.users.length){if(!B.nom||!B.login)return send(res,400,{error:'Nom et utilisateur requis'});{const w=weak(B.pass,B.login);if(w)return send(res,400,{error:w})}const u=mkUser(B.nom,B.login,B.pass,'admin');D.users.push(u);if(!Object.keys(D.years).length){D.current=dy();D.years[D.current]=newYear(D.current)}save();return login(u,res)}
  if(ep[0]==='login'){const ra=req.socket.remoteAddress||'',fw=process.env.TRUST_PROXY?(req.headers['x-forwarded-for']||'').split(',')[0].trim():'',k=fw||/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ra)&&req.headers['cf-connecting-ip']||ra,a=attempts[k]||{n:0,t:0};if(a.n>=5&&Date.now()-a.t<9e5)return send(res,429,{error:'Trop de tentatives. Réessayez dans 15 minutes.'});const u=D.users.find(x=>x.login===B.login);if(!u||hash(B.pass||'',u.salt)!==u.hash){attempts[k]={n:a.n+1,t:Date.now()};return send(res,401,{error:'Identifiants incorrects'})}delete attempts[k];if(weak(B.pass||'',u.login)){u.mc=true;save()}audit(u.nom,'Connexion');return login(u,res)}
  if(!me)return send(res,401,{error:'Connexion requise'});
  if(ep[0]==='logout'){tokens.delete(tkn);return ok()}
  if(ep[0]==='password'){if(hash(B.old||'',me.salt)!==me.hash)return send(res,400,{error:'Mot de passe actuel incorrect'});{const w=weak(B.pass,me.login);if(w)return send(res,400,{error:w})}setPw(me,B.pass);me.mc=false;save();return ok()}
  if(['note','eleves','abs','data','years','rename','users','restore'].includes(ep[0])&&req.method!=='GET'&&licInfo().readonly)return send(res,402,{error:'Licence expirée : l\'application est en lecture seule. Contactez votre fournisseur pour la renouveler.'});
  if(!Y)return send(res,404,{error:'Année introuvable'});
  if(ep[0]==='state'){
   const o={me:{id:me.id,nom:me.nom,role:me.role,mc:!!me.mc},config:Y.config,lic:pl(),now:Date.now(),rev:Y.rev||0,year:yk,years:Object.keys(D.years).sort().reverse(),closed:Y.closed||[],published:Y.published||[]};
   if(adm)Object.assign(o,{classes:Y.classes,eleves:Y.eleves,affectations:Y.affectations,notes:Y.notes,extra:Y.extra||{},abs:Y.abs||{},users:D.users.map(({id,nom,login,role,mc,mats})=>({id,nom,login,role,mc,mats}))});
   else if(me.role==='parent'){const ms=me.mats||[],el=Y.eleves.filter(e=>ms.includes(e.matricule)),ids=el.map(e=>e.id),pub=Y.published||[],cl=[...new Set(el.map(e=>e.classeId))];
    o.eleves=el.map(({id,classeId,matricule,nom,prenom,sexe})=>({id,classeId,matricule,nom,prenom,sexe}));o.classes=Y.classes.filter(c=>cl.includes(c.id));o.affectations=[];
    o.notes=Object.fromEntries(Object.entries(Y.notes).filter(([k])=>{const p=k.split('|');return ids.includes(p[0])&&pub.includes(p[2])}));
    o.extra=Object.fromEntries(Object.entries(Y.extra||{}).filter(([k])=>{const p=k.split('|');return ids.includes(p[0])&&pub.includes(p[1])}));
    o.abs=Object.fromEntries(Object.entries(Y.abs||{}).map(([d,m])=>[d,Object.fromEntries(Object.entries(m).filter(([i])=>ids.includes(i)))]).filter(([,m])=>Object.keys(m).length))}
   else{const af=Y.affectations.filter(a=>a.profId===me.id),cl=[...new Set(af.map(a=>a.classeId))],ms=af.map(a=>a.matId);
    o.affectations=af;o.classes=Y.classes.filter(c=>cl.includes(c.id)).map(c=>({...c,matieres:c.matieres.filter(m=>af.some(a=>a.classeId===c.id&&a.matId===m.id))}));
    o.eleves=Y.eleves.filter(e=>cl.includes(e.classeId));{const pid=o.eleves.map(e=>e.id);o.abs=Object.fromEntries(Object.entries(Y.abs||{}).map(([d,m])=>[d,Object.fromEntries(Object.entries(m).filter(([i])=>pid.includes(i)))]).filter(([,m])=>Object.keys(m).length))}o.notes=Object.fromEntries(Object.entries(Y.notes).filter(([k])=>ms.includes(k.split('|')[1])))}
   return send(res,200,o)}
  if(ep[0]==='note'){const e=Y.eleves.find(x=>x.id===B.eleveId);if(!e)return send(res,404,{error:'Élève inconnu'});
   if(!adm&&!Y.affectations.some(a=>a.profId===me.id&&a.classeId===e.classeId&&a.matId===B.matId))return send(res,403,{error:'Cette matière ne vous est pas affectée'});
   if(!adm&&(Y.closed||[]).includes(B.periode))return send(res,403,{error:'Cette période est clôturée'});
   const v=B.value===''||B.value==null?null:Number(B.value);if(v!==null&&(isNaN(v)||v<0||v>Y.config.noteSur))return send(res,400,{error:'Note invalide : entre 0 et '+Y.config.noteSur});
   const k=[B.eleveId,B.matId,B.periode,B.cat].join('|');D.log.push({t:Date.now(),u:me.nom,y:yk,e:B.eleveId,m:B.matId,p:B.periode,c:B.cat,o:Y.notes[k]??null,n:v});if(D.log.length>5000)D.log.shift();
   if(v===null)delete Y.notes[k];else Y.notes[k]=v;save();return ok()}
  if(ep[0]==='eleves'){const cid=B.classeId;{const li=licInfo();if(li.max&&Y.eleves.length+(Array.isArray(B.list)?B.list.length:0)>li.max)return send(res,402,{error:'Limite de '+li.max+' élèves atteinte pour cette licence'})}if(!Y.classes.some(x=>x.id===cid))return send(res,404,{error:'Classe introuvable'});
   if(!adm&&!Y.affectations.some(a=>a.profId===me.id&&a.classeId===cid))return send(res,403,{error:'Cette classe ne vous est pas affectée'});
   let n=0,sk=0;for(const e of(Array.isArray(B.list)?B.list:[]).slice(0,500)){const nom=String(e.nom||'').trim().toUpperCase().slice(0,60),mat=String(e.matricule||'').trim().slice(0,30);
    if(!nom||(mat&&Y.eleves.some(x=>x.classeId===cid&&x.matricule===mat))){sk++;continue}
    Y.eleves.push({id:crypto.randomUUID().slice(0,8),classeId:cid,matricule:mat,nom,prenom:String(e.prenom||'').trim().slice(0,60),sexe:e.sexe==='F'?'F':'M',naissance:String(e.naissance||'').slice(0,10),parent:String(e.parent||'').trim().slice(0,80),tel:String(e.tel||'').trim().slice(0,30),t:Date.now()});n++}
   if(n){audit(me.nom,'Ajout de '+n+' élève(s)',(Y.classes.find(x=>x.id===cid)||{}).nom);save()}return send(res,200,{added:n,skipped:sk})}
  if(ep[0]==='abs'){const cid=B.classeId,d=String(B.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Y.classes.some(x=>x.id===cid))return send(res,400,{error:'Date ou classe invalide'});
   if(!adm&&!Y.affectations.some(a=>a.profId===me.id&&a.classeId===cid))return send(res,403,{error:'Cette classe ne vous est pas affectée'});
   const ids=Y.eleves.filter(e=>e.classeId===cid).map(e=>e.id);Y.abs=Y.abs||{};const day=Y.abs[d]=Y.abs[d]||{};
   for(const i of ids){const x=(B.marks||{})[i];if(x==='A'||x==='R')day[i]=x;else if(x==='')delete day[i]}if(!Object.keys(day).length)delete Y.abs[d];save();return ok()}
  if(!adm)return send(res,403,{error:'Réservé à l\'administrateur'});
  if(ep[0]==='license'&&req.method==='POST'){if(!B||!B.sig||!lverify(B))return send(res,400,{error:'Licence invalide ou non signée par votre fournisseur'});
   if(Date.parse(B.expires+'T23:59:59Z')<Date.now())return send(res,400,{error:'Cette licence est déjà expirée'});
   fs.writeFileSync(LF,JSON.stringify(B));audit(me.nom,'Licence activée',B.school+' jusqu\'au '+B.expires);save();return send(res,200,{ok:1,lic:pl()})}
  if(ep[0]==='data'){if(B.rev!==undefined&&B.rev!==(Y.rev||0))return send(res,409,{error:'Les données ont été modifiées par un autre administrateur. Rechargement : refaites votre modification.'});const pe=Y.eleves.length,pc=Y.classes.length;let ny=null;if(Array.isArray(B.eleves)){const keep=Y.eleves.filter(e=>e.t&&e.t>(B.since||0)&&!B.eleves.some(x=>x.id===e.id));B.eleves=[...B.eleves,...keep]}const na=((B.config||{}).annee||'').trim();if(na&&na!==yk&&!D.years[na]){D.years[na]=Y;delete D.years[yk];if(D.current===yk)D.current=na;ny=na}for(const k of['config','classes','eleves','affectations','closed','published','extra'])if(B[k]!==undefined)Y[k]=B[k];Y.config.annee=ny||yk;const ids=new Set(Y.eleves.map(e=>e.id));for(const k in Y.notes)if(!ids.has(k.split('|')[0]))delete Y.notes[k];Y.rev=(Y.rev||0)+1;if(pe!==Y.eleves.length||pc!==Y.classes.length)audit(me.nom,'Modification des données','élèves '+pe+' → '+Y.eleves.length+', classes '+pc+' → '+Y.classes.length);save();return send(res,200,{ok:1,rev:Y.rev,...(ny?{year:ny,old:yk}:{})})}
  if(ep[0]==='years'){const nom=(B.nom||'').trim();if(!nom||D.years[nom])return send(res,400,{error:'Nom vide ou année déjà existante'});D.years[nom]=newYear(nom,B.copy&&D.years[B.copy]);D.current=nom;save();return ok()}
  if(ep[0]==='rename'){const{type,from,to}=B,t=String(to||'').trim().replace(/\|/g,'');if(!t||!from)return send(res,400,{error:'Nom vide'});
   const list=type==='periode'?Y.config.periodes:Y.config.categories.map(k=>k.nom);if(!list.includes(from)||(list.includes(t)&&t!==from))return send(res,400,{error:'Nom introuvable ou déjà utilisé'});
   const i=type==='periode'?2:3,nn={};for(const k in Y.notes){const p=k.split('|');if(p[i]===from)p[i]=t;nn[p.join('|')]=Y.notes[k]}Y.notes=nn;
   if(type==='periode'){Y.config.periodes=Y.config.periodes.map(x=>x===from?t:x);Y.closed=(Y.closed||[]).map(x=>x===from?t:x);Y.published=(Y.published||[]).map(x=>x===from?t:x);const ex={};for(const k in Y.extra){const p=k.split('|');if(p[1]===from)p[1]=t;ex[p.join('|')]=Y.extra[k]}Y.extra=ex}
   else Y.config.categories.forEach(k=>{if(k.nom===from)k.nom=t});
   Y.rev=(Y.rev||0)+1;audit(me.nom,'Renommage ('+type+')',from+' → '+t);save();return send(res,200,{ok:1})}
  if(ep[0]==='backup')return send(res,200,D);
  if(ep[0]==='restore'){if(!B.years||!B.users||!B.users.some(u=>u.role==='admin'))return send(res,400,{error:'Sauvegarde invalide'});D=B;D.log=D.log||[];save();return ok()}
  if(ep[0]==='log')return send(res,200,D.log.filter(l=>l.a||l.y===yk).slice(-200).reverse());
  if(ep[0]==='users'&&ep[2]==='reset'){const u=D.users.find(x=>x.id===ep[1]);if(!u)return send(res,404,{error:'Compte introuvable'});{const w=weak(B.pass,u.login);if(w)return send(res,400,{error:w})}setPw(u,B.pass);u.mc=true;save();return ok()}
  if(ep[0]==='users'&&req.method==='POST'){if(!B.nom||!B.login)return send(res,400,{error:'Nom et utilisateur requis'});{const w=weak(B.pass,B.login);if(w)return send(res,400,{error:w})}if(D.users.some(u=>u.login===B.login))return send(res,400,{error:'Ce nom d\'utilisateur existe déjà'});const rl=['admin','parent'].includes(B.role)?B.role:'prof',mats=String(B.mats||'').split(/[;,]+/).map(x=>x.trim()).filter(Boolean);if(rl==='parent'&&!mats.length)return send(res,400,{error:'Indiquez le matricule de l\'enfant'});const nu=mkUser(B.nom,B.login,B.pass,rl);if(rl==='parent')nu.mats=mats;nu.mc=true;D.users.push(nu);save();return ok()}
  if(ep[0]==='users'&&req.method==='DELETE'){if(ep[1]===me.id)return send(res,400,{error:'Vous ne pouvez pas supprimer votre propre compte'});D.users=D.users.filter(u=>u.id!==ep[1]);for(const y in D.years)D.years[y].affectations=D.years[y].affectations.filter(a=>a.profId!==ep[1]);save();return ok()}
  send(res,404,{error:'Introuvable'})
 }catch(e){send(res,400,{error:'Requête invalide'})}})
}).listen(PORT,()=>{console.log('Sur cet ordinateur : http://localhost:'+PORT);
 for(const l of Object.values(require('os').networkInterfaces()))for(const i of l)if(i.family==='IPv4'&&!i.internal)console.log('Sur le téléphone (même Wi-Fi) : http://'+i.address+':'+PORT)});
