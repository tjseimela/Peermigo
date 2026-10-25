const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const pm={};
vm.runInNewContext(fs.readFileSync(path.join(root,'api.js'),'utf8'),{window:{PM:pm},PM:pm,console});
const db=pm.backend;
db.user={id:'00000000-0000-0000-0000-000000000001'};

function spy(){
 const s={seenKinds:[],user:null,visible:null};
 const q={select(){return this},eq(col,v){if(col==='user_id')s.user=v;if(col==='in_app_visible')s.visible=v;return this},in(col,v){if(col==='kind')s.seenKinds=[...v];return this},order(){return this},async limit(){return {data:[],error:null}}};
 db.requireClient=()=>({from(name){assert.equal(name,'notifications');return q}});
 return s;
}

test('moderation notifications bypass all optional category toggles',async()=>{
 const s=spy(); db.getAppPreferences=async()=>({groups:false,sessions:false,notes:false});
 await db.notifications();
 assert.deepEqual(s.seenKinds,['connect','moderation']);
 assert.equal(s.visible,true);
 assert.equal(s.user,db.user.id);
});

test('optional categories remain respected, and chat notifications remain excluded',async()=>{
 const s=spy(); db.getAppPreferences=async()=>({groups:true,sessions:true,notes:true});
 await db.notifications();
 assert.deepEqual(s.seenKinds,['group','session','note','connect','moderation']);
 assert.equal(s.seenKinds.includes('message'),false);
});

test('moderation detail link is allowlisted and restricted accounts are routed to account status',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.ok(app.includes('notes|account-status|verification)\\.html'));
 assert.match(app,/\['suspended','disabled'\]\.includes\(moderation\?\.status\)/);
 assert.match(app,/pm-moderation-notification/);
});
