/* Authenticated full search. Deliberately separate from Find Peers recommendations. */
(() => {
 'use strict';
 const el=id=>document.getElementById(id);
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const limit=9;
 const validTypes=new Set(['all','students','groups']);
 let term='',scope='all',version=0,blocked=[],studentPage=0,groupPage=0;
 let studentCount=0,groupCount=0,studentRows=0,groupRows=0,ready=false;
 const backend=()=>window.PM?.backend;
 const url=()=>new URL(location.href);
 const link=(name,id)=>`student.html?id=${encodeURIComponent(id)}`;
 const safeTerm=s=>String(s||'').normalize('NFKC').trim().slice(0,64);
 const countText=(n,label)=>`${n.toLocaleString('en-ZA')} ${label}${n===1?'':'s'}`;
 function renderTabs(){
  document.querySelectorAll('[data-tab]').forEach(node=>{
   const yes=node.dataset.tab===scope;
   node.classList.toggle('is-active',yes);node.setAttribute('aria-pressed',String(yes));
  });
 }
 function setStatus(s){el('pmSearchPageStatus').textContent=s;}
 function renderStudent(student){
  const name=PM.formatPersonName(student.full_name)||'Peermigo student';
  const detail=[student.course,student.institution,student.campus].filter(Boolean).join(' · ')||'Student profile';
  return `<article class="pm-result-card">
    <div class="pm-result-top"><span class="pm-result-avatar">${window.PM.ui.avatar(name,student.avatar_path||null,'pm-search-page-avatar')}</span>
    <div class="pm-result-card-copy"><h3>${esc(name)}</h3><p>${esc(detail)}</p></div>
    ${student.is_verified?'<span class="pm-result-verified" title="Verified student">✓ Verified</span>':''}</div>
    <div class="pm-result-footer"><span>Student</span><a href="${link(name,student.id)}">View profile <span aria-hidden="true">↗</span></a></div></article>`;
 }
 function renderGroup(group){
  const detail=[group.module,group.institution,group.campus].filter(Boolean).join(' · ')||'Student study group';
  return `<article class="pm-result-card">
    <div class="pm-result-top"><span class="pm-group-avatar">${window.PM.icon('users')}</span><div class="pm-result-card-copy"><h3>${esc(group.name||'Study group')}</h3><p>${esc(detail)}</p></div></div>
    <p class="pm-group-description">${esc(group.description||'Find your study circle and learn together.')}</p>
    <div class="pm-result-footer"><span>Study group</span><a href="groups.html?group=${encodeURIComponent(group.id)}">View group <span aria-hidden="true">↗</span></a></div></article>`;
 }
 function syncEmpty(){
  const showingStudents=scope!=='groups',showingGroups=scope!=='students';
  const hasSome=(showingStudents&&studentCount>0)||(showingGroups&&groupCount>0);
  el('pmSearchEmpty').hidden=hasSome||term.length<2;
  if(term.length>=2)setStatus(hasSome?`Results for “${term}”`:`No matching students or study groups for “${term}”.`);
 }
 function syncPanels(){
  el('pmSearchStudentsSection').hidden=scope==='groups'||term.length<2;
  el('pmSearchGroupsSection').hidden=scope==='students'||term.length<2;
  el('pmStudentsTotal').textContent=countText(studentCount,'student');
  el('pmGroupsTotal').textContent=countText(groupCount,'group');
  el('pmSearchMoreStudents').hidden=studentRows>=studentCount||scope==='groups';
  el('pmSearchMoreGroups').hidden=groupRows>=groupCount||scope==='students';
 }
 async function fetchStudents(request,append=false){
  const b=backend();const page=studentPage;
  const r=await b.directoryPage({page,pageSize:limit,search:term,excludedIds:blocked});
  if(request!==version)return;
  studentCount=r.count;studentRows+=r.rows.length;
  const box=el('pmSearchStudentResults');
  if(!append)box.innerHTML='';
  box.insertAdjacentHTML('beforeend',r.rows.map(renderStudent).join(''));
  window.PM.ui?.decorateAvatars?.(box);
  syncPanels();
 }
 async function fetchGroups(request,append=false){
  const b=backend(),page=groupPage;
  const r=await b.searchGroupsPage(term,page,limit);
  if(request!==version)return;
  groupCount=r.count;groupRows+=r.rows.length;
  const box=el('pmSearchGroupResults');
  if(!append)box.innerHTML='';
  box.insertAdjacentHTML('beforeend',r.rows.map(renderGroup).join(''));
  syncPanels();
 }
 function setUrl(){
  const u=url();if(term)u.searchParams.set('q',term);else u.searchParams.delete('q');
  if(scope==='all')u.searchParams.delete('type');else u.searchParams.set('type',scope);
  try{history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(_){/* Local file previews have no navigable origin. */}
 }
 async function run(){
  if(!backend()?.user){setStatus('Sign in to search Peermigo.');return;}
  const request=++version;
  studentPage=0;groupPage=0;studentRows=0;groupRows=0;studentCount=0;groupCount=0;
  el('pmSearchStudentResults').replaceChildren();el('pmSearchGroupResults').replaceChildren();
  syncPanels();renderTabs();
  if(term.length<2){setStatus('Enter at least two characters to search students and study groups.');el('pmSearchEmpty').hidden=true;return;}
  setStatus(`Searching for “${term}”…`);el('pmSearchEmpty').hidden=true;
  try {
   if(scope!=='groups'){
    blocked=await backend().blockedPeers();
    if(request!==version)return;
   }
   const tasks=[];
   if(scope!=='groups')tasks.push(fetchStudents(request));
   if(scope!=='students')tasks.push(fetchGroups(request));
   await Promise.all(tasks);
   if(request!==version)return;
   syncEmpty();
  } catch(error){
   if(request===version){setStatus('Unable to load search results. Please try again.');el('pmSearchEmpty').hidden=true;}
   console.warn('Peermigo search:',error.message);
  }
 }
 async function more(kind){
  const button=el(kind==='students'?'pmSearchMoreStudents':'pmSearchMoreGroups');
  button.disabled=true;const original=button.textContent;button.textContent='Loading…';
  try {
   const request=version;
   if(kind==='students'){studentPage+=1;await fetchStudents(request,true);}
   else{groupPage+=1;await fetchGroups(request,true);}
  }catch(error){
   if(kind==='students')studentPage-=1;else groupPage-=1;
   setStatus('Could not load more results. Please try again.');console.warn('Load more search results:',error.message);
  } finally{button.disabled=false;button.textContent=original;}
 }
 function boot(){
  if(ready||!el('pmFullSearchInput'))return;ready=true;
  const params=url().searchParams;
  term=safeTerm(params.get('q'));
  scope=validTypes.has(params.get('type'))?params.get('type'):'all';
  el('pmFullSearchInput').value=term;
  el('pmFullSearchForm').addEventListener('submit',event=>{
   event.preventDefault();term=safeTerm(el('pmFullSearchInput').value);setUrl();run();
  });
  el('pmSearchTabs').addEventListener('click',event=>{
   const option=event.target.closest('[data-tab]');if(!option)return;
   scope=option.dataset.tab;setUrl();run();
  });
  el('pmSearchMoreStudents').addEventListener('click',()=>more('students'));
  el('pmSearchMoreGroups').addEventListener('click',()=>more('groups'));
  window.addEventListener('popstate',()=>{
   const params=url().searchParams;
   term=safeTerm(params.get('q'));scope=validTypes.has(params.get('type'))?params.get('type'):'all';
   el('pmFullSearchInput').value=term;run();
  });
  run();
 }
 window.addEventListener('pm-ready',boot);
 if(document.documentElement.classList.contains('pm-auth-ready'))boot();
})();
