/* Peermigo learning support: optional module strengths/needs + curated type-ahead.
   Never equate a student's confidence with formal tutoring qualifications. */
(()=>{'use strict';
 window.PM=window.PM||{};
 const SUBJECTS={
  school:['Accounting','Agricultural Sciences','Business Studies','Civil Technology','Computer Applications Technology','Consumer Studies','Dance Studies','Design','Dramatic Arts','Economics','Electrical Technology','Engineering Graphics and Design','English Home Language','English First Additional Language','Geography','History','Hospitality Studies','Information Technology','IsiZulu Home Language','Life Orientation','Life Sciences','Mathematical Literacy','Mathematics','Mechanical Technology','Music','Physical Sciences','Sesotho Home Language','Setswana Home Language','Tourism','Visual Arts'],
  tertiary:['Accounting','Accounting 1','Accounting 2','Algorithms','Applied Mathematics','Artificial Intelligence','Business Analysis','Business Communication','Business Information Systems','Business Management','Calculus','Chemistry','Cloud Computing','Computer Architecture','Computer Networks','Computer Science','Cybersecurity','Data Analytics','Data Structures','Database Management Systems','Database Systems','Databases','Discrete Mathematics','Economics','Education Studies','Engineering Mathematics','Entrepreneurship','Financial Accounting','Financial Management','Human Resource Management','Information Systems','Information Technology','Java Programming','Linear Algebra','Machine Learning','Marketing','Mathematics','Microeconomics','Networking','Operating Systems','Physics','Programming','Programming 1','Programming 2','Project Management','Python Programming','Research Methods','Software Development','Software Engineering','Statistics','Systems Analysis','Web Development','Web Development 1','Web Development 2']
 };
 const normal=x=>window.PM?.MatchingV3?.subjectKey?.(x)||String(x||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const split=value=>[...new Map(String(value||'').split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean).map(s=>[normal(s),s])).values()].slice(0,10);
 const validated=(arr,modules)=>{const byKey=new Map(modules.map(x=>[normal(x),x]));return [...new Set((Array.isArray(arr)?arr:[]).map(x=>byKey.get(normal(x))).filter(Boolean))].slice(0,10);};
 function support(peer,me){
  const empty={canHelp:[],canReceiveHelp:[],mutual:false};
  if(!peer||!me)return empty;
  const fit=window.PM?.matchDetails?.(peer,me);
  if(fit && (!fit.formatCompatible || fit.reason==='Different study levels' || (fit.studyContext==='campus'&&!fit.locationVerified)))return empty;
  if(peer.institution_type==='school'&&me.institution_type==='school'&&peer.course&&me.course&&normal(peer.course)!==normal(me.course))return empty;
  const compare=(need,strength)=>{
    if(!Array.isArray(need)||!Array.isArray(strength)||!need.length||!strength.length)return [];
    const matches=window.PM?.MatchingV3?.sharedTopics?.(need,strength)?.matches||[];
    const strengths=new Map(strength.map(x=>[normal(x),x]));
    return [...new Set(matches.map(match=>strengths.get(normal(match.peerTopic))||strength.find(x=>normal(x)===normal(match.peerTopic))||match.peerTopic))];
  };
  const canHelp=compare(me?.help_modules,peer?.confident_modules);
  const canReceiveHelp=compare(peer?.help_modules,me?.confident_modules);
  return {canHelp,canReceiveHelp,mutual:canHelp.length>0&&canReceiveHelp.length>0};
 }
 function mount(inputId,rootId,{typeId}={}){
  const input=document.getElementById(inputId),root=document.getElementById(rootId);if(!input||!root)return null;
  let confident=[],help=[],highlighted=-1;
  const suggestions=document.createElement('div');suggestions.className='pm-subject-suggestions';suggestions.id=inputId+'Suggestions';suggestions.setAttribute('role','listbox');suggestions.hidden=true;
  const inputWrap=document.createElement('div');inputWrap.className='pm-subject-input-wrap';input.parentNode.insertBefore(inputWrap,input);inputWrap.append(input,suggestions);input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',suggestions.id);input.setAttribute('aria-expanded','false');input.setAttribute('autocomplete','off');
  const choices=document.createElement('div');choices.className='pm-learning-choices';root.append(choices);
  const tips=document.createElement('p');tips.className='pm-learning-footnote';tips.textContent='These choices are optional and can be changed in Edit Profile. You can ask for help without offering to help anyone.';root.append(tips);
  const modules=()=>split(input.value);
  const sync=()=>{const current=modules();confident=validated(confident,current);help=validated(help,current);render();};
  const render=()=>{
   const current=modules();choices.replaceChildren();
   if(!current.length){const note=document.createElement('p');note.className='pm-learning-empty';note.textContent='Add your subjects above to choose where you feel confident or need help.';choices.append(note);return;}
   current.forEach(module=>{
    const row=document.createElement('div');row.className='pm-learning-row';
    const label=document.createElement('span');label.className='pm-learning-subject';label.textContent=module;row.append(label);
    const buttons=document.createElement('div');buttons.className='pm-learning-actions';
    for(const [kind,text] of [['confident','Confident'],['help','Need help']]){
     const pressed=(kind==='confident'?confident:help).some(x=>normal(x)===normal(module));
     const b=document.createElement('button');b.type='button';b.className='pm-learning-chip '+kind+(pressed?' is-selected':'');b.textContent=text;b.dataset.kind=kind;b.dataset.module=module;b.setAttribute('aria-pressed',String(pressed));buttons.append(b);
    }
    row.append(buttons);choices.append(row);
   });
  };
  choices.addEventListener('click',event=>{const b=event.target.closest('button[data-kind]');if(!b)return;
   const topic=modules().find(x=>normal(x)===normal(b.dataset.module));if(!topic)return;
   const key=normal(topic),kind=b.dataset.kind;
   let target=kind==='confident'?confident:help,other=kind==='confident'?help:confident;
   if(target.some(x=>normal(x)===key))target=target.filter(x=>normal(x)!==key);else target=[...target,topic];
   other=other.filter(x=>normal(x)!==key);
   if(kind==='confident'){confident=target;help=other;}else{help=target;confident=other;}
   render();
  });
  const endFragment=()=>String(input.value).split(/[,;\n]/).pop().trim();
  const hide=()=>{suggestions.hidden=true;suggestions.replaceChildren();input.setAttribute('aria-expanded','false');highlighted=-1;};
  const visibleItems=()=>[...suggestions.querySelectorAll('button[data-suggest]')];
  const commit=value=>{
   const previous=input.value;const at=Math.max(previous.lastIndexOf(','),previous.lastIndexOf(';'),previous.lastIndexOf('\n'));
   const before=at>=0?previous.slice(0,at+1).trim()+' ':'';
   const all=split(before+value);input.value=all.join(', ')+(all.length<10?', ':'');
   input.dispatchEvent(new Event('input',{bubbles:true}));hide();input.focus();
  };
  const show=()=>{
   const fragment=endFragment();if(fragment.length<2){hide();return;}
   const school=document.getElementById(typeId)?.value==='school';
   const already=new Set(split(input.value.slice(0,Math.max(input.value.lastIndexOf(','),input.value.lastIndexOf(';'))+1)).map(normal));
   const options=(school?SUBJECTS.school:SUBJECTS.tertiary).filter(x=>normal(x).includes(normal(fragment))&&!already.has(normal(x))).slice(0,6);
   if(!options.length){hide();return;}
   suggestions.replaceChildren();options.forEach((name,i)=>{
    const b=document.createElement('button');b.type='button';b.role='option';b.dataset.suggest=name;b.setAttribute('aria-selected','false');b.textContent=name;b.addEventListener('pointerdown',e=>e.preventDefault());b.addEventListener('click',()=>commit(name));suggestions.append(b);
   });
   suggestions.hidden=false;highlighted=-1;input.setAttribute('aria-expanded','true');
  };
  input.addEventListener('input',()=>{sync();show();});
  input.addEventListener('focus',show);
  input.addEventListener('blur',()=>setTimeout(hide,100));
  input.addEventListener('keydown',event=>{
   if(suggestions.hidden)return;const items=visibleItems();if(!items.length)return;
   if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();highlighted=(highlighted+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items.forEach((x,i)=>x.setAttribute('aria-selected',String(i===highlighted)));}
   else if(event.key==='Enter'&&highlighted>=0){event.preventDefault();commit(items[highlighted].dataset.suggest);}
   else if(event.key==='Escape'){event.preventDefault();hide();}
  });
  document.getElementById(typeId)?.addEventListener('change',()=>{hide();});
  render();
  return {get(){const current=modules();return {confident_modules:validated(confident,current),help_modules:validated(help,current)};},set(data={}){confident=validated(data.confident_modules,modules());help=validated(data.help_modules,modules()).filter(x=>!confident.some(y=>normal(x)===normal(y)));render();},refresh:sync};
 }
 window.PM.SubjectSupport={mount,split,validated,support,normal,SUBJECTS};
})();
