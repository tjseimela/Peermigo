window.PM = window.PM || {};
PM.INSTITUTIONS = {
  university: ['Vaal University of Technology','Tshwane University of Technology','University of Johannesburg','University of Pretoria','University of South Africa (UNISA)','University of the Witwatersrand','North-West University','University of Limpopo','University of the Free State','University of Venda','University of KwaZulu-Natal','Cape Peninsula University of Technology','Durban University of Technology','University of Cape Town','Stellenbosch University','University of the Western Cape','Nelson Mandela University','University of Mpumalanga','Sol Plaatje University','Walter Sisulu University'],
  college: ['Sedibeng TVET College','Ekurhuleni West TVET College','Ekurhuleni East TVET College','South West Gauteng TVET College','Tshwane South TVET College','Tshwane North TVET College','Central Johannesburg TVET College','Westcol TVET College','Gert Sibande TVET College','Orbit TVET College','Mopani South East TVET College','Capricorn TVET College'],
  school: []
};
PM.normalize = value => String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
// Standardized display case, including names with apostrophes, hyphens and initials.
// This also formats legacy names in the UI without rewriting the students' records.
PM.formatPersonName = value => String(value||'').normalize('NFC').trim().replace(/\s+/g,' ')
  .toLocaleLowerCase('en-ZA')
  .replace(/(^|[\s.'’\-])(\p{L})/gu,(_match,boundary,letter)=>boundary+letter.toLocaleUpperCase('en-ZA'));
// Normalize study details that arrived as ALL CAPS or irregular mixed case.
// Preserve common academic and institution acronyms (HTML, IT, TVET, BSc, etc.).
PM.formatStudyText = value => {
 const acronyms={it:'IT',ict:'ICT',ai:'AI',html:'HTML',css:'CSS',js:'JS',php:'PHP',sql:'SQL',dbms:'DBMS',tvet:'TVET',stem:'STEM',unisa:'UNISA',vut:'VUT',tut:'TUT',uct:'UCT',uj:'UJ',nwu:'NWU',dut:'DUT',cput:'CPUT',ukzn:'UKZN',bsc:'BSc',bcom:'BCom',btech:'BTech',nated:'NATED',edcr:'EDCR',bpcp:'BPCP',nqf:'NQF'};
 const lowercaseWords=new Set(['and','or','of','the','in','at','for','to','a','an']);
 let i=0;
 return String(value||'').normalize('NFC').trim().replace(/\s+/g,' ').split(/(\s+|[-/])/).map(part=>{
  if(!/\p{L}/u.test(part))return part;
  // Work with punctuation around a word, such as (UNISA), retaining numbers.
  return part.replace(/\p{L}[\p{L}\p{M}]*/gu,word=>{
   const lower=word.toLocaleLowerCase('en-ZA');
   const index=i++;
   if(acronyms[lower])return acronyms[lower];
   if(index>0&&lowercaseWords.has(lower))return lower;
   return lower.replace(/^\p{L}/u,c=>c.toLocaleUpperCase('en-ZA'));
  });
 }).join('').replace(/(['’])S\b/g,'$1s');
};
PM.validPersonName = value => {
  const name=String(value||'').trim();
  return name.length>=1 && name.length<=80 && /\p{L}/u.test(name) && /^[\p{L}\p{M}\s.'’\-]+$/u.test(name);
};
PM.profileCompletion = profile => {
  const p=profile||{};
  const nonempty=v=>Boolean(String(v??'').trim());
  const checks=[
   {key:'name',label:'Full name',done:nonempty(p.full_name)&&!/^Student [0-9A-F]{6}$/i.test(p.full_name||'')},
   {key:'institution',label:'Institution',done:nonempty(p.institution)},
   {key:'course',label:p.institution_type==='school'?'School grade':'Course / programme',done:nonempty(p.course)},
   {key:'modules',label:p.institution_type==='school'?'School subjects':'Subjects / modules',done:Array.isArray(p.modules)?p.modules.some(nonempty):nonempty(p.modules)},
   {key:'format',label:'Study format',done:nonempty(p.study_method)},
   {key:'availability',label:'Availability',done:nonempty(p.availability)},
   {key:'photo',label:'Profile photo',done:nonempty(p.avatar_path)},
   {key:'about',label:'About me / bio',done:nonempty(p.about)}
  ];
  const completed=checks.filter(c=>c.done).length;
  return {checks,completed,total:checks.length,percent:Math.round(completed/checks.length*100),missing:checks.filter(c=>!c.done),complete:completed===checks.length};
};
PM.initials = name => String(name||'P').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
PM.labelAvailability = {mornings:'Mornings',afternoons:'Afternoons',evenings:'Evenings',weekends:'Weekends',flexible:'Flexible'};
PM.labelMethod = {virtual:'Online',campus:'On campus',hybrid:'Hybrid'};

PM.INSTITUTION_ALIASES={
  vut:'Vaal University of Technology',tut:'Tshwane University of Technology',
  uj:'University of Johannesburg',up:'University of Pretoria',
  unisa:'University of South Africa (UNISA)',wits:'University of the Witwatersrand',
  nwu:'North-West University',dut:'Durban University of Technology',
  cput:'Cape Peninsula University of Technology',ukzn:'University of KwaZulu-Natal',
  uct:'University of Cape Town',ufs:'University of the Free State'
};
PM.institutionKey=value=>{
  const str=PM.normalize(value);
  return PM.normalize(PM.INSTITUTION_ALIASES[str]||str);
};
PM.campusKey=value=>PM.normalize(value).replace(/\s+(campus|branch)$/,'');
