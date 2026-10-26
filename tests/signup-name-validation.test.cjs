'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const ctx={window:{PM:{}}};ctx.PM=ctx.window.PM;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),ctx);
const valid=ctx.PM.validPersonName;
for(const bad of ['',' ', 'A','S','A-','J.','1','B4','John123','O’','.',"'-"]){assert.equal(valid(bad),false,`must reject ${JSON.stringify(bad)}`)}
for(const good of ['Jo','Li','Al','John','Thabiso','Jean-Luc','Mary Jane',"O'Neil",'Émile','李娜']){assert.equal(valid(good),true,`must allow ${JSON.stringify(good)}`)}
const html=fs.readFileSync(path.join(root,'account.html'),'utf8');
const wizard=fs.readFileSync(path.join(root,'registration-wizard.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.match(html,/id="signupFirstName"[^>]*minlength="2"/);
assert.match(html,/id="signupSurname"[^>]*minlength="2"/);
assert.doesNotMatch(html,/id="signupDiscoverable"/);
assert.doesNotMatch(wizard,/label:'Prefs'/);
assert.match(wizard,/const whyLink=signup.querySelector\('\.pm-why-link'\);if\(whyLink\)basic.append\(whyLink\);/);
assert.match(app,/discoverable:true/);
console.log('PASS minimum-name, default-discoverability, and six-stage onboarding tests');
