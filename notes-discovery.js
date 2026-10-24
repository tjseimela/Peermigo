/* Peermigo Notes discovery: authenticated, paginated, RLS-backed public feed. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const escapeHtml = input => String(input ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const limit = 24;
 const db = window.PM.backend;
 let me=null,blocked=new Set(),notes=[],offset=0,hasMore=true,loading=false,pendingReload=false,filter='for-you',term='',lastRequest=0;
 const noteCache=new Map();
 const date = value => {const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'});};
 const safeId = value => /^[0-9a-f-]{36}$/i.test(String(value||''));
 function message(text){const toast=$('toast');if(toast){toast.textContent=text;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),3000);}}
 const normal = v => String(v||'').toLocaleLowerCase('en-ZA').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const sameInstitution = p => p?.institution && me?.institution && window.PM.institutionKey(p.institution)===window.PM.institutionKey(me.institution);
 function academicScore(note){
   if(!me)return 0;
   const text=normal([note.topic,note.body].join(' '));
   const modules=Array.isArray(me.modules)?me.modules:[];
   let score=0;
   for(const module of modules){const subject=normal(module);if(subject.length>=3 && text.includes(subject))score+=10;}
   // Exact course references are useful but shouldn't drown out subject overlap.
   const course=normal(me.course);
   if(course.length>4&&text.includes(course))score+=6;
   if(sameInstitution(note.author))score+=2;
   return Math.min(score,42);
 }
 function button(tab){document.querySelectorAll('[data-notes-tab]').forEach(b=>{const active=b.dataset.notesTab===tab;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active))});}
 function switchTab(tab,scroll=false){
   if(tab!=='mine')tab='discover';
   button(tab);
   $('pmDiscoverNotesPanel').hidden=tab!=='discover';
   $('pmMyNotesPanel').hidden=tab!=='mine';
   if(scroll)$(tab==='mine'?'pmMyNotesPanel':'pmDiscoverNotesPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
 }
 function renderCard(note){
   const author=note.author;
   const summary=String(note.body||'').replace(/\s+/g,' ').trim().slice(0,190);
   const label=window.PM.formatPersonName(author.full_name)||'Student';
   const institution=window.PM.formatStudyText(author.institution||'');
   const own=note.author_id===db.identity();
   return `<article class="pm-discovery-note" data-public-note="${escapeHtml(note.id)}">
     <div class="pm-note-card-top"><span class="pm-note-author">${escapeHtml(label)}${institution?` <span aria-hidden="true">·</span> ${escapeHtml(institution)}`:''}</span><span class="pm-note-date">${escapeHtml(date(note.created_at))}</span></div>
     <h3>${escapeHtml(note.topic)}</h3><p>${escapeHtml(summary)}${String(note.body||'').length>190?'…':''}</p>
     <div class="pm-note-card-foot"><button type="button" class="pm-note-read" data-open-note="${escapeHtml(note.id)}">Read note <span aria-hidden="true">↗</span></button>
     ${own?'':`<button type="button" class="pm-save-btn pm-note-save" data-save-kind="note" data-save-key="${escapeHtml(note.id)}" aria-label="Save this public note" aria-pressed="false"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3h14v18l-7-5-7 5z"/></svg><span>Save</span></button>`}</div>
    </article>`;
 }
 function draw(){
   const root=$('pmDiscoverNotesList');if(!root)return;
   let sorted=[...notes];
   if(filter==='institution')sorted=sorted.filter(n=>sameInstitution(n.author));
   if(filter==='for-you')sorted.sort((a,b)=>academicScore(b)-academicScore(a)||new Date(b.created_at)-new Date(a.created_at));
   else sorted.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
   root.innerHTML=sorted.length?sorted.map(renderCard).join(''):`<div class="pm-notes-empty">${loading?'Loading notes…':term?'No notes found for this search.':filter==='institution'?'No public notes from your institution yet.':'No public notes to show yet.'}</div>`;
   $('pmNotesMore').hidden=!hasMore;
 }
 async function fetchBatch(reset=false){
   if(!db.user)return;
   if(loading){if(reset)pendingReload=true;return;}
   if(!hasMore&&!reset)return;
   const request=++lastRequest;
   if(reset){offset=0;hasMore=true;notes=[];noteCache.clear();}
   loading=true;draw();$('pmNotesMore').disabled=true;
   try{
     let query=db.requireClient().from('student_notes')
       .select('id,author_id,topic,body,visibility,created_at,edited_at')
       .eq('visibility','public').order('created_at',{ascending:false}).range(offset,offset+limit-1);
     if(term){const clean=term.replace(/[^\p{L}\p{M}\p{N}\s]/gu,'').replace(/\s+/g,' ').trim().slice(0,70);
       if(clean){const escaped=clean.replaceAll('%','\\%').replaceAll('_','\\_');query=query.or(`topic.ilike.%${escaped}%,body.ilike.%${escaped}%`);}
     }
     const {data,error}=await query;
     if(error)throw error;
     if(request!==lastRequest)return;
     const batch=data||[];
     offset+=batch.length;
     hasMore=batch.length===limit;
     const ids=[...new Set(batch.map(n=>n.author_id).filter(safeId))];
     let authors=[];
     if(ids.length){
       const r=await db.requireClient().from('profiles')
         .select('id,full_name,institution,discoverable,course,modules')
         .in('id',ids);
       if(r.error)throw r.error;
       authors=r.data||[];
     }
     const byId=new Map(authors.filter(p=>p.discoverable!==false).map(p=>[p.id,p]));
     for(const note of batch){
       if(note.author_id===db.identity()||blocked.has(note.author_id))continue;
       const author=byId.get(note.author_id);
       if(!author)continue; // Hidden, unavailable or blocked author; never show their note in Discover.
       const enriched={...note,author};notes.push(enriched);noteCache.set(enriched.id,enriched);
     }
   }catch(error){if(request===lastRequest){console.warn('Discover notes:',error);message('Unable to load public notes. Please retry.');}}
   finally{loading=false;$('pmNotesMore').disabled=false;draw();if(pendingReload){pendingReload=false;fetchBatch(true);}}
 }
 function closeReader(){const dialog=$('pmNoteReader');if(dialog){dialog.hidden=true;document.body.classList.remove('pm-note-modal-open');$('pmNoteReaderContent').replaceChildren();}}
 async function openReader(id){
   const n=noteCache.get(id);if(!n)return;
   const reader=$('pmNoteReader');const content=$('pmNoteReaderContent');if(!reader||!content)return;
   const own=n.author_id===db.identity();
   content.innerHTML=`<h2 id="pmNoteReaderTitle">${escapeHtml(n.topic)}</h2><p class="pm-reader-meta">${escapeHtml(window.PM.formatPersonName(n.author.full_name))} · ${escapeHtml(date(n.created_at))}</p><div class="pm-reader-body">${escapeHtml(n.body)}</div><div id="pmReaderImages" class="pm-reader-attachments"></div><div class="pm-reader-actions"><a href="student.html?id=${encodeURIComponent(n.author_id)}&note=${encodeURIComponent(id)}">View student profile ↗</a>${own?'':`<button type="button" data-report-note="${escapeHtml(id)}" aria-expanded="false">Report note</button>`}</div>${own?'':`<form class="pm-report-form" id="pmNoteReportForm" hidden><label for="pmReportReason">Reason</label><select id="pmReportReason" required><option value="">Select a reason</option><option value="spam">Spam</option><option value="inappropriate">Inappropriate content</option><option value="misleading">Misleading information</option><option value="other">Other</option></select><label for="pmReportDetails">Details (optional)</label><textarea id="pmReportDetails" rows="2" maxlength="500" placeholder="Add details if helpful"></textarea><button type="submit" class="btn btn-primary">Submit report</button></form>`}`;
   reader.hidden=false;document.body.classList.add('pm-note-modal-open');$('pmNoteReaderClose')?.focus();
   try{await window.PM.ui.showFiles($('pmReaderImages'),'note',id,false);}catch(err){console.warn('Note images:',err.message);}
 }
 async function reportNote(id,form){
   const n=noteCache.get(id);if(!n||n.author_id===db.identity())return;
   const reason=$('pmReportReason').value;
   if(!['spam','inappropriate','misleading','other'].includes(reason))return;
   const details=$('pmReportDetails').value.trim().slice(0,500);
   const btn=form.querySelector('button[type=submit]');btn.disabled=true;
   const {error}=await db.requireClient().from('pm_note_reports').insert({reporter_id:db.identity(),note_id:id,reason,details});
   btn.disabled=false;
   if(error){message(error.code==='23505'?'You already reported this note.':'Could not submit report. Please try again.');return;}
   message('Report submitted.');closeReader();
 }
 function init(){
   document.querySelectorAll('[data-notes-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.notesTab)));
   $('pmCreateNoteShortcut')?.addEventListener('click',()=>switchTab('mine',true));
   document.querySelectorAll('[data-feed-filter]').forEach(b=>b.addEventListener('click',()=>{
     filter=b.dataset.feedFilter;
     document.querySelectorAll('[data-feed-filter]').forEach(btn=>{const active=btn===b;btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',String(active));});
     draw();
   }));
   $('pmNotesSearchForm')?.addEventListener('submit',e=>{e.preventDefault();const next=$('pmNotesSearch').value.trim();if(next===term)return;term=next;fetchBatch(true);});
   $('pmNotesSearch')?.addEventListener('search',()=>{term=$('pmNotesSearch').value.trim();fetchBatch(true);});
   $('pmNotesMore')?.addEventListener('click',()=>fetchBatch());
   $('pmDiscoverNotesList')?.addEventListener('click',e=>{const b=e.target.closest('[data-open-note]');if(b)openReader(b.dataset.openNote);});
   $('pmNoteReaderClose')?.addEventListener('click',closeReader);
   $('pmNoteReader')?.addEventListener('click',e=>{if(e.target===$('pmNoteReader'))closeReader();const b=e.target.closest('[data-report-note]');if(b){const form=$('pmNoteReportForm');form.hidden=!form.hidden;b.setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)$('pmReportReason').focus();}});
   $('pmNoteReader')?.addEventListener('submit',e=>{if(e.target?.id!=='pmNoteReportForm')return;e.preventDefault();const id=$('pmNoteReaderContent')?.querySelector('[data-report-note]')?.dataset.reportNote;if(id)reportNote(id,e.target);});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('pmNoteReader').hidden)closeReader();});
   const deep=(location.hash==='#notesForm'||new URLSearchParams(location.search).get('tab')==='mine');
   switchTab(deep?'mine':'discover');
 }
 document.addEventListener('DOMContentLoaded',init);
 window.addEventListener('pm-note-updated',()=>{if(db.user)fetchBatch(true);});
 window.addEventListener('pm-ready',async()=>{
   if(!db.user)return;
   try{[me,blocked]=await Promise.all([db.profile(),db.blockedPeers().then(ids=>new Set(ids))]);}
   catch(e){console.warn('Notes feed permissions:',e.message);blocked=new Set();}
   fetchBatch(true);
 });
})();
