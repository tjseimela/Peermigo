/* Peermigo - student bookmarks. All writes are authenticated & RLS checked. */
(() => {
 'use strict';
 const db=window.PM.backend;
 const $=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon=name=>window.PM.icon(name);
 const catalog=Object.freeze({
  'pomodoro':{title:'The Pomodoro technique',category:'Study technique',detail:'25-minute focus sessions with short breaks',href:'resources.html#resource-pomodoro'},
  'active-recall':{title:'Active recall',category:'Study technique',detail:'Retrieve information to strengthen memory',href:'resources.html#resource-active-recall'},
  'spaced-repetition':{title:'Spaced repetition',category:'Study technique',detail:'Review content at increasing intervals',href:'resources.html#resource-spaced-repetition'},
  'khan-academy':{title:'Khan Academy',category:'Learning website',detail:'Maths, science and free lessons',href:'https://www.khanacademy.org/'},
  'coursera':{title:'Coursera',category:'Learning website',detail:'Courses and certificates',href:'https://www.coursera.org/'},
  'mdn':{title:'MDN Web Docs',category:'Learning website',detail:'Modern web-development documentation',href:'https://developer.mozilla.org/'},
  'w3schools':{title:'W3Schools',category:'Learning website',detail:'Code examples, SQL and web development',href:'https://www.w3schools.com/'},
  'tutorialspoint':{title:'TutorialsPoint',category:'Learning website',detail:'Programming and technology tutorials',href:'https://www.tutorialspoint.com/'}
 });
 let saved=[],savedNotes=new Map(),noteAuthors=new Map(),initialized=false,loaded=false,loading=false,currentFilter='all';
 const kindKey=(row)=>row.note_id?'note:'+row.note_id:'resource:'+row.resource_key;
 const savedKeys=new Set();
 const signedIn=()=>!!db.user;
 function toast(message){const el=$('toast');if(!el)return;el.textContent=message;el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),4200)}
 function buttonStates(root=document){
  for(const btn of root.querySelectorAll('[data-save-kind][data-save-key]')){
   const kind=btn.dataset.saveKind,key=btn.dataset.saveKey;
   // Public resources can be browsed by visitors, but saving requires a student account.
   btn.hidden=!signedIn();if(!signedIn())continue;
   const active=savedKeys.has(kind+':'+key);
   const desired=active?'1':'0';if(btn.dataset.pmSavedState===desired)continue;
   btn.dataset.pmSavedState=desired;
   btn.classList.toggle('is-saved',active);
   btn.setAttribute('aria-pressed',String(active));
   const isRemove=btn.hasAttribute('data-save-remove');
   const label=active?(isRemove?'Remove':'Saved'):'Save';
   btn.setAttribute('aria-label',active?`Remove ${kind==='note'?'note':'resource'} from saved items`:`Save ${kind==='note'?'public note':'resource'}`);
   btn.title=active?'Remove from saved items':'Save for later';
   btn.innerHTML=icon('bookmark')+`<span>${label}</span>`;
  }
 }
 function itemLink(row,note){
  if(row.note_id&&note)return `student.html?id=${encodeURIComponent(note.author_id)}&note=${encodeURIComponent(note.id)}`;
  return catalog[row.resource_key]?.href||'resources.html';
 }
 function noteText(note){return String(note?.body||'').replace(/\s+/g,' ').trim().slice(0,210)}
 function card(row,mini=false){
  const note=row.note_id?savedNotes.get(row.note_id):null;
  if(row.note_id&&!note)return '';
  const kind=row.note_id?'note':'resource';
  const resource=row.resource_key?catalog[row.resource_key]:null;
  if(row.resource_key&&!resource)return '';
  const title=note?.topic||resource.title;
  const detail=note?noteText(note):resource.detail;
  const author=note?(noteAuthors.get(note.author_id)||'Peermigo student'):null;
  const href=itemLink(row,note);
  const external=href.startsWith('https://');
  const metadata=note?`Public note · ${esc(author)}`:`${esc(resource.category)}`;
  return `<article class="pm-saved-card${mini?' pm-saved-mini':''}">
   <div class="pm-saved-card-symbol">${icon(kind==='note'?'book':'bookmark')}</div>
   <div class="pm-saved-card-body"><span class="pm-saved-card-label">${metadata}</span><h3><a href="${esc(href)}"${external?' target="_blank" rel="noopener noreferrer"':''}>${esc(title)}</a></h3><p>${esc(detail||'Saved study material')}</p></div>
   ${mini?'':`<button type="button" class="pm-remove-saved" data-remove-kind="${kind}" data-remove-key="${esc(row.note_id||row.resource_key)}" aria-label="Remove ${esc(title)} from saved items" title="Remove bookmark">${icon('bookmark')} <span>Remove</span></button>`}
   </article>`;
 }
 function showPage(){
  const list=$('pmSavedList');if(!list)return;
  const items=saved.filter(row=>(currentFilter==='all'||(row.note_id?'note':'resource')===currentFilter) && (row.note_id?savedNotes.has(row.note_id):!!catalog[row.resource_key]));
  $('pmSavedTotal').textContent=String(saved.filter(row=>row.note_id?savedNotes.has(row.note_id):!!catalog[row.resource_key]).length);
  list.innerHTML=items.length?items.map(row=>card(row)).join(''):'<div class="pm-saved-empty">'+icon('bookmark')+'<h3>Nothing saved here yet</h3><p>Browse public student notes or study resources and tap Save to build your personal learning list.</p><div><a href="notes.html#discover" class="btn btn-secondary">Discover notes →</a><a href="resources.html" class="btn btn-primary">Explore resources →</a></div></div>';
 }
 function showHome(){
  const root=$('pmHomeSavedPreview');if(!root)return;
  const entries=saved.filter(row=>row.note_id?savedNotes.has(row.note_id):!!catalog[row.resource_key]).slice(0,3);
  root.innerHTML=entries.length?entries.map(row=>card(row,true)).join(''):'<div class="pm-saved-home-empty">'+icon('bookmark')+'<span>No bookmarks yet. Save a public study note or resource to find it here.</span><a href="resources.html">Explore resources →</a></div>';
  const num=$('memberSavedCount');if(num)num.textContent=String(saved.filter(row=>row.note_id?savedNotes.has(row.note_id):!!catalog[row.resource_key]).length);
 }
 async function load(){
  if(!signedIn()||loading)return;
  loading=true;
  try{
   saved=await db.savedItems();
   const ids=saved.filter(x=>x.note_id).map(x=>x.note_id);
   const notes=await db.publicSavedNotes(ids);
   savedNotes=new Map(notes.map(x=>[x.id,x]));
   noteAuthors=new Map();
   const authorIds=[...new Set(notes.map(x=>x.author_id))];
   if(authorIds.length){
    try{const authors=await db.profilesByIds(authorIds);noteAuthors=new Map(authors.map(x=>[x.id,x.full_name]));}catch(err){console.warn('Saved note authors:',err.message);}
   }
   savedKeys.clear();for(const row of saved)if(row.note_id?savedNotes.has(row.note_id):!!catalog[row.resource_key])savedKeys.add(kindKey(row));
   loaded=true;buttonStates();showPage();showHome();
  }catch(error){
   console.warn('Saved items:',error.message);
   const prompt='Saved items are unavailable. Run supabase/upgrade-saved-items.sql, then try again.';
   if($('pmSavedList'))$('pmSavedList').innerHTML='<div class="pm-saved-empty"><h3>Could not load saved items</h3><p>'+esc(prompt)+'</p><button type="button" class="btn btn-secondary" id="pmSavedRetry">Try again</button></div>';
   if($('pmHomeSavedPreview'))$('pmHomeSavedPreview').innerHTML='<p class="pm-saved-muted">Saved items could not be loaded. Check your Supabase setup.</p>';
   const cnt=$('memberSavedCount');if(cnt)cnt.textContent='—';
   loaded=false;
  }finally{loading=false;}
 }
 document.addEventListener('click',async e=>{
  if(e.target.closest('#pmSavedRetry')){load();return}
  const b=e.target.closest('[data-save-kind][data-save-key],[data-remove-kind][data-remove-key]');
  if(!b)return;
  const kind=b.dataset.saveKind||b.dataset.removeKind;
  const key=b.dataset.saveKey||b.dataset.removeKey;
  if(!signedIn()){location.href='account.html';return}
  if(!loaded){toast('Your saved items are still loading. Please try again.');return}
  const savedAlready=savedKeys.has(kind+':'+key);
  const remove=b.hasAttribute('data-remove-kind')||savedAlready;
  b.disabled=true;
  try{
   if(remove)await db.unsaveItem(kind,key);else await db.saveItem(kind,key);
   await load();
   toast(remove?'Removed from saved items.':'Saved for later!');
  }catch(error){
   console.warn('Bookmark action:',error.message);
   toast(error?.message?.includes('pm_saved_items')?'Saved Items database upgrade is required.':(error?.message||'Could not update this bookmark.'));
  }finally{b.disabled=false}
 });
 document.addEventListener('click',e=>{
  const tab=e.target.closest('.pm-saved-tab');if(!tab)return;
  currentFilter=tab.dataset.filter;
  document.querySelectorAll('.pm-saved-tab').forEach(btn=>{const active=btn===tab;btn.classList.toggle('is-selected',active);btn.setAttribute('aria-pressed',String(active))});
  showPage();
 });
 // Note cards are rendered after async profile requests; ensure their Save buttons
 // stay in sync without running duplicate database queries.
 let scheduled=false;
 const observer=new MutationObserver(()=>{
  if(scheduled||!loaded)return;
  scheduled=true;requestAnimationFrame(()=>{scheduled=false;buttonStates()});
 });
 function init(){
  if(initialized)return;initialized=true;
  observer.observe(document.body,{childList:true,subtree:true});
  if(!signedIn()){buttonStates();return}
  load();
 }
 window.addEventListener('pm-ready',init);
 window.addEventListener('pm-auth-changed',()=>{
  if(!signedIn()){loaded=false;saved=[];savedKeys.clear();buttonStates();return}
  if(!initialized)init();else load();
 });
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&loaded&&signedIn())load()});
})();
