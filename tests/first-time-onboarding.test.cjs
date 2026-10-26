const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const file=x=>fs.readFileSync(path.join(root,x),'utf8');
test('Home contains a one-time welcome and a dismissible progress checklist without replacing existing dashboard',()=>{
 const html=file('index.html');
 for(const id of ['visitorHome','memberHome','memberFirstName','pmOnboardingModal','pmOnboardingPanel','pmOnboardingClose','pmOnboardingHide','pmOnboardingGoPeers','pmOnboardingGoNotes','pmOnboardingCount'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/first-time-onboarding\.css/);
 assert.match(html,/first-time-onboarding\.js/);
 assert.match(html,/Your first steps/i);
 assert.match(html,/Find my peers/);
 assert.match(html,/Notes Feed/);
 assert.match(html,/Search community/);
});
test('Peer discovery and Notes Feed register page visit, and connection tracks a successful write',()=>{
 for(const name of ['matches.html','search.html','notes.html','student.html','notifications.html'])assert.match(file(name),/first-time-onboarding\.js/,name);
 const js=file('first-time-onboarding.js');
 assert.match(js,/route==='matches\.html'\|\|route==='search\.html'/);
 assert.match(js,/route==='notes\.html'/);
 assert.match(js,/const result=await send\.apply\(this,args\);void mark\('connected_at'\)/);
 assert.match(js,/hasAll\(state\)/);
 assert.match(js,/welcome_seen_at/);
 assert.match(js,/if\(e\.key==='Escape'\)/);
 assert.match(js,/user_id:owner/);
});
test('Student onboarding schema has self-only SELECT/INSERT/UPDATE policies and no public access',()=>{
 const sql=file('PEERMIGO_STUDENT_ONBOARDING_SQL.sql');
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL.+FROM PUBLIC, anon/);
 assert.match(sql,/FOR SELECT TO authenticated USING \(\(select auth\.uid\(\)\)=user_id\)/);
 assert.match(sql,/FOR INSERT TO authenticated WITH CHECK \(\(select auth\.uid\(\)\)=user_id\)/);
 assert.match(sql,/FOR UPDATE TO authenticated USING \(\(select auth\.uid\(\)\)=user_id\) WITH CHECK \(\(select auth\.uid\(\)\)=user_id\)/);
});
test('Completion is based on real onboarding evidence rather than page views alone',()=>{
 const noop=()=>{};
 const context={window:{PM:{backend:{identity:()=>null}},addEventListener:noop},document:{getElementById:()=>null},location:{pathname:'/index.html'},console,Date};
 vm.runInNewContext(file('first-time-onboarding.js'),context);
 const onboard=context.window.PM.Onboarding;
 assert.equal(onboard.stepsDone({}),1);
 assert.equal(onboard.stepsDone({discovered_peers_at:'now'}),2);
 assert.equal(onboard.stepsDone({discovered_peers_at:'now',opened_notes_at:'now'}),3);
 assert.equal(onboard.hasAll({discovered_peers_at:'now',opened_notes_at:'now'}),false);
 assert.equal(onboard.hasAll({discovered_peers_at:'now',opened_notes_at:'now',connected_at:'now'}),true);
});
