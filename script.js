const $=id=>document.getElementById(id),uid=()=>Math.random().toString(36).slice(2,10);
const opts=(a,f)=>a.map(f).join('');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let S={},T=localStorage.getItem('tk'),setup=false,selClasse=null;
const PRESETS=[['Mathématiques','الرياضيات',4],['Français','اللغة الفرنسية',4],['Anglais','اللغة الإنجليزية',2],['Sciences Physiques','العلوم الفيزيائية',3],['SVT','علوم الحياة والأرض',2],['Histoire-Géographie','التاريخ والجغرافيا',2],['Éducation Civique','التربية المدنية',1],['Arabe','اللغة العربية',3],['Éducation Islamique','التربية الإسلامية',2],['EPS','التربية البدنية',1],['Informatique','الإعلامية',1]];
const adm=()=>S.me&&S.me.role==='admin';
const fmt=v=>v==null?'—':v.toFixed(2);
const byName=(a,b)=>(a.nom+a.prenom).localeCompare(b.nom+b.prenom);
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
/* ---------- Authentification ---------- */
function showAuth(){document.body.classList.add('locked');
 $('authTitle').textContent=setup?'Créer le compte administrateur':'Connexion';
 $('aNomF').style.display=setup?'':'none';$('aBtn').textContent=setup?'Créer le compte':'Se connecter';
 $('aHint').textContent=setup?'Premier lancement : ce compte aura tous les droits.':'Accès réservé au personnel autorisé.'}
$('authForm').addEventListener('submit',async e=>{e.preventDefault();T=null;
 try{const j=await api(setup?'setup':'login','POST',{nom:$('aNom').value.trim(),login:$('aLogin').value.trim(),pass:$('aPass').value});
  T=j.token;localStorage.setItem('tk',T);$('aPass').value='';setup=false;await load()}catch(x){}});
async function refresh(){S=await api('state');renderAll()}
function showTab(t){document.querySelectorAll('.tabpanel').forEach(s=>s.style.display=s.id==='tab-'+t?'':'none');
 document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));
 if(t==='bulletins')renderClassement();if(t==='stats')renderStats()}
