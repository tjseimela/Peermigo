const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=name=>fs.readFileSync(path.join(root,name),'utf8');
test('Notes Feed labels are updated while existing tabs retain stable IDs',()=>{
  const html=file('notes.html');
  assert.match(html,/<title>Peermigo \| Notes Feed<\/title>/);
  assert.match(html,/<h1>Notes Feed<\/h1>/);
  assert.match(html,/id="pmCreateNoteShortcut"[^>]*>\+ Create Note<\/button>/);
  assert.match(html,/data-notes-tab="discover"[^>]*>Discover<\/button>/);
  assert.match(html,/data-notes-tab="mine"[^>]*>My Notes<\/button>/);
});
test('Desktop messages retain existing controls and receive a new stylesheet',()=>{
  const html=file('messages.html');
  for(const id of ['messageForm','messageBody','emojiPickerToggle','chatFileInput','chatFilesChosen','sendMessageBtn']) assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/href="desktop-message-composer\.css"/);
  const css=file('desktop-message-composer.css');
  assert.match(css,/@media \(min-width: 721px\)/);
  assert.match(css,/#messageForm #messageBody/);
  assert.match(css,/html\[data-theme="dark"\]/);
  assert.doesNotMatch(css,/@media\s*\(max-width:\s*720px\)/);
});
test('Existing private-message input script supports multiline growth without changing send shortcut',()=>{
  const code=file('peer-mobile-chat.js');
  assert.match(code,/Math\.min\(144,Math\.max\(48,field\.scrollHeight\)\)/);
  assert.match(code,/Math\.min\(146,Math\.max\(54,field\.scrollHeight\)\)/);
  assert.match(code,/field\.form\?\.requestSubmit\(\)/);
});
