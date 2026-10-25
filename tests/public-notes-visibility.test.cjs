const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'..');
const feed=fs.readFileSync(path.join(dir,'notes-discovery.js'),'utf8');
test('Discover Notes loads public notes independently from author profile visibility',()=>{
 assert.match(feed,/\.eq\('visibility','public'\)/);
 assert.match(feed,/const visibleAuthor=publiclyIdentifiable\?author/);
 assert.match(feed,/full_name:'Peermigo student',institution:'',discoverable:false/);
 assert.doesNotMatch(feed,/if\(!author\)continue/);
 assert.doesNotMatch(feed,/if\(note\.author_id===db\.identity\(\)\|\|blocked\.has/);
});
test('blocked authors remain excluded and hidden profiles are not linked',()=>{
 assert.match(feed,/if\(blocked\.has\(note\.author_id\)\)continue/);
 assert.match(feed,/const profileLink=n\.authorProfileAvailable\?/);
});
test('privacy documents explain public notes can appear when a profile is hidden',()=>{
 const privacy=fs.readFileSync(path.join(dir,'privacy.html'),'utf8');
 const settings=fs.readFileSync(path.join(dir,'settings-privacy.html'),'utf8');
 assert.match(privacy,/Public notes may still appear in Discover Notes/);
 assert.match(settings,/public notes remain discoverable/);
});