document.querySelectorAll('nav.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
/* ---------- Rendu général ---------- */
function renderAll(){const c=S.config;
 $('headerSchoolName').textContent=c.nom||'Gestion de Scolarité';
 $('headerYear').textContent=c.annee?'Année scolaire '+c.annee:'Configurez votre établissement dans l\'onglet "Configuration"';
 $('sealBadge').innerHTML=c.logo?`<img src="${c.logo}" alt="">`:esc((c.nom||'EC').split(/\s+/).map(w=>w[0]).join('').slice(0,3).toUpperCase());
 const ar=c.type==='franco-arabe';document.querySelectorAll('.arabe-only').forEach(e=>e.style.display=ar?'':'none');$('arColHead').style.display=ar?'':'none';
 if(adm()){renderConfig();renderClasses();renderEleves();renderUsers()}
 fillSelects();renderSaisieNotes()}
function fillSelects(){
 const co=opts(S.classes,c=>`<option value="${c.id}">${esc(c.nom)}</option>`),po=opts(S.config.periodes,p=>`<option>${esc(p)}</option>`);
 const keep=(id,h)=>{const e=$(id),v=e.value;e.innerHTML=h;if([...e.options].some(o=>o.value===v))e.value=v};
 ['elClasse','noteClasse','resClasse'].forEach(i=>keep(i,co));
 keep('elFiltreClasse','<option value="">Toutes les classes</option>'+co);
 keep('statClasse','<option value="">Toutes les classes (vue d\'ensemble)</option>'+co);
 ['notePeriode','resPeriode','statPeriode'].forEach(i=>keep(i,po));
 $('noteMatiere').dataset.c='';if(adm())fillAf()}
/* ---------- Configuration ---------- */
function renderConfig(){const c=S.config;
 $('cfgNomEcole').value=c.nom;$('cfgAnnee').value=c.annee;$('cfgType').value=c.type;$('cfgNoteSur').value=c.noteSur;$('cfgSeuil').value=c.seuil;
 $('periodesList').innerHTML=c.periodes.map((p,i)=>`<span class="pill">${esc(p)}<button onclick="delPeriode(${i})" aria-label="Retirer">✕</button></span>`).join('')||'<span class="empty">Aucune période</span>';
 $('catTable').querySelector('tbody').innerHTML=c.categories.map((k,i)=>`<tr><td>${esc(k.nom)}</td><td>${k.poids}</td><td><button class="btn red small" onclick="delCat(${i})">✕</button></td></tr>`).join('');
 const t=c.categories.reduce((a,k)=>a+k.poids,0);$('catSum').innerHTML=`Total : <b class="${t===100?'ok':'ko'}">${t}%</b>`;
 $('logoPreview').className='logo-preview'+(c.logo?'':' empty');$('logoPreview').innerHTML=c.logo?`<img src="${c.logo}" alt="">`:'Aucun sigle'}
function addPeriode(){const v=$('newPeriode').value.trim();if(!v)return;S.config.periodes.push(v);$('newPeriode').value='';upd()}
function quickPeriodes(n){S.config.periodes=n===3?['1er Trimestre','2ème Trimestre','3ème Trimestre']:['1er Semestre','2ème Semestre'];upd()}
function delPeriode(i){S.config.periodes.splice(i,1);upd()}
function addCategorie(){const n=$('newCatNom').value.trim(),p=+$('newCatPoids').value;if(!n||!(p>0))return;S.config.categories.push({nom:n,poids:p});$('newCatNom').value='';upd()}
function delCat(i){S.config.categories.splice(i,1);upd()}
function quickComposition(k){S.config.categories={de:[['Devoirs',50],['Examen',50]],ide:[['Interrogation',20],['Devoirs',30],['Examen',50]],u:[['Note',100]]}[k].map(([nom,poids])=>({nom,poids}));upd()}
function handleLogoUpload(f){if(!f)return;if(f.size>1.5e6)return toast('Image trop lourde (1,5 Mo maximum)');const r=new FileReader();r.onload=()=>{S.config.logo=r.result;upd()};r.readAsDataURL(f)}
function removeLogo(){S.config.logo='';upd()}
/* ---------- Classes & matières ---------- */
function addClasse(){const n=$('newClasseNom').value.trim();if(!n)return;const c={id:uid(),nom:n,filiere:$('newClasseFiliere').value.trim(),matieres:[]};S.classes.push(c);selClasse=c.id;$('newClasseNom').value='';$('newClasseFiliere').value='';upd()}
function selectClasse(id){selClasse=id;renderClasses()}
function delClasse(id){if(!confirm('Supprimer cette classe, ses élèves et leurs notes ?'))return;S.classes=S.classes.filter(c=>c.id!==id);S.eleves=S.eleves.filter(e=>e.classeId!==id);S.affectations=S.affectations.filter(a=>a.classeId!==id);if(selClasse===id)selClasse=null;upd()}
function renderClasses(){
 $('classesList').className=S.classes.length?'pill-list':'empty';
 $('classesList').innerHTML=S.classes.length?S.classes.map(c=>`<span class="pill ${c.id===selClasse?'sel':''}"><a href="#" onclick="selectClasse('${c.id}');return false" style="color:inherit;text-decoration:none">${esc(c.nom)}${c.filiere?' — '+esc(c.filiere):''}</a><button onclick="delClasse('${c.id}')" aria-label="Supprimer">✕</button></span>`).join(''):'Aucune classe créée pour le moment.';
 const c=S.classes.find(x=>x.id===selClasse);$('matieresCard').style.display=c?'':'none';if(!c)return;
 $('matieresClasseNom').textContent=c.nom;
 $('matierePreset').innerHTML='<option value="">— choisir dans la liste —</option>'+PRESETS.map((p,i)=>`<option value="${i}">${p[0]}</option>`).join('');
 const ar=S.config.type==='franco-arabe';
 $('matieresTbody').innerHTML=c.matieres.map(m=>`<tr><td>${esc(m.nom)}</td>${ar?`<td class="ar">${esc(m.ar)}</td>`:''}<td>${m.coef}</td><td><button class="btn red small" onclick="delMatiere('${m.id}')">✕</button></td></tr>`).join('')}
function applyMatierePreset(i){const p=PRESETS[i];if(!p)return;$('newMatNom').value=p[0];$('newMatAr').value=p[1];$('newMatCoef').value=p[2]}
function addMatiere(){const c=S.classes.find(x=>x.id===selClasse),n=$('newMatNom').value.trim();if(!c||!n)return;c.matieres.push({id:uid(),nom:n,ar:$('newMatAr').value.trim(),coef:+$('newMatCoef').value||1});['newMatNom','newMatAr'].forEach(i=>$(i).value='');upd()}
function delMatiere(id){const c=S.classes.find(x=>x.id===selClasse);c.matieres=c.matieres.filter(m=>m.id!==id);S.affectations=S.affectations.filter(a=>a.matId!==id);upd()}
/* ---------- Élèves ---------- */
function delEleve(id){if(confirm('Supprimer cet élève et ses notes ?')){S.eleves=S.eleves.filter(e=>e.id!==id);upd()}}
/* ---------- Comptes & affectations (admin) ---------- */
function renderUsers(){
 $('usersList').innerHTML=`<table><thead><tr><th>Nom</th><th>Utilisateur</th><th>Rôle</th><th></th></tr></thead><tbody>${S.users.map(u=>`<tr><td>${esc(u.nom)}</td><td>${esc(u.login)}</td><td>${({admin:'Administrateur',parent:'Parent / élève'}[u.role]||'Professeur')}</td><td>${u.id===S.me.id?'':`<button class="btn red small" onclick="delUser('${u.id}')">✕</button>`}</td></tr>`).join('')}</tbody></table>`;
 const un=id=>(S.users.find(u=>u.id===id)||{}).nom;
 $('affList').innerHTML=S.affectations.length?`<table><thead><tr><th>Professeur</th><th>Classe</th><th>Matière</th><th></th></tr></thead><tbody>${S.affectations.map((a,i)=>{const c=S.classes.find(x=>x.id===a.classeId)||{matieres:[]},m=c.matieres.find(x=>x.id===a.matId)||{};return`<tr><td>${esc(un(a.profId))}</td><td>${esc(c.nom)}</td><td>${esc(m.nom)}</td><td><button class="btn red small" onclick="delAff(${i})">✕</button></td></tr>`}).join('')}</tbody></table>`:'<p class="empty">Aucune affectation.</p>'}
async function delUser(id){if(!confirm('Supprimer ce compte ?'))return;try{await api('users/'+id,'DELETE');await refresh()}catch(x){}}
function fillAf(){$('afProf').innerHTML=opts(S.users.filter(u=>u.role==='prof'),u=>`<option value="${u.id}">${esc(u.nom)}</option>`);$('afClasse').innerHTML=opts(S.classes,c=>`<option value="${c.id}">${esc(c.nom)}</option>`);fillAfMat()}
function fillAfMat(){const c=S.classes.find(x=>x.id===$('afClasse').value);$('afMat').innerHTML=c?opts(c.matieres,m=>`<option value="${m.id}">${esc(m.nom)}</option>`):''}
function addAffectation(){const a={profId:$('afProf').value,classeId:$('afClasse').value,matId:$('afMat').value};if(!a.profId||!a.classeId||!a.matId)return toast('Choisissez un professeur, une classe et une matière');if(S.affectations.some(x=>x.profId===a.profId&&x.classeId===a.classeId&&x.matId===a.matId))return;S.affectations.push(a);upd()}
function delAff(i){S.affectations.splice(i,1);upd()}
/* ---------- Calculs ---------- */
function moyMat(eid,mid,per){let s=0,w=0;S.config.categories.forEach(k=>{const v=S.notes[[eid,mid,per,k.nom].join('|')];if(v!=null){s+=v*k.poids;w+=k.poids}});return w?s/w:null}
function moyGen(e,per){const c=S.classes.find(x=>x.id===e.classeId);let s=0,w=0;c.matieres.forEach(m=>{const v=moyMat(e.id,m.id,per);if(v!=null){s+=v*m.coef;w+=m.coef}});return w?s/w:null}
/* ---------- Saisie des notes ---------- */
function renderSaisieNotes(){
 const cid=$('noteClasse').value,per=$('notePeriode').value,c=S.classes.find(x=>x.id===cid),ms=$('noteMatiere'),z=$('saisieZone');
 if(ms.dataset.c!==cid){const pv=ms.value;ms.dataset.c=cid;ms.innerHTML=c?opts(c.matieres,m=>`<option value="${m.id}">${esc(m.nom)}</option>`):'';if([...ms.options].some(o=>o.value===pv))ms.value=pv}
 const mid=ms.value;
 if(!c||!mid||!per){z.innerHTML='<p class="empty">'+(adm()?'Créez d\'abord périodes, classes et matières.':'Aucune matière ne vous est affectée. Contactez l\'administrateur.')+'</p>';return}
 const els=S.eleves.filter(e=>e.classeId===cid).sort(byName),cats=S.config.categories;
 z.innerHTML=els.length?`<table><thead><tr><th>Élève</th>${cats.map(k=>`<th>${esc(k.nom)} (${k.poids} %)</th>`).join('')}<th>Moyenne</th></tr></thead><tbody>${els.map(e=>`<tr><td>${esc(e.nom)} ${esc(e.prenom)}</td>${cats.map(k=>`<td><input type="number" inputmode="decimal" min="0" max="${S.config.noteSur}" step="0.25" value="${S.notes[[e.id,mid,per,k.nom].join('|')]??''}" data-e="${e.id}" data-m="${mid}" data-p="${esc(per)}" data-k="${esc(k.nom)}"></td>`).join('')}<td id="mm-${e.id}">${fmt(moyMat(e.id,mid,per))}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">Aucun élève dans cette classe.</p>'}
$('saisieZone').addEventListener('change',async e=>{const i=e.target,d=i.dataset;if(!d.e)return;
 try{await api('note','POST',{eleveId:d.e,matId:d.m,periode:d.p,cat:d.k,value:i.value});
  const key=[d.e,d.m,d.p,d.k].join('|');if(i.value==='')delete S.notes[key];else S.notes[key]=+i.value;
  $('mm-'+d.e).textContent=fmt(moyMat(d.e,d.m,d.p));toast('Note enregistrée')}catch(x){renderSaisieNotes()}});
/* ---------- Résultats, bulletins, statistiques ---------- */
function dl(name,rows){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n')],{type:'text/csv'}));a.download=name;a.click()}
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
/* ===== v2 : années scolaires, bulletin individuel, sécurité, journal ===== */
let Yk=null;
function logout(){api('logout','POST').catch(()=>{});T=null;S={};Yk=null;localStorage.removeItem('tk');showAuth()}
async function load(){S=await api('state');Yk=S.year;document.body.classList.remove('locked');
 $('userBar').innerHTML=`<select id="yearSel" onchange="switchYear(this.value)" aria-label="Année scolaire" style="width:auto">${opts(S.years,y=>`<option ${y===Yk?'selected':''}>${esc(y)}</option>`)}</select>${adm()?'<button class="btn gold small" onclick="newYear()">+ Année</button>':''}<span>${esc(S.me.nom)} (${adm()?'Admin':'Professeur'})</span><button class="btn ghost small" onclick="changePwd()">Mot de passe</button><button class="btn ghost small" onclick="logout()">Quitter</button>`;
 document.querySelectorAll('nav.tabs button').forEach(b=>b.style.display=adm()||b.dataset.tab==='notes'?'':'none');
 selClasse=null;showTab(adm()?'config':'notes');renderAll()}
async function switchYear(y){Yk=y;await load()}
const _ru=renderUsers;renderUsers=function(){_ru();$('usersList').querySelectorAll('tbody tr').forEach((tr,i)=>tr.lastElementChild.insertAdjacentHTML('afterbegin',`<button class="btn ghost small" onclick="resetPwd('${S.users[i].id}')">Mot de passe</button> `))};
const _rc=renderConfig;renderConfig=function(){_rc();$('cfgAnnee').value=Yk;$('cfgAnnee').readOnly=true;
 $('closeList').innerHTML=S.config.periodes.map((p,i)=>`<label style="display:inline-flex;gap:6px;margin-right:16px;align-items:center"><input type="checkbox" style="width:auto" ${S.closed.includes(p)?'checked':''} onchange="toggleClose(${i},this.checked)"> ${esc(p)}</label>`).join('')||'<span class="empty">Ajoutez d\'abord des périodes.</span>'};
function toggleClose(i,v){const p=S.config.periodes[i];S.closed=S.closed.filter(x=>x!==p);if(v)S.closed.push(p);persist();toast(v?'Période verrouillée':'Période déverrouillée')}
const _rs=renderSaisieNotes;renderSaisieNotes=function(){_rs();if(!adm()&&S.closed.includes($('notePeriode').value)){$('saisieZone').querySelectorAll('input').forEach(i=>i.disabled=true);$('saisieZone').insertAdjacentHTML('afterbegin','<p class="hint ko">Cette période est clôturée : saisie impossible.</p>')}};
function moyAn(e){const v=S.config.periodes.map(p=>moyGen(e,p)).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b)/v.length:null}
function renderBulletins(ids){const cid=$('resClasse').value,per=$('resPeriode').value,c=S.classes.find(x=>x.id===cid);if(!c||!per)return toast('Choisissez une classe et une période');
 const all=classement(cid,per);$('bulletinsZone').innerHTML=all.filter(x=>!ids||ids.includes(x.e.id)).map(x=>bulletinHTML(x,c,per,all)).join('')}

async function backup(){const d=await api('backup');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'}));a.download='sauvegarde-'+new Date().toISOString().slice(0,10)+'.json';a.click()}
function restore(f){if(!f||!confirm('Remplacer TOUTES les données par cette sauvegarde ?'))return;const r=new FileReader();r.onload=async()=>{try{await api('restore','POST',JSON.parse(r.result));toast('Données restaurées');await load()}catch(x){toast('Fichier invalide')}};r.readAsText(f)}

/* ===== v3 : résultats globaux de la classe, génération automatique ===== */
function classement(cid,per){const l=S.eleves.filter(e=>e.classeId===cid).map(e=>({e,m:moyGen(e,per)})).sort((a,b)=>(b.m??-1)-(a.m??-1)||byName(a.e,b.e));l.forEach((x,i)=>x.rang=x.m==null?null:(i&&l[i-1].m===x.m?l[i-1].rang:i+1));return l}
const _ra=renderAll;renderAll=function(){S.classes.sort((a,b)=>a.nom.localeCompare(b.nom,'fr',{numeric:true}));_ra()};
const _st=showTab;showTab=async function(t){if(adm()&&(t==='bulletins'||t==='stats')){try{const n=await api('state');S.notes=n.notes;S.eleves=n.eleves;S.extra=n.extra;S.now=n.now}catch(e){}}_st(t)};
function recapData(cid,per){return{c:S.classes.find(x=>x.id===cid),l:classement(cid,per)}}
function exportClassementCSV(){const cid=$('resClasse').value,per=$('resPeriode').value;if(!cid||!per)return;const{c,l}=recapData(cid,per),sv=S.config.seuil;
 dl('resultats-'+c.nom+'-'+per+'.csv',[['Rang','Matricule','Nom','Prénom',...c.matieres.map(m=>m.nom),'Moyenne générale','Mention','Décision','Moyenne annuelle'],...l.map(x=>[x.rang??'',x.e.matricule,x.e.nom,x.e.prenom,...c.matieres.map(m=>fmtP(x.e.id,m.id,per)),fmt(x.m),mention(x.m),x.m==null?'':x.m>=sv?'Admis':'Non admis',fmt(moyAn(x.e))])])}

/* ===== v4 : robustesse + année scolaire modifiable ===== */
function fillYearSel(){const s=$('yearSel');if(s)s.innerHTML=opts(S.years,y=>`<option ${y===Yk?'selected':''}>${esc(y)}</option>`)}
function upd(){if(adm()){try{readCfg()}catch(e){console.error(e)}}persist();renderAll()}
const _ra2=renderAll;renderAll=function(){try{_ra2()}catch(e){console.error(e);toast('Erreur d\'affichage : '+e.message)}};
const _rc2=renderConfig;renderConfig=function(){try{_rc2()}catch(e){console.error(e)}$('cfgAnnee').readOnly=false;$('cfgAnnee').value=Yk};
function saveConfig(){if(S.config.categories.reduce((a,k)=>a+k.poids,0)!==100)return toast('Le total des poids doit faire 100 %');
 readCfg();const n=$('cfgAnnee').value.trim();if(n)S.config.annee=n;
 persist().then(()=>{if(n&&n!==Yk)toast('Ce nom d\'année existe déjà');else toast('Configuration enregistrée');renderAll()})}
window.addEventListener('error',e=>toast('Erreur : '+e.message));
if(['closeList','resSearch','logList','userBar'].some(id=>!$(id)))alert('Fichiers non à jour : remplacez index.html, script.js, style.css et server.js par les dernières versions, puis rechargez avec Ctrl+F5.');

/* ===== v5 : mise à jour selon la liste de constats ===== */
const PROF_TABS=['classes','eleves','notes','absences'];let nagged=false;
const genPwd=()=>{const U='ABCDEFGHJKLMNPQRSTUVWXYZ',L='abcdefghijkmnopqrstuvwxyz',N='23456789',P='@#$%&*!?',r=n=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n},pk=x=>x[r(x.length)],c=[pk(U),pk(U),pk(L),pk(L),pk(L),pk(L),pk(N),pk(N),pk(P),pk(P)];for(let i=c.length-1;i>0;i--){const j=r(i+1);[c[i],c[j]]=[c[j],c[i]]}return c.join('')};
function logoHTML(){const g=S.config;return g.logo?`<img src="${g.logo}" height="60" alt="">`:(g.sigle?`<b style="font-size:26px;color:#1b5e46">${esc(g.sigle)}</b>`:'')}
/* accès : le professeur consulte seulement */
const _ld=load;load=async function(){['elSearch','noteSearch','resSearch'].forEach(i=>{if($(i))$(i).value=''});await _ld();document.body.classList.toggle('role-prof',!adm());
 document.querySelectorAll('nav.tabs button').forEach(b=>b.style.display=tabOK(b.dataset.tab)?'':'none');
 const lb=$('userBar').querySelector('button[onclick="logout()"]');if(lb)lb.textContent='⏻ Déconnexion';
 if(S.me.mc&&!nagged){nagged=true;setTimeout(()=>{if(confirm('Vous utilisez un mot de passe par défaut. Voulez-vous le changer maintenant ?'))changePwd()},500)}};
const _st5=showTab;showTab=function(t){if(!adm()){const al=S.me.role==='parent'?['parent']:PROF_TABS;if(!al.includes(t))t=al[0]}if(adm()&&t==='profs'&&!$('uPass').value)$('uPass').value=genPwd();pwHint($('uPass'),'uPwHint',true);return _st5(t)};
const _lo=logout;logout=function(){nagged=false;_lo()};
/* sigle, logo */
function readCfg(){Object.assign(S.config,{nom:$('cfgNomEcole').value.trim(),sigle:$('cfgSigle').value.trim(),devise:($('cfgDevise')||{value:''}).value.trim(),mentions:parseMent(),annee:Yk,type:$('cfgType').value,noteSur:+$('cfgNoteSur').value||20,seuil:+$('cfgSeuil').value||10})}
const _rc5=renderConfig;renderConfig=function(){_rc5();if($('cfgSigle'))$('cfgSigle').value=S.config.sigle||''};
const _ra5=renderAll;renderAll=function(){_ra5();const c=S.config;
 $('sealBadge').innerHTML=c.logo?`<img src="${c.logo}" alt="">`:esc(c.sigle||(c.nom||'EC').split(/\s+/).map(w=>w[0]).join('').slice(0,3).toUpperCase());
 if(!adm()){try{renderClasses();renderEleves()}catch(e){console.error(e)}}};
/* mots de passe */
async function resetPwd(id){const p=prompt('Mot de passe par défaut FORT pour ce compte (8 car. min., majuscule, minuscule, chiffre, caractère spécial) :',genPwd());if(!p)return;try{await api('users/'+id+'/reset','POST',{pass:p});alert('Mot de passe par défaut : '+p+'\nCommuniquez-le à l\'utilisateur.');await refresh()}catch(x){}}
async function addUser(){const pw=$('uPass').value,lg=$('uLogin').value.trim();try{await api('users','POST',{nom:$('uNom').value.trim(),login:lg,pass:pw,role:$('uRole').value,mats:($('uMats')||{value:''}).value});alert('Compte créé.\nUtilisateur : '+lg+'\nMot de passe par défaut : '+pw+'\nL\'utilisateur pourra le changer après connexion.');['uNom','uLogin'].forEach(i=>$(i).value='');$('uPass').value=genPwd();pwHint($('uPass'),'uPwHint',true);await refresh()}catch(x){}}
const _ru5=renderUsers;renderUsers=function(){_ru5();$('usersList').querySelectorAll('tbody tr').forEach((tr,i)=>{if(S.users[i]&&S.users[i].mc)tr.children[1].insertAdjacentHTML('beforeend',' <small>(mot de passe par défaut)</small>')})};
function addEyes(){document.querySelectorAll('input[type=password]').forEach(i=>{if(i.dataset.eye)return;i.dataset.eye=1;const b=document.createElement('button');b.type='button';b.className='eye';b.textContent='👁';b.setAttribute('aria-label','Afficher ou masquer le mot de passe');b.onclick=()=>{i.type=i.type==='password'?'text':'password'};i.parentElement.style.position='relative';i.parentElement.appendChild(b)})}
/* recherche d'élèves */
function filterNotes(){const q=($('noteSearch')?$('noteSearch').value:'').trim().toLowerCase();$('saisieZone').querySelectorAll('tbody tr').forEach(tr=>{const i=tr.querySelector('input'),e=i&&S.eleves.find(x=>x.id===i.dataset.e),t=e?e.nom+' '+e.prenom+' '+e.matricule:tr.textContent;tr.style.display=!q||t.toLowerCase().includes(q)?'':'none'})}
const _rs5=renderSaisieNotes;renderSaisieNotes=function(){_rs5();filterNotes()};
/* impression fiable (cadre isolé) */
const PCSS='body{font:12px/1.4 Arial,sans-serif;color:#000;margin:0}h2{font:700 16px Georgia,serif;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #555;padding:3px 5px;text-align:center}th{background:#e8efe9}td:first-child{text-align:left}.ar{direction:rtl}.bulletin{page-break-after:always;padding:6px}.bulletin:last-child{page-break-after:auto}.section-tools{display:flex;justify-content:space-between;align-items:center;border-bottom:3px double #1b5e46;margin-bottom:8px;padding-bottom:6px}.sign{display:flex;justify-content:space-between;margin-top:40px;font-weight:700}.recap{font-size:10px}.recap td:nth-child(-n+4),.recap th:nth-child(-n+4){text-align:left}.ok{color:#146c3a}.ko{color:#b3261e}small{font-weight:400}.no-print{display:none}a{color:#000;text-decoration:none}';
function printDoc(inner,land){const f=document.createElement('iframe');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.appendChild(f);const d=f.contentWindow.document;d.open();
 d.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Impression</title><style>${PCSS}@page{${land?'size:landscape;':''}margin:10mm}</style></head><body>${inner}</body></html>`);d.close();
 setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){toast('Impression impossible sur ce navigateur')}setTimeout(()=>f.remove(),60000)},400)}
function printBulletins(ids){const cid=$('resClasse').value,per=$('resPeriode').value,c=S.classes.find(x=>x.id===cid);if(!c||!per)return toast('Choisissez une classe et une période');
 const all=classement(cid,per),l=all.filter(x=>!ids||ids.includes(x.e.id));if(!l.length)return toast('Aucun élève');printDoc(l.map(x=>bulletinHTML(x,c,per,all)).join(''))}
function showBulletin(id,pr){renderBulletins([id]);if(pr)printBulletins([id]);else $('bulletinsZone').scrollIntoView({behavior:'smooth'})}
/* tableau des résultats : moyennes + détail des notes, meilleur / plus faible */
function recapTable(cid,per,act,det){const{c,l}=recapData(cid,per),sv=S.config.seuil,ks=S.config.categories,rs=det?' rowspan="2"':'';
 const col=f=>{const v=l.map(f).filter(z=>z!=null);return v.length?v.reduce((a,b)=>a+b)/v.length:null};
 const h1=`<tr>${['Rang','Matricule','Nom','Prénom'].map(t=>`<th${rs}>${t}</th>`).join('')}${c.matieres.map(m=>det?`<th colspan="${ks.length+1}">${esc(m.nom)} <small>(coef ${m.coef})</small></th>`:`<th>${esc(m.nom)}<br><small>coef ${m.coef}</small></th>`).join('')}${['Moy. gén.','Mention','Décision','Annuelle'].map(t=>`<th${rs}>${t}</th>`).join('')}${act?`<th${rs}></th>`:''}</tr>`;
 const h2=det?`<tr>${c.matieres.map(()=>ks.map(k=>`<th><small>${esc(k.nom)}</small></th>`).join('')+'<th><small>Moy.</small></th>').join('')}</tr>`:'';
 const cells=(x,m)=>(det?ks.map(k=>`<td>${S.notes[[x.e.id,m.id,per,k.nom].join('|')]??'—'}</td>`).join(''):'')+`<td>${fmtP(x.e.id,m.id,per)}</td>`;
 const rows=l.map(x=>`<tr><td><b>${x.rang??'—'}</b></td><td>${esc(x.e.matricule)}</td><td>${act?`<a href="#" onclick="showBulletin('${x.e.id}');return false">${esc(x.e.nom)}</a>`:esc(x.e.nom)}</td><td>${esc(x.e.prenom)}</td>${c.matieres.map(m=>cells(x,m)).join('')}<td><b>${fmt(x.m)}</b></td><td>${mention(x.m)}</td><td class="${x.m>=sv?'ok':'ko'}">${x.m==null?'—':x.m>=sv?'Admis':'Non admis'}</td><td>${fmt(moyAn(x.e))}</td>${act?`<td><button class="btn small" onclick="showBulletin('${x.e.id}',1)">🖨️</button></td>`:''}</tr>`).join('');
 const ev=l.filter(x=>x.m!=null),ad=ev.filter(x=>x.m>=sv).length,pad=det?`<td colspan="${ks.length}"></td>`:'';
 const foot=`<tr><td colspan="4">Moyenne de la classe (${l.length} élèves)</td>${c.matieres.map(m=>pad+`<td>${fmt(col(x=>moyMat(x.e.id,m.id,per)))}</td>`).join('')}<td>${fmt(col(x=>x.m))}</td><td></td><td>${ev.length?Math.round(100*ad/ev.length)+' % admis':'—'}</td><td></td>${act?'<td></td>':''}</tr><tr class="no-print"><td colspan="4">Notes saisies par les professeurs</td>${c.matieres.map(m=>{const n=l.filter(x=>moyMat(x.e.id,m.id,per)!=null).length;return pad+`<td class="${n===l.length&&n?'ok':'ko'}">${n}/${l.length}</td>`}).join('')}<td colspan="${4+(act?1:0)}"></td></tr>`;
 const nm=x=>x?`${esc(x.e.nom)} ${esc(x.e.prenom)} (${fmt(x.m)})`:'—';
 return`<table class="recap"><thead>${h1}${h2}</thead><tbody>${rows}</tbody><tfoot>${foot}</tfoot></table><p class="hint">* moyenne provisoire : il manque au moins une note (ex. examen non encore saisi).</p><p>🏆 <b>Meilleur(e) de la classe :</b> ${nm(ev[0])} &nbsp;|&nbsp; ⚠️ <b>Plus faible :</b> ${nm(ev[ev.length-1])}</p>`}
function renderClassement(){const cid=$('resClasse').value,per=$('resPeriode').value,z=$('classementZone');
 if(!cid||!per){z.innerHTML='<p class="empty">Choisissez une classe et une période : le tableau se génère automatiquement à partir des notes saisies.</p>';return}
 z.innerHTML=recapTable(cid,per,true,$('recapDetail')&&$('recapDetail').checked);const q=$('resSearch').value.trim().toLowerCase();
 if(q)z.querySelectorAll('tbody tr').forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(q)?'':'none')}
/* statistiques : meilleur et plus faible par classe et pour l'école */
function statsData(){const per=$('statPeriode').value,cid=$('statClasse').value;return(cid?S.classes.filter(c=>c.id===cid):S.classes).map(c=>{const l=classement(c.id,per).filter(x=>x.m!=null),ms=l.map(x=>x.m);
 return{c,n:l.length,moy:ms.length?ms.reduce((a,b)=>a+b)/ms.length:null,max:ms.length?Math.max(...ms):null,min:ms.length?Math.min(...ms):null,adm:ms.filter(v=>v>=S.config.seuil).length,best:l[0],worst:l[l.length-1]}})}
const nmx=x=>x?`${esc(x.e.nom)} ${esc(x.e.prenom)} — ${fmt(x.m)}`:'—';
function renderStats(){const per=$('statPeriode').value;if(!per){$('statsZone').innerHTML='';return}const d=statsData(),all=S.classes.map(c=>{const l=classement(c.id,per).filter(x=>x.m!=null);return{c,b:l[0],w:l[l.length-1]}}).filter(x=>x.b);
 const B=all.reduce((a,x)=>!a||x.b.m>a.b.m?x:a,null),W=all.reduce((a,x)=>!a||x.w.m<a.w.m?x:a,null);
 $('statsZone').innerHTML=`<div class="card"><h2>Ensemble de l'école</h2><p>🏆 <b>Meilleur élève de l'école :</b> ${B?nmx(B.b)+' (classe '+esc(B.c.nom)+')':'—'}</p><p>⚠️ <b>Élève le plus faible de l'école :</b> ${W?nmx(W.w)+' (classe '+esc(W.c.nom)+')':'—'}</p></div>`+(d.length?`<div class="card"><table><thead><tr><th>Classe</th><th>Évalués</th><th>Moy. classe</th><th>Réussite</th><th>Meilleur élève</th><th>Plus faible</th></tr></thead><tbody>${d.map(s=>`<tr><td>${esc(s.c.nom)}</td><td>${s.n}</td><td>${fmt(s.moy)}</td><td>${s.n?Math.round(100*s.adm/s.n)+' %':'—'}</td><td>${nmx(s.best)}</td><td>${nmx(s.worst)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Aucune donnée.</p>')}
function exportStatsCSV(){const t=x=>x?x.e.nom+' '+x.e.prenom+' ('+fmt(x.m)+')':'';dl('statistiques.csv',[['Classe','Évalués','Moyenne','Max','Min','Admis','Meilleur élève','Plus faible'],...statsData().map(s=>[s.c.nom,s.n,fmt(s.moy),fmt(s.max),fmt(s.min),s.adm,t(s.best),t(s.worst)])])}
addEyes();

/* ===== v6 : professeur en consultation, saisie ciblée, mots de passe forts ===== */
const RULES=[['8 caractères min.',p=>p.length>=8],['majuscule',p=>/[A-Z]/.test(p)],['minuscule',p=>/[a-z]/.test(p)],['chiffre',p=>/\d/.test(p)],['caractère spécial',p=>/[^A-Za-z0-9\s]/.test(p)],['sans espace',p=>!/\s/.test(p)]];
function pwHint(inp,out,on){const el=$(out);if(!el)return;el.innerHTML=on&&inp.value?RULES.map(([t,f])=>`<span class="${f(inp.value)?'ok':'ko'}">${f(inp.value)?'✓':'✗'} ${t}</span>`).join(' · '):(on?'Exigé : '+RULES.map(r=>r[0]).join(', '):'')}
$('uPass').addEventListener('input',()=>pwHint($('uPass'),'uPwHint',true));
$('aPass').addEventListener('input',()=>pwHint($('aPass'),'aPwHint',setup));
const PR_MSG='Nouveau mot de passe FORT : 8 caractères min., une majuscule, une minuscule, un chiffre, un caractère spécial, sans espace';
async function changePwd(){const o=prompt('Mot de passe actuel');if(!o)return;const p=prompt(PR_MSG);if(!p)return;try{await api('password','POST',{old:o,pass:p});S.me.mc=false;toast('Mot de passe modifié')}catch(x){}}
/* le professeur ne fait que consulter : aucune action d'administration */
['addClasse','delClasse','addMatiere','delMatiere','applyMatierePreset','delEleve','editEleve','addPeriode','delPeriode','quickPeriodes','addCategorie','delCat','quickComposition','saveConfig','handleLogoUpload','removeLogo','toggleClose','addUser','delUser','resetPwd','addAffectation','delAff','backup','restore','showLog','newYear'].forEach(n=>{const f=window[n];window[n]=function(...a){if(!adm())return toast('Action réservée à l\'administrateur');return f.apply(this,a)}});
const _pe=persist;persist=function(){return adm()?_pe():Promise.resolve()};
const _rcl=renderClasses;renderClasses=function(){_rcl();if(!adm()){document.querySelectorAll('#classesList .pill button,#matieresTbody .btn').forEach(b=>b.remove());document.querySelectorAll('#matieresCard .row').forEach(r=>r.style.display='none');['tab-classes'].forEach(t=>{const c=$(t).querySelector('.card');if(c)c.style.display='none'})}};
/* saisie ciblée d'une note pour un élève précis */
async function saveNote(eid,mid,per,cat,val){await api('note','POST',{eleveId:eid,matId:mid,periode:per,cat,value:val});const k=[eid,mid,per,cat].join('|');if(val==='')delete S.notes[k];else S.notes[k]=+val}
async function addNoteCiblee(){const e=$('noteEleve').value,m=$('noteMatiere').value,p=$('notePeriode').value,k=$('noteCat').value,v=$('noteVal').value;
 if(!e||!m||!p||!k||v==='')return toast('Choisissez l\'élève et la catégorie, puis saisissez la note');
 try{await saveNote(e,m,p,k,v);$('noteVal').value='';renderSaisieNotes();toast('Note enregistrée pour cet élève')}catch(x){}}
const _rs6=renderSaisieNotes;renderSaisieNotes=function(){_rs6();const cid=$('noteClasse').value,pv=$('noteEleve').value,s=$('noteEleve');
 s.innerHTML=opts(S.eleves.filter(e=>e.classeId===cid).sort(byName),e=>`<option value="${e.id}">${esc(e.nom)} ${esc(e.prenom)} (${esc(e.matricule)})</option>`);if([...s.options].some(o=>o.value===pv))s.value=pv;
 $('noteCat').innerHTML=opts(S.config.categories,k=>`<option>${esc(k.nom)}</option>`)};

/* ===== v7 : le professeur peut ajouter des élèves dans ses classes ===== */
async function addEleve(){const g=i=>$(i).value.trim(),cid=$('elClasse').value;if(!cid||!g('elNom'))return toast('Choisissez une classe et saisissez le nom');
 const e={matricule:g('elMatricule'),nom:g('elNom').toUpperCase(),prenom:g('elPrenom'),sexe:$('elSexe').value,naissance:$('elDateNaissance').value,parent:($('elParent')||{value:''}).value.trim(),tel:($('elTel')||{value:''}).value.trim()};
 try{const j=await api('eleves','POST',{classeId:cid,list:[e]});if(!j.added)return toast('Élève non ajouté : ce matricule existe déjà dans la classe');['elMatricule','elNom','elPrenom','elParent','elTel'].forEach(i=>{if($(i))$(i).value=''});await refresh();toast('Élève ajouté')}catch(x){}}
function importCSV(f){if(!f)return;const cid=$('elClasse').value;if(!cid)return toast('Choisissez d\'abord une classe');
 const r=new FileReader();r.onload=async()=>{const list=[];r.result.replace(/^\ufeff/,'').split(/\r?\n/).forEach((l,i)=>{const c=l.split(/[;,\t]/).map(s=>s.trim().replace(/^"|"$/g,''));if(!c[1]||(i==0&&/nom/i.test(c[1])))return;list.push({matricule:c[0],nom:c[1],prenom:c[2],sexe:/^f/i.test(c[3]||'')?'F':'M',naissance:c[4]||'',parent:c[5]||'',tel:c[6]||''})});
  try{const j=await api('eleves','POST',{classeId:cid,list});await refresh();toast(j.added+' élève(s) importé(s)'+(j.skipped?' — '+j.skipped+' ignoré(s) (doublon ou nom vide)':''))}catch(x){}};r.readAsText(f)}

/* ===== v8 : impression du tableau de résultats = rang, matricule, nom, prénom, moyenne générale ===== */
function recapCompact(cid,per){const{l}=recapData(cid,per),n=S.config.noteSur;
 return`<table class="rc" style="font-size:13px"><thead><tr><th>Rang</th><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Moyenne générale / ${n}</th></tr></thead><tbody>${l.map(x=>`<tr><td style="text-align:center"><b>${x.rang??'—'}</b></td><td>${esc(x.e.matricule)}</td><td>${esc(x.e.nom)}</td><td>${esc(x.e.prenom)}</td><td style="text-align:center"><b>${fmt(x.m)}</b></td></tr>`).join('')}</tbody></table>`}
function printRecap(){const cid=$('resClasse').value,per=$('resPeriode').value,c=S.classes.find(x=>x.id===cid),g=S.config,det=$('recapDetail')&&$('recapDetail').checked;if(!c||!per)return toast('Choisissez une classe et une période');
 printDoc(`<div class="section-tools"><div><h2>${esc(g.nom)}</h2>Résultats de la classe ${esc(c.nom)} — ${esc(per)} — Année scolaire ${esc(Yk)}</div>${logoHTML()}</div>${det?recapTable(cid,per,false,true):recapCompact(cid,per)}<div class="sign"><span>Le Directeur des études</span><span>Le Directeur</span></div>`,det)}

/* ===== v9 : enregistrement fiable, modification classes/matières, renommage, promotion, bulletin enrichi ===== */
let pq=Promise.resolve();
function persist(){if(!adm())return Promise.resolve();
 pq=pq.then(()=>api('data','POST',{config:S.config,classes:S.classes,eleves:S.eleves,affectations:S.affectations,closed:S.closed,published:S.published,extra:S.extra,since:S.now,rev:S.rev}).then(r=>{S.rev=r.rev;if(r.year&&r.year!==Yk){S.years=S.years.map(y=>y===r.old?r.year:y);Yk=r.year;S.config.annee=Yk;fillYearSel()}return r}).catch(()=>{if(api.last===409)return refresh()}));return pq}
function editClasse(id){if(!adm())return;const c=S.classes.find(x=>x.id===id),n=prompt('Nom de la classe',c.nom);if(!n)return;const f=prompt('Filière (optionnel)',c.filiere||'');c.nom=n.trim();c.filiere=(f||'').trim();upd()}
function editMatiere(id){if(!adm())return;const c=S.classes.find(x=>x.id===selClasse),m=c&&c.matieres.find(x=>x.id===id);if(!m)return;const n=prompt('Nom de la matière',m.nom);if(!n)return;const cf=+prompt('Coefficient',m.coef);if(!(cf>0))return toast('Coefficient invalide');m.nom=n.trim();m.coef=cf;if(S.config.type==='franco-arabe'){const a=prompt('Nom en arabe',m.ar||'');if(a!==null)m.ar=a.trim()}upd()}
const _rcl9=renderClasses;renderClasses=function(){_rcl9();if(!adm())return;
 [...$('classesList').querySelectorAll('.pill')].forEach((p,i)=>{const b=document.createElement('button');b.textContent='✎';b.title='Modifier';b.style.color='var(--forest)';b.onclick=()=>editClasse(S.classes[i].id);p.insertBefore(b,p.lastElementChild)});
 const c=S.classes.find(x=>x.id===selClasse);if(c)[...$('matieresTbody').rows].forEach((r,i)=>r.lastElementChild.insertAdjacentHTML('afterbegin',`<button class="btn ghost small" onclick="editMatiere('${c.matieres[i].id}')">✎</button> `))};
async function renameItem(type,from){if(!adm())return;const t=prompt('Nouveau nom',from);if(!t||t.trim()===from)return;try{await api('rename','POST',{type,from,to:t.trim()});await refresh();toast('Renommé : les notes sont conservées')}catch(x){}}
const _rc9=renderConfig;renderConfig=function(){_rc9();
 $('periodesList').querySelectorAll('.pill').forEach((p,i)=>{const b=document.createElement('button');b.textContent='✎';b.title='Renommer';b.style.color='var(--forest)';b.onclick=()=>renameItem('periode',S.config.periodes[i]);p.insertBefore(b,p.lastElementChild)});
 [...$('catTable').querySelector('tbody').rows].forEach((r,i)=>r.lastElementChild.insertAdjacentHTML('afterbegin',`<button class="btn ghost small" onclick="renameItem('cat',S.config.categories[${i}].nom)">✎</button> `));
 if($('cfgDevise'))$('cfgDevise').value=S.config.devise||''};
async function newYear(){if(!adm())return;const n=prompt('Nom de la nouvelle année scolaire (ex : 2026-2027)');if(!n)return;const nom=n.trim(),cp=confirm('Copier les classes, matières et affectations de '+Yk+' ?');
 try{await api('years','POST',{nom,copy:cp?Yk:null})}catch(x){return}
 let rep='';if(cp&&confirm('Reporter les élèves dans la nouvelle année (admis et redoublants, d\'après la moyenne annuelle) ?')){const names=S.classes.map(c=>c.nom).join(', '),sv=S.config.seuil;let tot=0;Yk=nom;
  for(const c of S.classes){const el=S.eleves.filter(e=>e.classeId===c.id);if(!el.length)continue;
   const a=prompt('Classe d\'accueil des ADMIS de '+c.nom+' (parmi : '+names+'). Vide = ne pas reporter.',''),r=prompt('Classe des NON ADMIS de '+c.nom+' (redoublants). Vide = ne pas reporter.',c.nom);
   for(const[t,isA]of[[a,true],[r,false]]){const tc=t&&S.classes.find(x=>x.nom===t.trim());if(!tc)continue;const list=el.filter(e=>{const v=moyAn(e);return v!=null&&(v>=sv)===isA}).map(e=>({matricule:e.matricule,nom:e.nom,prenom:e.prenom,sexe:e.sexe,naissance:e.naissance}));
    if(list.length)try{tot+=(await api('eleves','POST',{classeId:tc.id,list})).added}catch(x){}}}
  rep=' — '+tot+' élève(s) reporté(s)'}
 Yk=nom;await load();toast('Année créée'+rep)}
function prov(e,m,p){const v=S.config.categories.map(k=>S.notes[[e,m,p,k.nom].join('|')]);return v.some(x=>x!=null)&&v.some(x=>x==null)}
function fmtP(e,m,p){const v=moyMat(e,m,p);return fmt(v)+(v!=null&&prov(e,m,p)?'*':'')}
function bulletinHTML(x,c,per,all){const cfg=S.config,ar=cfg.type==='franco-arabe',ex=S.extra[x.e.id+'|'+per]||{},am=ex.m||{};
 const cm=m=>{const v=all.map(y=>moyMat(y.e.id,m.id,per)).filter(z=>z!=null);return v.length?v.reduce((a,b)=>a+b)/v.length:null};
 const rk=m=>{const me=moyMat(x.e.id,m.id,per);return me==null?'—':1+all.filter(y=>{const v=moyMat(y.e.id,m.id,per);return v!=null&&v>me}).length};
 return`<div class="card bulletin"><div class="section-tools"><div><h2>${esc(cfg.nom)}</h2>${cfg.devise?`<i>${esc(cfg.devise)}</i><br>`:''}Année scolaire ${esc(Yk)} — ${esc(per)}</div>${logoHTML()}</div><p><b>${esc(x.e.nom)} ${esc(x.e.prenom)}</b> — Matricule ${esc(x.e.matricule)} — Classe ${esc(c.nom)}</p><table><thead><tr><th>Matière</th>${ar?'<th>المادة</th>':''}<th>Coef.</th>${cfg.categories.map(k=>`<th>${esc(k.nom)}</th>`).join('')}<th>Moyenne</th><th>Moy. classe</th><th>Rang</th><th>Appréciation</th></tr></thead><tbody>${c.matieres.map(m=>`<tr><td>${esc(m.nom)}</td>${ar?`<td class="ar">${esc(m.ar)}</td>`:''}<td>${m.coef}</td>${cfg.categories.map(k=>`<td>${S.notes[[x.e.id,m.id,per,k.nom].join('|')]??'—'}</td>`).join('')}<td>${fmtP(x.e.id,m.id,per)}</td><td>${fmt(cm(m))}</td><td>${rk(m)}</td><td>${esc(am[m.id]||'')}</td></tr>`).join('')}</tbody></table><p class="hint">* moyenne provisoire : il manque au moins une note.</p><p><b>Moyenne générale : ${fmt(x.m)} / ${cfg.noteSur}</b> — Rang : ${x.rang??'—'} / ${all.length} — Mention : ${mention(x.m)}<br>Moyenne annuelle : ${fmt(moyAn(x.e))} — Absences : ${ex.abs??absCount(x.e.id,'A')} — Retards : ${absCount(x.e.id,'R')}</p><p>Appréciation du conseil de classe : ${esc(ex.appr||'—')}</p><div class="row no-print"><div class="field"><label>Absences</label><input type="number" min="0" value="${ex.abs??''}" data-x="abs" data-id="${x.e.id}"></div><div class="field" style="flex:3"><label>Appréciation du conseil de classe</label><input value="${esc(ex.appr||'')}" data-x="appr" data-id="${x.e.id}"></div></div><details class="no-print"><summary>Appréciations par matière</summary><div class="row">${c.matieres.map(m=>`<div class="field"><label>${esc(m.nom)}</label><input value="${esc(am[m.id]||'')}" data-x="am" data-mid="${m.id}" data-id="${x.e.id}"></div>`).join('')}</div></details><div class="sign"><span>Le Directeur</span><span>Les parents</span></div></div>`}
$('bulletinsZone').addEventListener('change',e=>{const d=e.target.dataset;if(!d.x)return;const k=d.id+'|'+$('resPeriode').value,ex=S.extra[k]=S.extra[k]||{};
 if(d.x==='am'){ex.m=ex.m||{};ex.m[d.mid]=e.target.value}else ex[d.x]=d.x==='abs'?+e.target.value||0:e.target.value;persist();if(d.x!=='am')renderBulletins([d.id])});
async function showLog(){if(!adm())return;const l=await api('log'),nm=id=>{const e=S.eleves.find(x=>x.id===id);return e?e.nom+' '+e.prenom:'?'},mn=id=>{for(const c of S.classes){const m=c.matieres.find(x=>x.id===id);if(m)return m.nom}return'?'};
 $('logList').innerHTML=l.length?`<table><thead><tr><th>Date</th><th>Par</th><th>Action</th><th>Détail</th></tr></thead><tbody>${l.map(x=>`<tr><td>${new Date(x.t).toLocaleString('fr-FR')}</td><td>${esc(x.u)}</td><td>${x.a?esc(x.a):'Note modifiée'}</td><td>${x.a?esc(x.d||''):`${esc(nm(x.e))} — ${esc(mn(x.m))} — ${esc(x.p)}/${esc(x.c)} : ${x.o??'—'} → ${x.n??'—'}`}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">Aucune entrée.</p>'}

/* ===== v10 : hors connexion, fiche élève, absences, mentions, Excel, graphiques, espace parents ===== */
const tabOK=t=>adm()||(S.me.role==='parent'?t==='parent':PROF_TABS.includes(t));
const waLink=(tel,t)=>{const d=String(tel||'').replace(/\D/g,'');return d?'https://wa.me/'+d+'?text='+encodeURIComponent(t):''};
const smsLink=(tel,t)=>tel?'sms:'+String(tel).replace(/[^\d+]/g,'')+'?body='+encodeURIComponent(t):'';
/* --- hors connexion : file d'attente des notes + copie locale de l'état --- */
const qGet=()=>{try{return JSON.parse(localStorage.getItem('nq')||'[]')}catch(e){return[]}},qSet=q=>localStorage.setItem('nq',JSON.stringify(q));
function updQ(){let b=$('offBadge');if(!b){b=document.createElement('span');b.id='offBadge';b.style.cssText='background:#e3a41b;color:#14201b;border-radius:4px;padding:2px 8px;font-size:12px;font-weight:600';$('userBar').prepend(b)}const n=qGet().length;b.style.display=n||!navigator.onLine?'':'none';b.textContent=(navigator.onLine?'':'Hors connexion — ')+n+' note(s) en attente'}
async function flushQ(){const q=qGet();if(!q.length||!T)return;let rej=0;const rest=[];
 for(let i=0;i<q.length;i++){const n=q[i];if(n.u&&S.me&&n.u!==S.me.id){rest.push(n);continue}
  try{const r=await fetch('/api/note?y='+encodeURIComponent(n.y),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+T},body:JSON.stringify(n)});if(r.status===401){rest.push(...q.slice(i));break}if(r.status>=400)rej++}catch(e){rest.push(...q.slice(i));break}}
 qSet(rest);updQ();if(rej)toast(rej+' note(s) refusée(s) (période clôturée ou matière non affectée)');else if(q.length&&rest.length<q.length)toast('Notes synchronisées')}
