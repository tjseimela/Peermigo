/* Searchable Peermigo institution suggestions. No external API or database migration. */
(()=>{'use strict';
  const norm=v=>String(v||'').trim().toLocaleLowerCase('en-ZA').replace(/\s+/g,' ');
  const distance=(a,b)=>{
    if(Math.abs(a.length-b.length)>2)return 99;
    let prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=next;
    }return prev[b.length];
  };
  const optionsFor=(type,term)=>{
    const names=window.PM?.INSTITUTIONS?.[type]||[];
    const q=norm(term);
    if(!q)return names.slice(0,7);
    const aliases=window.PM?.INSTITUTION_ALIASES||{};
    const results=[];
    for(const name of names){
      const canonical=norm(name),variants=[canonical,...Object.entries(aliases).filter(([,v])=>v===name).map(([key])=>key)];
      let score=99;
      for(const v of variants){
        if(v===q)score=Math.min(score,0);
        else if(v.startsWith(q))score=Math.min(score,1);
        else if(v.includes(q))score=Math.min(score,3);
        else if(q.length>=4){
          const candidates=[v.split(' ')[0],v.slice(0,Math.min(v.length,q.length+2))];
          for(const item of candidates)if(distance(q,item)<=2)score=Math.min(score,5);
        }
      }
      if(score<99)results.push({name,score});
    }
    return results.sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name)).slice(0,7).map(x=>x.name);
  };
  function setup(inputId,typeId){
    const input=document.getElementById(inputId),type=document.getElementById(typeId);
    if(!input||!type)return;
    input.removeAttribute('list');
    input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');
    input.setAttribute('aria-expanded','false');
    const wrap=document.createElement('div');wrap.className='pm-institution-picker';
    input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    const menu=document.createElement('div');menu.className='pm-institution-results';
    menu.id=inputId+'-results';menu.setAttribute('role','listbox');menu.hidden=true;
    input.setAttribute('aria-controls',menu.id);wrap.appendChild(menu);
    let choices=[],active=-1;
    const close=()=>{menu.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;};
    const select=name=>{input.value=name;close();input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};
    const highlight=i=>{active=i;[...menu.children].forEach((button,j)=>{button.classList.toggle('active',j===i);button.setAttribute('aria-selected',String(j===i));});if(i>=0)input.setAttribute('aria-activedescendant',menu.children[i]?.id||'');};
    const show=()=>{
      const kind=type.value;choices=optionsFor(kind,input.value);menu.replaceChildren();
      if(!choices.length||kind==='school'){close();return;}
      choices.forEach((name,i)=>{
        const button=document.createElement('button');button.type='button';button.className='pm-institution-option';button.id=menu.id+'-'+i;button.role='option';button.textContent=name;button.setAttribute('aria-selected','false');
        button.addEventListener('pointerdown',e=>e.preventDefault());
        button.addEventListener('click',()=>select(name));menu.append(button);
      });
      active=-1;menu.hidden=false;input.setAttribute('aria-expanded','true');
    };
    input.addEventListener('input',show);
    input.addEventListener('focus',show);
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){close();return;}
      if(e.key==='ArrowDown'){if(menu.hidden)show();if(choices.length){e.preventDefault();highlight((active+1)%choices.length);}}
      if(e.key==='ArrowUp'&&!menu.hidden&&choices.length){e.preventDefault();highlight((active-1+choices.length)%choices.length);}
      if(e.key==='Enter'&&!menu.hidden&&active>=0){e.preventDefault();select(choices[active]);}
    });
    input.addEventListener('blur',()=>{setTimeout(()=>{if(!wrap.contains(document.activeElement))close();},100);});
    type.addEventListener('change',()=>close());
    document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target))close();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setup('signupInstitution','signupInstitutionType');setup('institutionName','institutionType');});
  else {setup('signupInstitution','signupInstitutionType');setup('institutionName','institutionType');}
})();
