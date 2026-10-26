window.PM = window.PM || {};
PM.INSTITUTIONS = {
  "university": [
    "Cape Peninsula University of Technology",
    "Central University of Technology",
    "Durban University of Technology",
    "Mangosuthu University of Technology",
    "Nelson Mandela University",
    "North-West University",
    "Rhodes University",
    "Sefako Makgatho Health Sciences University",
    "Sol Plaatje University",
    "Stellenbosch University",
    "Tshwane University of Technology",
    "University of South Africa",
    "University of the Free State",
    "University of Cape Town",
    "University of Fort Hare",
    "University of Johannesburg",
    "University of KwaZulu-Natal",
    "University of Limpopo",
    "University of Mpumalanga",
    "University of Pretoria",
    "University of the Western Cape",
    "University of the Witwatersrand",
    "University of Venda",
    "University of Zululand",
    "Vaal University of Technology",
    "Walter Sisulu University"
  ],
  "college": [
    "Buffalo City TVET College",
    "Eastcape Midlands TVET College",
    "Ikhala TVET College",
    "Ingwe TVET College",
    "King Hintsa TVET College",
    "King Sabata Dalindyebo TVET College",
    "Lovedale TVET College",
    "Port Elizabeth TVET College",
    "Boland TVET College",
    "College of Cape Town",
    "False Bay TVET College",
    "Northlink TVET College",
    "South Cape TVET College",
    "West Coast TVET College",
    "Northern Cape Rural TVET College",
    "Northern Cape Urban TVET College",
    "Flavius Mareka TVET College",
    "Goldfields TVET College",
    "Maluti TVET College",
    "Motheo TVET College",
    "Coastal KZN TVET College",
    "Elangeni TVET College",
    "Esayidi TVET College",
    "Majuba TVET College",
    "Mnambithi TVET College",
    "Mthashana TVET College",
    "Thekwini TVET College",
    "Umfolozi TVET College",
    "Umgungundlovu TVET College",
    "Orbit TVET College",
    "Taletso TVET College",
    "Vuselela TVET College",
    "Central Johannesburg TVET College",
    "Ekurhuleni East TVET College",
    "Ekurhuleni West TVET College",
    "Sedibeng TVET College",
    "South West Gauteng TVET College",
    "Tshwane North TVET College",
    "Tshwane South TVET College",
    "Westcol TVET College",
    "Ehlanzeni TVET College",
    "Gert Sibande TVET College",
    "Nkangala TVET College",
    "Capricorn TVET College",
    "Lephalale TVET College",
    "Letaba TVET College",
    "Mopani South East TVET College",
    "Sekhukhune TVET College",
    "Vhembe TVET College",
    "Waterberg TVET College"
  ],
  "school": []
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
  // Require at least two actual Unicode letters in each first name / surname.
  // Punctuation and whitespace alone do not count toward the minimum.
  return name.length<=80 && (name.match(/\p{L}/gu)||[]).length>=2 && /^[\p{L}\p{M}\s.'’\-]+$/u.test(name);
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

// One canonical identity for official institution names and familiar aliases.
// All 26 public universities and 50 public TVET colleges are included.
PM.INSTITUTION_ALIASES = {
  "vut": "Vaal University of Technology",
  "tut": "Tshwane University of Technology",
  "uj": "University of Johannesburg",
  "up": "University of Pretoria",
  "unisa": "University of South Africa",
  "university of south africa (unisa)": "University of South Africa",
  "wits": "University of the Witwatersrand",
  "witwatersrand": "University of the Witwatersrand",
  "nwu": "North-West University",
  "north west university": "North-West University",
  "dut": "Durban University of Technology",
  "cput": "Cape Peninsula University of Technology",
  "ukzn": "University of KwaZulu-Natal",
  "uct": "University of Cape Town",
  "ufs": "University of the Free State",
  "cut": "Central University of Technology",
  "mut": "Mangosuthu University of Technology",
  "nmu": "Nelson Mandela University",
  "nmmu": "Nelson Mandela University",
  "nelson mandela metropolitan university": "Nelson Mandela University",
  "ru": "Rhodes University",
  "smu": "Sefako Makgatho Health Sciences University",
  "spu": "Sol Plaatje University",
  "sun": "Stellenbosch University",
  "university of stellenbosch": "Stellenbosch University",
  "ufh": "University of Fort Hare",
  "ul": "University of Limpopo",
  "ump": "University of Mpumalanga",
  "uwc": "University of the Western Cape",
  "univen": "University of Venda",
  "unizulu": "University of Zululand",
  "wsu": "Walter Sisulu University",
  "waterberg": "Waterberg TVET College",
  "waterberg college": "Waterberg TVET College",
  "waterberg tvet": "Waterberg TVET College",
  "waterbeg": "Waterberg TVET College",
  "westcol": "Westcol TVET College",
  "western college for tvet": "Westcol TVET College",
  "east cape midlands tvet college": "Eastcape Midlands TVET College",
  "king sabatha dalindyebo tvet college": "King Sabata Dalindyebo TVET College",
  "goldfields tvet college": "Goldfields TVET College",
  "goldsfields tvet college": "Goldfields TVET College",
  "umgungundlovu tvet": "Umgungundlovu TVET College",
  "umgugundlovu tvet college": "Umgungundlovu TVET College",
  "sedibeng": "Sedibeng TVET College",
  "capricorn": "Capricorn TVET College",
  "boland": "Boland TVET College",
  "orbit": "Orbit TVET College",
  "mopani east tvet college": "Mopani South East TVET College",
  "buffalo city": "Buffalo City TVET College",
  "eastcape midlands": "Eastcape Midlands TVET College",
  "ikhala": "Ikhala TVET College",
  "king hintsa": "King Hintsa TVET College",
  "king sabata dalindyebo": "King Sabata Dalindyebo TVET College",
  "lovedale": "Lovedale TVET College",
  "port elizabeth": "Port Elizabeth TVET College",
  "false bay": "False Bay TVET College",
  "northlink": "Northlink TVET College",
  "south cape": "South Cape TVET College",
  "west coast": "West Coast TVET College",
  "northern cape rural": "Northern Cape Rural TVET College",
  "northern cape urban": "Northern Cape Urban TVET College",
  "flavius mareka": "Flavius Mareka TVET College",
  "goldfields": "Goldfields TVET College",
  "maluti": "Maluti TVET College",
  "motheo": "Motheo TVET College",
  "coastal kzn": "Coastal KZN TVET College",
  "elangeni": "Elangeni TVET College",
  "esayidi": "Esayidi TVET College",
  "majuba": "Majuba TVET College",
  "mnambithi": "Mnambithi TVET College",
  "mthashana": "Mthashana TVET College",
  "thekwini": "Thekwini TVET College",
  "umfolozi": "Umfolozi TVET College",
  "umgungundlovu": "Umgungundlovu TVET College",
  "taletso": "Taletso TVET College",
  "vuselela": "Vuselela TVET College",
  "central johannesburg": "Central Johannesburg TVET College",
  "ekurhuleni east": "Ekurhuleni East TVET College",
  "ekurhuleni west": "Ekurhuleni West TVET College",
  "south west gauteng": "South West Gauteng TVET College",
  "tshwane north": "Tshwane North TVET College",
  "tshwane south": "Tshwane South TVET College",
  "ehlanzeni": "Ehlanzeni TVET College",
  "gert sibande": "Gert Sibande TVET College",
  "nkangala": "Nkangala TVET College",
  "lephalale": "Lephalale TVET College",
  "letaba": "Letaba TVET College",
  "mopani south east": "Mopani South East TVET College",
  "sekhukhune": "Sekhukhune TVET College",
  "vhembe": "Vhembe TVET College"
};
PM.institutionKey = value => {
  const normalized = PM.normalize(value).replace(/\s+/g,' ');
  const canonical = PM.INSTITUTION_ALIASES[normalized] || normalized;
  return PM.normalize(canonical);
};
PM.canonicalInstitution = (value,type) => {
  const raw=String(value||'').normalize('NFC').trim().replace(/\s+/g,' ');
  if(!raw || type==='school')return raw;
  const canonical=PM.INSTITUTION_ALIASES[PM.normalize(raw)];
  if(canonical && PM.INSTITUTIONS[type]?.includes(canonical))return canonical;
  const exact=(PM.INSTITUTIONS[type]||[]).find(x=>PM.normalize(x)===PM.normalize(raw));
  return exact||raw; // Never automatically assign an unknown institution.
};
PM.institutionVariants = value => {
  const target=PM.institutionKey(value);
  const list=[value];
  for(const [alias,name] of Object.entries(PM.INSTITUTION_ALIASES))if(PM.institutionKey(name)===target)list.push(alias);
  for(const items of Object.values(PM.INSTITUTIONS))for(const name of items)if(PM.institutionKey(name)===target)list.push(name);
  return [...new Set(list.map(x=>String(x||'').trim()).filter(Boolean))].slice(0,32);
};
PM.applyInstitutionQuery = (query,value) => {
  const variants=PM.institutionVariants(value);
  if(variants.length===1)return query.ilike('institution',variants[0]);
  // The quoted filter grammar handles institution names containing spaces/punctuation.
  return query.or(variants.map(name=>'institution.ilike."'+name.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"').join(','));
};
PM.campusKey=value=>PM.normalize(value).replace(/\s+(campus|branch)$/,'');