async function api(p,m='GET',b){let r;
 try{r=await fetch('/api/'+p+(p.includes('?')?'&':'?')+'y='+encodeURIComponent(Yk||''),{method:m,headers:{'Content-Type':'application/json',Authorization:'Bearer '+T},body:b?JSON.stringify(b):undefined})}
 catch(e){if(p==='note'){const q=qGet();q.push({...b,y:Yk,u:S.me&&S.me.id});qSet(q);updQ();toast('Hors connexion : note mise en attente');return{queued:1}}
  if(p.startsWith('state')){const c=localStorage.getItem('off:'+T);if(c){const s=JSON.parse(c);qGet().forEach(n=>{const k=[n.eleveId,n.matId,n.periode,n.cat].join('|');if(n.y===s.year&&s.notes){if(n.value==='')delete s.notes[k];else s.notes[k]=+n.value}});return s}}
  toast('Hors connexion : action impossible pour le moment');throw 0}
 const j=await r.json().catch(()=>({}));
 if(r.status===401&&T){logout();throw 0}
 if(!r.ok){api.last=r.status;toast(j.error||'Erreur');throw 0}
 if(p.startsWith('state')&&j.me){try{localStorage.setItem('off:'+T,JSON.stringify(j))}catch(e){}flushQ()}
 return j}
