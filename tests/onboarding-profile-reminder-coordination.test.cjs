const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=name=>fs.readFileSync(path.join(root,name),'utf8');
test('first visit prioritises welcome and signals when onboarding check finishes',()=>{
 const guide=code('first-time-onboarding.js');
 assert.match(guide,/justWelcomed:false/);
 assert.match(guide,/guide\.justWelcomed=true/);
 assert.match(guide,/dispatchEvent\(new Event\('pm-onboarding-opened'\)\)/);
 assert.match(guide,/dispatchEvent\(new Event\('pm-onboarding-finished'\)\)/);
});
test('profile reminder waits for welcome decision on Home without blocking reminders on later visits',()=>{
 const reminder=code('profile-reminder.js');
 assert.match(reminder,/const waitForWelcome=/);
 assert.match(reminder,/refresh\(\{showPopup:!waitForWelcome\(\)\}\)/);
 assert.match(reminder,/refresh\(\{showPopup:!PM\.Onboarding\?\.justWelcomed\}\)/);
 assert.match(reminder,/pm-onboarding-opened',\(\)=>closeDialog\(true\)/);
 assert.match(reminder,/preempted&&reminderStamped/);
 assert.match(reminder,/const snoozeDays=7/);
});
