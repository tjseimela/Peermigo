/* Peermigo progressive registration: account basics then required academic setup.
   Existing client and Supabase validation remain the source of truth at final submit. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const stages=[
  {label:'Type', title:'Where do you study?',desc:'Choose the kind of institution you attend.',fields:['signupInstitutionType']},
  {label:'Profile',title:'Tell us your institution.',desc:'Students from the same institution are easier to connect with.',fields:['signupInstitution']},
  {label:'Academic',title:'What are you studying?',desc:'Your grade or programme helps us find academically relevant peers.',fields:['signupCourse','signupGrade']},
  {label:'Classes',title:'Which subjects or modules?',desc:'Add at least one. These are essential for meaningful recommendations.',fields:['signupModules']},
  {label:'Schedule',title:'How do you like to study?',desc:'Choose your study format and campus when applicable.',fields:['signupStudyMethod','signupCampus']},
  {label:'Done',title:'Ready to find your people?',desc:'Review your details before your Peermigo account is created.',fields:[]}
 ];
 let active=-1,mode=false,built=false;
 const wrapChild=(tag,className)=>{const n=document.createElement(tag);n.className=className;return n;};
 const show=(node,visible)=>{if(node)node.classList.toggle('hidden',!visible);};
 const explain=(msg,field)=>{
   const fb=$('authFeedback');fb.textContent=msg;fb.classList.remove('hidden');fb.classList.add('is-error');
   if(field){field.focus();field.scrollIntoView({block:'center',behavior:'smooth'});}return false;
 };
 const clearFeedback=()=>{$('authFeedback')?.classList.add('hidden');};
 function init(){if(built||!$('authForm'))return;built=true;
  const form=$('authForm'),signup=$('authSignupFields'),submit=$('authSubmit');
  const name=document.querySelector('.pm-signup-name-group');
  const basic=wrapChild('div','pm-wizard-account');basic.id='pmWizardAccount';
  form.insertBefore(basic,signup);basic.append(name);
  const nameNote=signup.querySelector('.pm-name-format-note');if(nameNote)basic.append(nameNote);
  const whyLink=signup.querySelector('.pm-why-link');if(whyLink)basic.append(whyLink);
  const cred=wrapChild('div','pm-wizard-credentials');cred.id='pmWizardCredentials';
  const first=$('authEmailInput').closest('.form-group');
  const last=$('authLegalNote');
  const transfer=[];let cursor=first;
  while(cursor){const next=cursor.nextElementSibling;transfer.push(cursor);if(cursor===last)break;cursor=next;}
  form.insertBefore(cred,submit);transfer.forEach(n=>cred.append(n));
  const originalRow=signup.querySelector('.pm-registration-row');
  const group=id=>$(id)?.closest('.form-group');
  const parts=[
   [group('signupInstitutionType')],
   [group('signupInstitution')],
   [group('signupCourse'),group('signupGrade')],
   [group('signupModules')],
   [group('signupStudyMethod'),group('signupCampus')],
   []
  ];
  signup.replaceChildren();
  if(originalRow)originalRow.remove();
  parts.forEach((elements,i)=>{
   const pane=wrapChild('section','pm-wizard-panel hidden');pane.dataset.signupPane=String(i);
   pane.setAttribute('aria-label',stages[i].label);
   elements.filter(Boolean).forEach(n=>pane.append(n));
   if(i===5){const summary=wrapChild('div','pm-wizard-summary');summary.id='pmWizardSummary';pane.append(summary);
    const hint=wrapChild('p','pm-wizard-confirm-note');hint.textContent='Required academic details are complete. Your account will be created after you select “Create account”.';pane.append(hint);}
   signup.append(pane);
  });
  const track=$('pmWizardTrack');stages.forEach((st,i)=>{
   const node=wrapChild('div','pm-wizard-marker');node.dataset.step=String(i);
   const line=wrapChild('div','pm-wizard-marker-line');
   const row=wrapChild('div','pm-wizard-marker-label');
   const number=wrapChild('span','pm-wizard-marker-number');number.textContent=String(i+1);
   const label=wrapChild('span','pm-wizard-marker-text');label.textContent=st.label;
   row.append(number,label);node.append(line,row);track.append(node);
  });
  $('pmWizardNext').addEventListener('click',advance);
  $('pmWizardBack').addEventListener('click',()=>{clearFeedback();if(active===-1)return;active-=1;render();});
  [basic,cred,signup].forEach(el=>el.addEventListener('input',()=>clearFeedback()));
  [basic,cred,signup].forEach(el=>el.addEventListener('change',()=>clearFeedback()));
 }
 const field=id=>$(id);
 function valid(stage){
  if(stage===-1){
    const first=field('signupFirstName'),sur=field('signupSurname');
    for(const node of [first,sur,field('authEmailInput'),field('authPassword'),field('authPasswordConfirm'),field('authAdultCheck')]){
     if(!node.checkValidity()){node.reportValidity();return false;}
    }
    const full=[first.value.trim(),sur.value.trim()].join(' ');
    if(full.length>80)return explain('Your full name must be at most 80 characters.',first);
    if(!PM.validPersonName(first.value.trim()))return explain('First name must contain at least 2 letters and use valid name characters.',first);
    if(!PM.validPersonName(sur.value.trim()))return explain('Surname must contain at least 2 letters and use valid name characters.',sur);
    if(field('authPassword').value!==field('authPasswordConfirm').value)return explain('Your passwords do not match.',field('authPasswordConfirm'));
    return true;
  }
  const step=stages[stage];if(!step)return false;
  const school=field('signupInstitutionType').value==='school';
  if(stage===2 && school&&!field('signupGrade').value)return explain('Select your school grade.',field('signupGrade'));
  for(const id of step.fields){const node=field(id);if(!node||node.disabled)continue;
   if(!node.checkValidity()){node.reportValidity();return false;}
  }
  if(stage===1 && field('signupInstitution').value.trim().length<2)return explain('Enter your school, university or college name.',field('signupInstitution'));
  if(stage===2&&!school&&field('signupCourse').value.trim().length<2)return explain('Enter your course or programme.',field('signupCourse'));
  if(stage===3){const modules=field('signupModules').value.split(',').map(s=>s.trim()).filter(Boolean);
   if(modules.length<1||modules.length>10||modules.some(s=>s.length<2||s.length>100))return explain('Enter 1–10 valid subjects or modules, separated by commas.',field('signupModules'));
  }
  if(stage===4 && !school && field('signupStudyMethod').value==='campus' && field('signupCampus').value.trim().length<2)return explain('Enter the campus where you study.',field('signupCampus'));
  return true;
 }
 function summary(){const host=$('pmWizardSummary');if(!host)return;host.replaceChildren();
  const kind=field('signupInstitutionType').selectedOptions[0]?.textContent||'—';
  const school=field('signupInstitutionType').value==='school';
  const entries=[
   ['Student',`${field('signupFirstName').value.trim()} ${field('signupSurname').value.trim()}`],
   ['Institution type',kind],
   ['Institution',field('signupInstitution').value.trim()],
   [school?'School grade':'Programme',school?field('signupGrade').value:field('signupCourse').value.trim()],
   ['Subjects/modules',field('signupModules').value.trim()],
   ['Confident in',((PM.signupLearning?.get().confident_modules)||[]).join(', ')||'Not selected'],
   ['Need help with',((PM.signupLearning?.get().help_modules)||[]).join(', ')||'Not selected'],
   ['Study format',field('signupStudyMethod').selectedOptions[0]?.textContent||'—'],
   ['Campus',school?'Not applicable':field('signupCampus').value.trim()||'Not specified'],
   ['Find Peers visibility','On by default · change in Settings']
  ];
  entries.forEach(([title,value])=>{const row=wrapChild('div','pm-wizard-summary-row');const lbl=document.createElement('span');lbl.textContent=title;const val=document.createElement('strong');val.textContent=value;row.append(lbl,val);host.append(row);});
 }
 function render(){
  const account=active===-1,final=active===stages.length-1;
  // Only Step 2 (student-profile onboarding) uses the distraction-free, full-width layout.
  // Signing in or going back to Step 1 restores the original two-column layout.
  document.documentElement.classList.toggle('pm-wizard-profile-step',mode&&!account);
  show($('pmWizardProgress'),mode&&!account);
  show($('pmWizardAccount'),mode&&account);
  show($('pmWizardCredentials'),!mode||account);
  show($('authSignupFields'),mode&&!account);
  show($('pmWizardControls'),mode&&!final);
  show($('authSubmit'),!mode||final);
  show($('pmSignupIntro'),mode);
  show($('authDemoNote'),!mode||account);
  const title=$('authTitle'),subtitle=$('authSubtitle');
  if(mode){
   title.textContent=account?'Start with the basics.':stages[active].title;
   subtitle.textContent=account?'A few details to secure your Peermigo account.':stages[active].desc;
   $('pmSignupKicker').textContent=account?'STEP 1 OF 2 · CREATE YOUR ACCOUNT':'STEP 2 OF 2 · PERSONALISE YOUR PROFILE';
   $('pmSignupIntroCopy').textContent=account?'Your matching information comes next, in short guided steps.':'Complete each section to receive meaningful study recommendations.';
  }
  document.querySelectorAll('[data-signup-pane]').forEach(p=>show(p,mode&&!account&&Number(p.dataset.signupPane)===active));
  document.querySelectorAll('.pm-wizard-marker').forEach(node=>{const n=Number(node.dataset.step);node.classList.toggle('is-current',n===active);node.classList.toggle('is-complete',n<active);node.setAttribute('aria-current',n===active?'step':'false');});
  if(mode){$('pmWizardBack').textContent=active===0?'← Account':'← Back';$('pmWizardNext').textContent=account?'Continue to profile →':active===stages.length-2?'Review details →':'Continue →';}
  if(mode&&final)summary();
 }
 function advance(){if(!mode||active===stages.length-1)return;
  if(!valid(active))return;
  clearFeedback();active++;render();
  $('authTitle')?.scrollIntoView({behavior:'smooth',block:'start'});
 }
 function sync(signupMode){mode=!!signupMode;active=-1;render();}
 function ready(){return mode&&active===stages.length-1;}
 PM.signupWizard={init,sync,advance,ready};
})();