async function boot(){try{const st0=await fetch('/api/status').then(r=>r.json());setup=st0.setup;DEMO=!!st0.demo}catch(e){setup=false}
 if(T&&!setup){try{await load();return}catch(e){}}showAuth()}
const _ld10=load;load=async function(){await _ld10();updQ()};
const _lo10=logout;logout=function(){try{localStorage.removeItem('off:'+T)}catch(e){}_lo10()};
window.addEventListener('online',()=>{flushQ();toast('Connexion rétablie')});window.addEventListener('offline',updQ);setInterval(flushQ,30000);
/* --- fiche élève, contact parent --- */
function renderEleves(){const f=$('elFiltreClasse').value,q=($('elSearch')?$('elSearch').value:'').trim().toLowerCase(),cn=id=>(S.classes.find(c=>c.id===id)||{}).nom;
 const l=S.eleves.filter(e=>(!f||e.classeId===f)&&(!q||(e.nom+' '+e.prenom+' '+e.matricule+' '+(e.parent||'')+' '+(e.tel||'')).toLowerCase().includes(q))).sort(byName);
 $('elevesList').innerHTML=l.length?`<p class="hint">${l.length} élève(s)</p><table><thead><tr><th>Matricule</th><th>Nom</th><th>Prénom</th><th>Sexe</th><th>Classe</th><th>Parent / Tél.</th><th></th></tr></thead><tbody>${l.map(e=>`<tr><td>${esc(e.matricule)}</td><td>${esc(e.nom)}</td><td>${esc(e.prenom)}</td><td>${e.sexe}</td><td>${esc(cn(e.classeId))}</td><td>${esc(e.parent||'')} ${esc(e.tel||'')}</td><td>${adm()?`<button class="btn ghost small" onclick="editEleve('${e.id}')">✎</button> <button class="btn red small" onclick="delEleve('${e.id}')">✕</button>`:''}</td></tr>`).join('')}</tbody></table>`:'Aucun élève trouvé.'}
