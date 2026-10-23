/* Peer Match social extensions. Uses the existing authenticated Supabase client. */
(() => {
 const db=window.PM.backend;
 const allowed = new Set(['image/jpeg','image/png','image/webp','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
 const avatarTypes = new Set(['image/jpeg','image/png','image/webp']);
 db.avatarCache={};
 db.avatarPending={};
 db.avatarUrl=async function(path){
  if(!path)return null;
  if(this.avatarCache[path] && this.avatarCache[path].until>Date.now())return this.avatarCache[path].url;
  if(this.avatarPending[path])return this.avatarPending[path];
  const pending=(async()=>{const {data,error}=await this.requireClient().storage.from('pm-avatars').createSignedUrl(path,1200);if(error)throw error;this.avatarCache[path]={url:data.signedUrl,until:Date.now()+1100*1000};return data.signedUrl})();
  this.avatarPending[path]=pending;try{return await pending}finally{delete this.avatarPending[path]}
 };
 db.uploadAvatar=async function(file){
  this.requireUser();
  if(!avatarTypes.has(file.type)||file.size>3*1024*1024||file.size===0)throw new Error('Choose a JPG, PNG or WebP under 3 MB.');
  const current=await this.profile();if(!current)throw new Error('Save your student profile before uploading a photo.');
  const prev=current.avatar_path;
  const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[file.type];
  const path=`${this.user.id}/${crypto.randomUUID()}.${ext}`;
  const {error:uploadError}=await this.requireClient().storage.from('pm-avatars').upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError)throw uploadError;
  const {error}=await this.requireClient().from('profiles').update({avatar_path:path}).eq('id',this.user.id);
  if(error){await this.requireClient().storage.from('pm-avatars').remove([path]);throw error;}
  if(prev)await this.requireClient().storage.from('pm-avatars').remove([prev]).catch(()=>{});
  return path;
 };
 db.removeAvatar=async function(){this.requireUser();const old=(await this.profile())?.avatar_path;if(!old)return;
  const {error}=await this.requireClient().from('profiles').update({avatar_path:null}).eq('id',this.user.id);if(error)throw error;
  await this.requireClient().storage.from('pm-avatars').remove([old]);delete this.avatarCache[old];
 };
 db.saveDiscoverability=async function(discoverable,show_activity){
  this.requireUser();
  const {error}=await this.requireClient().from('profiles').update({discoverable,show_activity,...(!show_activity?{last_seen_at:null}:{})}).eq('id',this.user.id);if(error)throw error;
 };
 db.touchPresence=async function(){
  if(!this.user)return;
  const {error}=await this.requireClient().from('profiles').update({last_seen_at:new Date().toISOString()}).eq('id',this.user.id);
  if(error)console.warn('Presence update:',error.message);
 };
 db.notes=async function(authorId,includePrivate=false){
  
  this.requireUser();let q=this.requireClient().from('student_notes').select('*').eq('author_id',authorId).order('created_at',{ascending:false}).limit(100);
  if(!includePrivate)q=q.eq('visibility','public');const {data,error}=await q;if(error)throw error;return data||[];
 };
 db.createNote=async function(note){
  
  this.requireUser();const {data,error}=await this.requireClient().from('student_notes').insert({...note,author_id:this.user.id}).select().single();if(error)throw error;return data;
 };
 db.editNote=async function(id,changes){
  
  this.requireUser();const {data,error}=await this.requireClient().from('student_notes').update(changes).eq('id',id).eq('author_id',this.user.id).select().single();if(error)throw error;return data;
 };
 db.deleteNote=async function(id){
  
  this.requireUser();const files=await this.attachments('note',id);
  const {error}=await this.requireClient().from('student_notes').delete().eq('id',id).eq('author_id',this.user.id);if(error)throw error;
  // Storage objects cannot be cascade-deleted by SQL; best effort cleanup.
  if(files.length)await this.requireClient().storage.from('pm-files').remove(files.map(f=>f.storage_path));
 };
 db.attachments=async function(kind,id){
  
  this.requireUser();const col=({note:'note_id',message:'message_id',post:'post_id'})[kind];if(!col)throw new Error('Invalid attachment type.');
  const {data,error}=await this.requireClient().from('pm_attachments').select('id,owner_id,file_name,mime_type,file_size,storage_path,created_at').eq(col,id).order('created_at');if(error)throw error;return data||[];
 };
 db.attachmentsForMany=async function(kind,ids){
  const map={};if(!ids?.length)return map;
  this.requireUser();const col=({note:'note_id',message:'message_id',post:'post_id'})[kind];if(!col)throw new Error('Invalid attachment type.');
  for(let i=0;i<ids.length;i+=100){
   const {data,error}=await this.requireClient().from('pm_attachments').select(`id,owner_id,${col},file_name,mime_type,file_size,storage_path`).in(col,ids.slice(i,i+100));
   if(error)throw error;
   for(const item of data||[])(map[item[col]]??=[]).push(item);
  }
  return map;
 };
 db.uploadAttachments=async function(kind,parentId,files){
  this.requireUser();
  const col=({note:'note_id',message:'message_id',post:'post_id'})[kind];const folder=({note:'notes',message:'messages',post:'groups'})[kind];
  if(!col)throw new Error('Invalid attachment type.');
  const list=Array.from(files||[]);if(list.length>5)throw new Error('Attach up to 5 files at a time.');
  for(const f of list)if(!allowed.has(f.type)||f.size>10*1024*1024||f.size===0)throw new Error(`${f.name}: unsupported type or larger than 10 MB.`);
  const saved=[];
  for(const file of list){
   const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100)||'attachment';
   const path=`${folder}/${this.user.id}/${crypto.randomUUID()}-${safeName}`;
   const {error:up}=await this.requireClient().storage.from('pm-files').upload(path,file,{contentType:file.type,upsert:false});if(up)throw up;
   const record={owner_id:this.user.id,[col]:parentId,storage_path:path,file_name:file.name.slice(0,180),mime_type:file.type,file_size:file.size};
   // Do not use INSERT ... RETURNING *: returning also requires a SELECT policy.
   // The guarded INSERT policy validates that this user authored the parent record.
   const {error}=await this.requireClient().from('pm_attachments').insert(record);
   if(error){
     await this.requireClient().storage.from('pm-files').remove([path]).catch(()=>{});
     if(error.code==='42501'||/row.level security|permission denied/i.test(error.message||''))
       throw new Error('Attachment blocked by Supabase permissions. Run supabase/upgrade-attachment-permissions.sql, then try again.');
     throw error;
   }
   saved.push(record);
  }
  return saved;
 };
 db.attachmentUrl=async function(path){
  const {data,error}=await this.requireClient().storage.from('pm-files').createSignedUrl(path,120);
  if(error)throw error;return data.signedUrl;
 };
 db.removeAttachment=async function(item){
  this.requireUser();if(item.owner_id!==this.user.id)throw new Error('Only the uploader can remove this attachment.');
  const {error}=await this.requireClient().storage.from('pm-files').remove([item.storage_path]);if(error)throw error;
  const result=await this.requireClient().from('pm_attachments').delete().eq('id',item.id);if(result.error)throw result.error;
 };
 db.getEmailPreferences=async function(){
  const defaults={messages:false,groups:false,sessions:false,notes:false};
  
  this.requireUser();const {data,error}=await this.requireClient().from('notification_preferences').select('*').eq('user_id',this.user.id).maybeSingle();if(error)throw error;return {...defaults,...(data||{})};
 };
 db.setEmailPreferences=async function(prefs){
  
  this.requireUser();const {error}=await this.requireClient().from('notification_preferences').upsert({user_id:this.user.id,...prefs},{onConflict:'user_id'});if(error)throw error;
 };

 // In-app preferences are separate from email preferences. The notification
 // records remain available for Brevo's existing server-side email webhook.
 db.getAppPreferences=async function(force=false){
  this.requireUser();
  if(!force&&this.appPrefsCache?.userId===this.user.id&&this.appPrefsCache?.expires>Date.now())return this.appPrefsCache.value;
  const defaults={groups:true,sessions:true,notes:false};
  const {data,error}=await this.requireClient().from('notification_preferences')
    .select('in_app_groups,in_app_sessions,in_app_notes').eq('user_id',this.user.id).maybeSingle();
  if(error)throw error;
  const prefs={groups:data?.in_app_groups??defaults.groups,sessions:data?.in_app_sessions??defaults.sessions,notes:data?.in_app_notes??defaults.notes};
  this.appPrefsCache={userId:this.user.id,value:prefs,expires:Date.now()+12000};
  return prefs;
 };
 db.setAppPreferences=async function(prefs){
  this.requireUser();
  const keys=['groups','sessions','notes'];
  const record={user_id:this.user.id};
  for(const key of keys)record['in_app_'+key]=prefs[key]===true;
  const {error}=await this.requireClient().from('notification_preferences').upsert(record,{onConflict:'user_id'});
  if(error)throw error;
  this.appPrefsCache={userId:this.user.id,value:Object.fromEntries(keys.map(key=>[key,record['in_app_'+key]])),expires:Date.now()+12000};
 };
})();