function editEleve(id){if(!adm())return;const e=S.eleves.find(x=>x.id===id),a=['Nom','Prénom','Matricule','Parent / tuteur','Téléphone du parent (avec indicatif, ex : +22370000000)'],k=['nom','prenom','matricule','parent','tel'],v=[];
 for(let i=0;i<5;i++){const r=prompt(a[i],e[k[i]]||'');if(r===null)return;v.push(r.trim())}k.forEach((x,i)=>e[x]=x==='nom'?v[i].toUpperCase():v[i]);upd()}
const _bh10=bulletinHTML;bulletinHTML=function(x,c,per,all){const h=_bh10(x,c,per,all),t=`Bulletin de ${x.e.prenom} ${x.e.nom} (${per}, ${Yk}) : moyenne générale ${fmt(x.m)}/${S.config.noteSur}, rang ${x.rang??'—'}/${all.length}, mention ${mention(x.m)}. ${S.config.nom}`;
 return h.replace('<div class="sign">',`<div class="no-print">${x.e.tel?`<a class="btn small" target="_blank" rel="noopener" href="${waLink(x.e.tel,t)}">📲 WhatsApp au parent</a> <a class="btn ghost small" href="${smsLink(x.e.tel,t)}">✉️ SMS</a>`:'<span class="hint">Ajoutez le téléphone du parent dans la fiche élève pour lui envoyer le résultat.</span>'}</div><div class="sign">`)};
/* --- mentions configurables --- */
function parseMent(){const el=$('cfgMentions');if(!el)return S.config.mentions||[10,12,14,16];const v=el.value.split(/[;,\s]+/).map(Number).filter(n=>n>0);return v.length===4?v:[10,12,14,16]}
function mention(m){if(m==null)return'—';const t=S.config.mentions||[10,12,14,16],r=m/S.config.noteSur*20;return r>=t[3]?'Très bien':r>=t[2]?'Bien':r>=t[1]?'Assez bien':r>=t[0]?'Passable':'Insuffisant'}
const _rc10=renderConfig;renderConfig=function(){_rc10();if($('cfgMentions'))$('cfgMentions').value=(S.config.mentions||[10,12,14,16]).join(';');
 if($('pubList'))$('pubList').innerHTML=S.config.periodes.map((p,i)=>`<label style="display:inline-flex;gap:6px;margin-right:16px;align-items:center"><input type="checkbox" style="width:auto" ${(S.published||[]).includes(p)?'checked':''} onchange="togglePub(${i},this.checked)"> ${esc(p)}</label>`).join('')||'<span class="empty">Ajoutez d\'abord des périodes.</span>'};
function togglePub(i,v){if(!adm())return;const p=S.config.periodes[i];S.published=(S.published||[]).filter(x=>x!==p);if(v)S.published.push(p);persist();toast(v?'Bulletins publiés aux parents':'Publication retirée')}
/* --- absences et retards --- */
const absCount=(id,t)=>Object.values(S.abs||{}).filter(d=>d[id]===t).length;
function renderAbs(){const cid=$('abClasse').value,d=$('abDate').value,z=$('absZone');if(!cid||!d){z.innerHTML='<p class="empty">Choisissez une classe et une date.</p>';return}
 const els=S.eleves.filter(e=>e.classeId===cid).sort(byName),cur=(S.abs||{})[d]||{};
 z.innerHTML=els.length?`<table><thead><tr><th>Élève</th><th>Statut le ${esc(d)}</th><th>Total absences</th><th>Total retards</th></tr></thead><tbody>${els.map(e=>`<tr><td>${esc(e.nom)} ${esc(e.prenom)}</td><td><select data-ab="${e.id}"><option value="">Présent</option><option value="A" ${cur[e.id]==='A'?'selected':''}>Absent</option><option value="R" ${cur[e.id]==='R'?'selected':''}>Retard</option></select></td><td>${absCount(e.id,'A')}</td><td>${absCount(e.id,'R')}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">Aucun élève dans cette classe.</p>'}
async function saveAbs(){const cid=$('abClasse').value,d=$('abDate').value;if(!cid||!d)return;const marks={};$('absZone').querySelectorAll('select[data-ab]').forEach(s=>marks[s.dataset.ab]=s.value);
 try{await api('abs','POST',{classeId:cid,date:d,marks});S.abs=S.abs||{};const day=S.abs[d]=S.abs[d]||{};for(const k in marks){if(marks[k])day[k]=marks[k];else delete day[k]}if(!Object.keys(day).length)delete S.abs[d];renderAbs();toast('Appel enregistré')}catch(x){}}
/* --- espace parents --- */
function parentBulletin(e,per){const cfg=S.config,c=S.classes.find(x=>x.id===e.classeId),ex=S.extra[e.id+'|'+per]||{},am=ex.m||{},g=moyGen(e,per);
 return`<div class="card bulletin"><div class="section-tools"><div><h2>${esc(cfg.nom)}</h2>Année scolaire ${esc(Yk)} — ${esc(per)}</div>${logoHTML()}</div><p><b>${esc(e.nom)} ${esc(e.prenom)}</b> — Matricule ${esc(e.matricule)} — Classe ${esc(c.nom)}</p><table><thead><tr><th>Matière</th><th>Coef.</th>${cfg.categories.map(k=>`<th>${esc(k.nom)}</th>`).join('')}<th>Moyenne</th><th>Appréciation</th></tr></thead><tbody>${c.matieres.map(m=>`<tr><td>${esc(m.nom)}</td><td>${m.coef}</td>${cfg.categories.map(k=>`<td>${S.notes[[e.id,m.id,per,k.nom].join('|')]??'—'}</td>`).join('')}<td>${fmtP(e.id,m.id,per)}</td><td>${esc(am[m.id]||'')}</td></tr>`).join('')}</tbody></table><p class="hint">* moyenne provisoire : il manque au moins une note.</p><p><b>Moyenne générale : ${fmt(g)} / ${cfg.noteSur}</b> — Mention : ${mention(g)}<br>Absences : ${ex.abs??absCount(e.id,'A')} — Retards : ${absCount(e.id,'R')}</p><p>Appréciation du conseil de classe : ${esc(ex.appr||'—')}</p></div>`}
function renderParent(){const es=S.eleves,pub=S.published||[],se=$('pEnf'),sp=$('pPer'),ve=se.value,vp=sp.value;
 se.innerHTML=opts(es,e=>`<option value="${e.id}">${esc(e.prenom)} ${esc(e.nom)}</option>`);if([...se.options].some(o=>o.value===ve))se.value=ve;
 sp.innerHTML=opts(pub,p=>`<option>${esc(p)}</option>`);if([...sp.options].some(o=>o.value===vp))sp.value=vp;
 const e=es.find(x=>x.id===se.value),per=sp.value;$('pZone').innerHTML=e&&per?parentBulletin(e,per):'<p class="empty">Aucun bulletin publié pour le moment. Revenez plus tard.</p>'}
function printParent(){const e=S.eleves.find(x=>x.id===$('pEnf').value),per=$('pPer').value;if(e&&per)printDoc(parentBulletin(e,per))}
const _ra10=renderAll;renderAll=function(){_ra10();const s=$('abClasse'),v=s.value;s.innerHTML=opts(S.classes,c=>`<option value="${c.id}">${esc(c.nom)}</option>`);if([...s.options].some(o=>o.value===v))s.value=v;
 if(!$('abDate').value)$('abDate').value=new Date().toISOString().slice(0,10);renderAbs();if(S.me.role==='parent')renderParent()};
/* --- export Excel et graphiques --- */
function exportExcel(){const cid=$('resClasse').value,per=$('resPeriode').value,c=S.classes.find(x=>x.id===cid);if(!c||!per)return toast('Choisissez une classe et une période');
 const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><h3>${esc(S.config.nom)} — ${esc(c.nom)} — ${esc(per)} — ${esc(Yk)}</h3>${recapTable(cid,per,false,$('recapDetail')&&$('recapDetail').checked)}</body></html>`;
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+html],{type:'application/vnd.ms-excel'}));a.download='resultats-'+c.nom+'-'+per+'.xls';a.click()}
function barSVG(lab,val,max){const w=Math.max(320,lab.length*70),h=170,m=Math.max(max,1);return`<svg viewBox="0 0 ${w} ${h+30}" style="max-width:100%;width:${w}px" role="img">${val.map((v,i)=>{const bh=v==null?0:Math.round(v/m*h),x=i*70+14;return`<rect x="${x}" y="${h-bh+5}" width="42" height="${bh}" fill="#1b5e46" rx="3"/><text x="${x+21}" y="${h-bh}" font-size="11" text-anchor="middle" fill="#14201b">${v==null?'—':(Number.isInteger(v)?v:v.toFixed(1))}</text><text x="${x+21}" y="${h+22}" font-size="11" text-anchor="middle" fill="#5b6b63">${esc(String(lab[i]).slice(0,10))}</text>`}).join('')}</svg>`}
const _rst=renderStats;renderStats=function(){_rst();const per=$('statPeriode').value;if(!per)return;const d=statsData(),n=S.config.noteSur,q=n/4,bins=[0,0,0,0];
 d.forEach(s=>classement(s.c.id,per).filter(x=>x.m!=null).forEach(x=>bins[Math.min(3,Math.floor(x.m/q))]++));
 $('statsZone').insertAdjacentHTML('beforeend',`<div class="card"><h2>Moyenne par classe</h2>${barSVG(d.map(s=>s.c.nom),d.map(s=>s.moy),n)}</div><div class="card"><h2>Répartition des moyennes (nombre d'élèves)</h2>${barSVG(bins.map((_,i)=>+(i*q).toFixed(1)+'–'+ +((i+1)*q).toFixed(1)),bins,Math.max(...bins,1))}</div>`)};

/* ===== v11 : licence ===== */
function showLic(){const mn=document.querySelector('main');let b=$('licBar');if(!b){b=document.createElement('div');b.id='licBar';b.className='no-print';b.style.cssText='padding:9px 14px;margin-bottom:14px;border-radius:4px;font-size:14px;font-weight:600';mn.insertBefore(b,mn.firstChild)}
 const l=S.lic||{status:'off'},m={demo:'🧪 Mode démonstration : données fictives, effacées à chaque redémarrage du serveur. N\'y saisissez aucune vraie donnée.',trial:`Période d'essai : ${l.days} jour(s) restant(s).`,warn:`Votre licence expire dans ${l.days} jour(s). Pensez à la renouveler.`,grace:`Licence expirée : passage en lecture seule dans ${15+l.days} jour(s). Renouvelez-la.`,expired:'Licence expirée : l\'application est en lecture seule (consultation et impression). Contactez votre fournisseur.'}[l.status];
 b.style.display=m?'':'none';b.textContent=m||'';b.style.background=l.status==='warn'||l.status==='trial'||l.status==='demo'?'#fff3cd':'#f8d7da';b.style.color='#3b2f00';
 const i=$('licInfo');if(i)i.textContent=l.status==='off'?'Licences non activées sur ce serveur.':(l.school?`École : ${l.school} — expire le ${l.expires} (${l.days} jour(s))${l.max?' — '+l.max+' élèves maximum':''}.`:`Aucune licence activée${l.status==='trial'?' : période d\'essai, '+l.days+' jour(s) restant(s)':''}.`)}
function activateLicense(f){if(!f||!adm())return;const r=new FileReader();r.onload=async()=>{try{const j=JSON.parse(r.result);const res=await api('license','POST',j);S.lic=res.lic;showLic();toast('Licence activée')}catch(e){if(e instanceof SyntaxError)toast('Fichier de licence invalide')}};r.readAsText(f)}
const _ld11=load;load=async function(){await _ld11();showLic()};

/* ===== v12 : mode démonstration ===== */
let DEMO=false;
const DEMO_ACC=[['Directeur (administrateur)','directeur','Demo#Admin2026'],['Professeur de mathématiques','prof.maths','Demo#Prof2026'],['Parent d\'élève','parent.diallo','Demo#Parent2026']];
const _sa=showAuth;showAuth=function(){_sa();if(!DEMO||setup||$('demoBox'))return;const d=document.createElement('div');d.id='demoBox';d.className='hint';d.style.cssText='margin-top:12px;padding:10px;background:#fff3cd;border-radius:4px';
 d.innerHTML='<b>🧪 Mode démonstration</b> : choisissez un profil pour essayer l\'application.'+DEMO_ACC.map((a,i)=>`<div style="margin-top:6px"><button type="button" class="btn ghost small" data-i="${i}">${a[0]}</button></div>`).join('');
 d.querySelectorAll('button').forEach(b=>b.onclick=()=>{const a=DEMO_ACC[b.dataset.i];$('aLogin').value=a[1];$('aPass').value=a[2];toast('Identifiants remplis : cliquez sur « Se connecter »')});$('authForm').appendChild(d)};

boot();
