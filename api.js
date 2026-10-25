/* Peermigo: Supabase-backed platform. All student data is stored in Supabase. */
window.PM = window.PM || {};
// Compatibility engine is loaded from matching.js after data.js.
PM.backend = {
  mode:'live',client:null,user:null,
  async init() {
    const c=window.PEER_MATCH_CONFIG||{};
    if(c.supabaseUrl && c.supabaseAnonKey){
      try {
        const mod=await import('https://esm.sh/@supabase/supabase-js@2');
        this.client=mod.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
        const {data,error}=await this.client.auth.getUser();if(error && error.name!=='AuthSessionMissingError') console.warn('Session:',error.message);
        this.user=data?.user||null;
        this.client.auth.onAuthStateChange((_event,session)=>{if(_event==='PASSWORD_RECOVERY')this.recoveryEvent=true;this.user=session?.user||null; window.dispatchEvent(new Event('pm-auth-changed'));});
      }catch(error){this.connectionError=error.message;}
    } else {
      this.connectionError='The service is temporarily unavailable.';
    }
    return this;
  },
  requireClient(){if(!this.client)throw new Error('Unable to connect to Supabase. Check the URL/key and internet connection.');return this.client;},
  requireUser(){if(!this.user)throw new Error('Sign in to use this feature.');},
  identity(){return this.user?.id||null;},
  async signUp(email,password,studentDetails){
    if(!studentDetails)throw new Error('Enter your student profile details to create an account.');
    const {data,error}=await this.requireClient().auth.signUp({
      email,password,
      options:{data:{
        full_name:PM.formatPersonName(studentDetails.full_name),
        given_names:studentDetails.given_names,
        surname:studentDetails.surname,
        institution_type:studentDetails.institution_type,
        institution:studentDetails.institution,
        campus:studentDetails.campus,
        course:studentDetails.course,
        modules:studentDetails.modules,
        study_method:studentDetails.study_method,
        discoverable:studentDetails.discoverable
      }}
    });
    if(error)throw error;
    return data;
  },
  async sendPasswordReset(email){
    const redirectTo = new URL('reset-password.html', location.href).href;
    const {error} = await this.requireClient().auth.resetPasswordForEmail(email, {redirectTo});
    if(error) throw error;
  },
  async updatePassword(password){
    const {error} = await this.requireClient().auth.updateUser({password});
    if(error) throw error;
  },
  async signIn(email,password){const {data,error}=await this.requireClient().auth.signInWithPassword({email,password});if(error)throw error;this.user=data.user;return data;},
  async signOut(){const {error}=await this.requireClient().auth.signOut();if(error)throw error;this.user=null;},
  async profile(){if(!this.user)return null;const {data,error}=await this.requireClient().from('profiles').select('*').eq('id',this.user.id).maybeSingle();if(error)throw error;return data;},
  async saveProfile(p){
    this.requireUser();const safe={id:this.user.id,full_name:PM.formatPersonName(p.full_name),given_names:p.given_names,surname:p.surname,institution_type:p.institution_type,institution:p.institution,campus:p.campus,course:p.course,modules:p.modules,availability:p.availability,study_method:p.study_method,about:p.about};
    const current=await this.profile();let result;if(current){const {id,...changes}=safe;result=await this.requireClient().from('profiles').update(changes).eq('id',this.user.id);}else{result=await this.requireClient().from('profiles').insert(safe);}if(result.error)throw result.error;
  },
  async peers(){
    this.requireUser();const all=[];const perPage=200;
    for(let offset=0;offset<6000;offset+=perPage){
      const {data,error}=await this.requireClient().from('profiles').select('id,full_name,institution_type,institution,campus,course,modules,availability,study_method,about,is_verified,avatar_path,discoverable,show_activity,last_seen_at').order('full_name').range(offset,offset+perPage-1);
      if(error)throw error;
      all.push(...(data||[]));if((data||[]).length<perPage)break;
    }
    return all;},
  async searchStudents(query){
    this.requireUser();
    // Keep PostgREST OR syntax safe: don't accept its separator characters in search text.
    const q=String(query||'').normalize('NFKC').replace(/[^\p{L}\p{N} '\-]/gu,'').trim().slice(0,64);
    if(q.length<2)return [];
    const term=`%${q}%`;
    const {data,error}=await this.requireClient().from('profiles')
      .select('id,full_name,institution,campus,course,avatar_path,is_verified,discoverable')
      .eq('discoverable',true)
      .or(`full_name.ilike.${term},institution.ilike.${term},campus.ilike.${term},course.ilike.${term}`)
      .order('full_name',{ascending:true}).limit(10);
    if(error)throw error;
    return (data||[]).filter(p=>p.id!==this.user.id&&p.discoverable!==false);
  },
  async searchStudyGroups(query){
    this.requireUser();
    const q=String(query||'').normalize('NFKC').replace(/[^\p{L}\p{N} '&\-]/gu,'').trim().slice(0,64);
    if(q.length<2)return [];
    const term=`%${q}%`;
    const {data,error}=await this.requireClient().from('study_groups')
      .select('id,name,module,institution,campus,description,created_by')
      .or(`name.ilike.${term},description.ilike.${term},module.ilike.${term},institution.ilike.${term},campus.ilike.${term}`)
      .order('created_at',{ascending:false}).limit(8);
    if(error)throw error;
    return data||[];
  },
  async searchGroupsPage(query,page=0,pageSize=9){
    this.requireUser();
    const term=String(query||'').normalize('NFKC').replace(/[^\p{L}\p{N} '&\-]/gu,'').trim().slice(0,64);
    if(term.length<2)return {rows:[],count:0};
    const size=Math.max(3,Math.min(Number(pageSize)||9,24));
    const current=Math.max(0,Math.floor(Number(page)||0));
    const filter=`%${term}%`;
    const {data,count,error}=await this.requireClient().from('study_groups')
      .select('id,name,description,module,institution,campus,created_at',{count:'exact'})
      .or(`name.ilike.${filter},description.ilike.${filter},module.ilike.${filter},institution.ilike.${filter},campus.ilike.${filter}`)
      .order('created_at',{ascending:false}).range(current*size,current*size+size-1);
    if(error)throw error;
    return {rows:data||[],count:count||0};
  },
  async studentProfile(id){
    this.requireUser();
    if(!/^[0-9a-f-]{36}$/i.test(String(id||'')))return null;
    const {data,error}=await this.requireClient().from('profiles').select('*').eq('id',id).maybeSingle();
    if(error)throw error;return data;
  },
  async directoryPage({page=0,pageSize=18,search='',institution='',method='',availability='',sameCampus=false,sameCourse=false,sort='az',me=null,excludedIds=[]}={}){
    this.requireUser();
    const size=Math.max(6,Math.min(Number(pageSize)||18,36));
    const current=Math.max(0,Math.floor(Number(page)||0));
    const fields='id,full_name,institution_type,institution,campus,course,modules,availability,study_method,about,is_verified,avatar_path,discoverable,created_at';
    const blocked=excludedIds.filter(id=>/^[0-9a-f-]{36}$/i.test(id));
    const term=String(search||'').normalize('NFKC').replace(/[^\p{L}\p{N} '\-]/gu,'').trim().slice(0,64);
    if(sameCampus && (!me?.institution || !me?.campus))return {rows:[],count:0};
    if(sameCourse && !me?.course)return {rows:[],count:0};

    // Re-create the same filtered query for every batch of a match-ranked
    // directory. Sorting only the current page would be incorrect: a high
    // match on a later alphabetic page must also be able to appear first.
    const buildQuery=()=>{
      let query=this.requireClient().from('profiles').select(fields,{count:'exact'})
        .eq('discoverable',true).neq('id',this.user.id);
      if(blocked.length)query=query.not('id','in',`(${blocked.join(',')})`);
      if(term){
        // Searches for common abbreviations also find the official institution name.
        const other=PM.institutionVariants(term).filter(x=>PM.normalize(x)!==PM.normalize(term))
          .slice(0,12).map(x=>'institution.ilike."'+x.replace(/"/g,'')+'"');
        query=query.or([`full_name.ilike.%${term}%`,`course.ilike.%${term}%`,`institution.ilike.%${term}%`,`campus.ilike.%${term}%`,...other].join(','));
      }
      if(institution)query=PM.applyInstitutionQuery(query,institution.trim());
      if(method)query=query.eq('study_method',method);
      if(availability)query=query.eq('availability',availability);
      // Campus/course quick filters are applied after canonicalization below.
      // Raw SQL equality would miss valid equivalent names/courses.
      if(sameCampus)query=PM.applyInstitutionQuery(query,me.institution);
      return query;
    };

    if(sort==='match'||sameCampus||sameCourse){
      // Include the viewer's matching inputs and all filters in the cache key.
      // The short cache lets page 2/3 reuse the same GLOBAL ranking.
      const cacheKey=JSON.stringify({user:this.user.id,term,institution,method,availability,sameCampus,sameCourse,
        blocked:[...blocked].sort(),sort,me:me?{id:me.id,institution:me.institution,campus:me.campus,
          modules:me.modules,availability:me.availability,study_method:me.study_method,course:me.course}:null});
      let saved=this._matchDirectoryCache;
      if(!saved || saved.key!==cacheKey || Date.now()-saved.savedAt>60000){
        const batchSize=500;
        const students=[];
        let total=null;
        for(let offset=0;;offset+=batchSize){
          const {data,count,error}=await buildQuery().order('id',{ascending:true}).range(offset,offset+batchSize-1);
          if(error)throw error;
          if(total===null && count!==null && count!==undefined)total=count;
          const batch=data||[];
          students.push(...batch);
          if(!batch.length || (total!==null && students.length>=total) || (total===null && batch.length<batchSize))break;
        }
        let selected=students.filter(peer=>{
          if(sameCampus && !(PM.institutionKey(peer.institution)===PM.institutionKey(me.institution)
            && PM.campusKey(peer.campus)===PM.campusKey(me.campus)))return false;
          if(sameCourse && PM.MatchingV2.courseKey(peer.course)!==PM.MatchingV2.courseKey(me.course))return false;
          return true;
        });
        const scoreById=new Map(selected.map(row=>[row.id,PM.displayStudentMatch(row,me)]));
        selected.sort((a,b)=>(sort==='match'?(scoreById.get(b.id)-scoreById.get(a.id)):
          sort==='newest' ? String(b.created_at||'').localeCompare(String(a.created_at||'')):
          sort==='za' ? String(b.full_name||'').localeCompare(String(a.full_name||''),'en',{sensitivity:'base'}):
          String(a.full_name||'').localeCompare(String(b.full_name||''),'en',{sensitivity:'base'}))
          || String(a.full_name||'').localeCompare(String(b.full_name||''),'en',{sensitivity:'base'})
          || String(a.id).localeCompare(String(b.id)));
        saved={key:cacheKey,savedAt:Date.now(),rows:selected};
        this._matchDirectoryCache=saved;
      }
      return {rows:saved.rows.slice(current*size,(current+1)*size),count:saved.rows.length};
    }

    // Preserve the existing alternative orderings: A-Z, Z-A and newest.
    const orderKey=sort==='newest'?'created_at':'full_name';
    const ascending=sort==='az';
    const {data,count,error}=await buildQuery().order(orderKey,{ascending:sort==='newest'?false:ascending})
      .order('id',{ascending:true}).range(current*size,current*size+size-1);
    if(error)throw error;
    return {rows:data||[],count:count||0};
  },
  async recommendedDirectoryPeers(me,excludedIds=[]){
    this.requireUser();
    if(!me || !(me.course || (Array.isArray(me.modules)&&me.modules.length)))return [];
    const fields='id,full_name,institution_type,institution,campus,course,modules,availability,study_method,about,is_verified,avatar_path,discoverable';
    const blocked=new Set(excludedIds);
    const students=[];
    // Recommendations must compare students across institutions for online
    // learning, and globally rank the candidates rather than taking the first
    // 80 profiles alphabetically/by signup time.
    const batchSize=300;
    for(let offset=0;offset<6000;offset+=batchSize){
      const {data,error}=await this.requireClient().from('profiles').select(fields)
        .eq('discoverable',true).neq('id',this.user.id)
        .order('id',{ascending:true}).range(offset,offset+batchSize-1);
      if(error)throw error;
      const batch=data||[];
      students.push(...batch.filter(peer=>!blocked.has(peer.id)));
      if(batch.length<batchSize)break;
      if(offset+batchSize>=6000)console.warn('Peermigo: client-side recommendation scan reached its 6,000-profile safety limit. Server-side matching is recommended at scale.');
    }
    return students.filter(peer=>PM.matchDetails(peer,me).eligible)
      .sort((a,b)=>PM.scoreStudentMatch(b,me)-PM.scoreStudentMatch(a,me)
        || String(a.id).localeCompare(String(b.id))).slice(0,60);
  },
  async profilesByIds(ids){
    this.requireUser();if(!ids?.length)return [];
    const fields='id,full_name,institution,campus,course,is_verified,avatar_path,show_activity,last_seen_at';
    const result=[];
    for(let i=0;i<ids.length;i+=100){
      const {data,error}=await this.requireClient().from('profiles').select(fields).in('id',ids.slice(i,i+100));
      if(error)throw error;result.push(...(data||[]));
    }
    return result;
  },
  async messagesWith(peerId){
    this.requireUser();const me=this.user.id;const {data,error}=await this.requireClient().from('messages').select('*').or(`and(sender_id.eq.${me},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${me})`).order('created_at',{ascending:true}).limit(300);if(error)throw error;return data||[];},
  async unreadMessageCount(){
    this.requireUser();
    const {count,error}=await this.requireClient().from('messages')
      .select('id',{count:'exact',head:true})
      .eq('recipient_id',this.user.id)
      .is('read_at',null);
    if(error)throw error;
    return count||0;
  },
  async inbox(){
    this.requireUser();const {data,error}=await this.requireClient().from('messages').select('*').order('created_at',{ascending:false}).limit(300);if(error)throw error;return data||[];},
  async sendMessage(peerId,content){
    
    this.requireUser();const {data,error}=await this.requireClient().from('messages').insert({sender_id:this.user.id,recipient_id:peerId,body:content}).select().single();if(error)throw error;return data;},
  async markMessageRead(ids){if(!ids.length)return;const {error}=await this.requireClient().from('messages').update({read_at:new Date().toISOString()}).in('id',ids).eq('recipient_id',this.user.id);if(error)throw error;},
  async savedItems(){
    this.requireUser();
    const {data,error}=await this.requireClient().from('pm_saved_items')
      .select('id,user_id,note_id,resource_key,created_at')
      .eq('user_id',this.user.id).order('created_at',{ascending:false}).limit(500);
    if(error)throw error;
    return data||[];
  },
  async savedItemCount(){
    this.requireUser();
    const {count,error}=await this.requireClient().from('pm_saved_items')
      .select('id',{head:true,count:'exact'}).eq('user_id',this.user.id);
    if(error)throw error;
    return count||0;
  },
  async saveItem(kind,key){
    this.requireUser();
    const row={user_id:this.user.id};
    if(kind==='note'){
      if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(key))throw new Error('Invalid note.');
      row.note_id=key;
    } else if(kind==='resource'){
      if(!['pomodoro','active-recall','spaced-repetition','khan-academy','coursera','mdn','w3schools','tutorialspoint'].includes(key))throw new Error('Unknown resource.');
      row.resource_key=key;
    } else throw new Error('Unknown saved item type.');
    const {error}=await this.requireClient().from('pm_saved_items').insert(row);
    if(error && error.code!=='23505')throw error;
  },
  async unsaveItem(kind,key){
    this.requireUser();
    const col=kind==='note'?'note_id':kind==='resource'?'resource_key':null;
    if(!col)throw new Error('Unknown saved item type.');
    const {error}=await this.requireClient().from('pm_saved_items')
      .delete().eq('user_id',this.user.id).eq(col,key);
    if(error)throw error;
  },
  async publicSavedNotes(ids){
    this.requireUser();if(!ids?.length)return [];
    const out=[];
    for(let i=0;i<ids.length;i+=100){
      const {data,error}=await this.requireClient().from('student_notes')
        .select('id,author_id,topic,body,created_at,visibility')
        .in('id',ids.slice(i,i+100)).eq('visibility','public');
      if(error)throw error;out.push(...(data||[]));
    }
    return out;
  },
  async groups(){this.requireUser();const {data,error}=await this.requireClient().from('study_groups').select('*').order('created_at',{ascending:false}).limit(200);if(error)throw error;return data||[];},
  async groupBans(groupId){
    
    this.requireUser();
    const {data,error}=await this.requireClient().from('group_bans').select('group_id,user_id,banned_at').eq('group_id',groupId);
    if(error)throw error;
    const users=(data||[]).map(x=>x.user_id);
    if(!users.length)return [];
    const {data:profiles,error:pe}=await this.requireClient().from('profiles').select('id,full_name').in('id',users);
    if(pe)throw pe;
    const names=new Map((profiles||[]).map(x=>[x.id,x.full_name]));
    return (data||[]).map(x=>({...x,full_name:names.get(x.user_id)||'Student'}));
  },
  async unbanGroupMember(groupId,userId){
    
    this.requireUser();
    const {data,error}=await this.requireClient().from('group_bans').delete().eq('group_id',groupId).eq('user_id',userId).select('user_id');
    if(error)throw error;if(!data?.length)throw new Error('Unable to lift this group restriction.');
  },
  async groupRoster(groupId){
    
    this.requireUser();
    const {data,error}=await this.requireClient().from('group_members').select('group_id,user_id,joined_at').eq('group_id',groupId).order('joined_at');
    if(error)throw error;
    const userIds=(data||[]).map(m=>m.user_id);
    if(!userIds.length)return [];
    const {data:profiles,error:profileError}=await this.requireClient().from('profiles').select('id,full_name').in('id',userIds);
    if(profileError)throw profileError;
    const names=new Map((profiles||[]).map(x=>[x.id,x.full_name]));
    return (data||[]).map(m=>({...m,full_name:names.get(m.user_id)||'Student'}));
  },
  async editGroup(groupId,changes){
    
    this.requireUser();
    const {data,error}=await this.requireClient().from('study_groups').update(changes).eq('id',groupId).eq('created_by',this.user.id).select('id');
    if(error)throw error;if(!data?.length)throw new Error('Could not update this group. Ensure the group-admin SQL upgrade has been applied.');
  },
  async deleteGroup(groupId){
    
    this.requireUser();const {data,error}=await this.requireClient().from('study_groups').delete().eq('id',groupId).eq('created_by',this.user.id).select('id');
    if(error)throw error;if(!data?.length)throw new Error('Group deletion was not permitted. Check your group-admin SQL upgrade.');
  },
  async removeGroupMember(groupId,userId){
    if(userId===this.identity())throw new Error('The group owner cannot remove their own membership.');
    
    this.requireUser();const {data,error}=await this.requireClient().from('group_members').delete().eq('group_id',groupId).eq('user_id',userId).select('user_id');
    if(error)throw error;if(!data?.length)throw new Error('Could not remove that member. Check your group-admin SQL upgrade.');
  },
  async deleteGroupPost(groupId,postId){
    
    this.requireUser();const {data,error}=await this.requireClient().from('group_posts').delete().eq('group_id',groupId).eq('id',postId).select('id');
    if(error)throw error;if(!data?.length)throw new Error('Post removal was not permitted. Check group-admin permissions.');
  },
  async groupMemberships(){this.requireUser();const {data,error}=await this.requireClient().from('group_members').select('group_id,user_id').eq('user_id',this.user.id);if(error)throw error;return data||[];},
  async createGroup(g){
    this.requireUser();const {data,error}=await this.requireClient().from('study_groups').insert({...g,created_by:this.user.id}).select().single();if(error)throw error;return data;},
  async joinGroup(groupId){
    this.requireUser();const {error}=await this.requireClient().from('group_members').insert({group_id:groupId,user_id:this.user.id});if(error)throw error;},
  async leaveGroup(groupId){
    this.requireUser();const {error}=await this.requireClient().from('group_members').delete().eq('group_id',groupId).eq('user_id',this.user.id);if(error)throw error;},
  async groupPosts(groupId){this.requireUser();const {data,error}=await this.requireClient().from('group_posts').select('id,group_id,author_id,body,created_at').eq('group_id',groupId).order('created_at',{ascending:true}).limit(100);if(error)throw error;return data||[];},
  async addGroupPost(groupId,body){
    this.requireUser();const {data,error}=await this.requireClient().from('group_posts').insert({group_id:groupId,author_id:this.user.id,body}).select('id').single();if(error)throw error;return data;},
  async sessions(){
    this.requireUser();const {data,error}=await this.requireClient().from('study_sessions').select('*').gte('ends_at',new Date().toISOString()).order('starts_at').limit(200);if(error)throw error;return data||[];},
  async sessionRsvps(){this.requireUser();const {data,error}=await this.requireClient().from('session_rsvps').select('session_id,user_id').eq('user_id',this.user.id);if(error)throw error;return data||[];},
  async createSession(s){
    this.requireUser();const {data,error}=await this.requireClient().from('study_sessions').insert({...s,creator_id:this.user.id}).select().single();if(error)throw error;return data;},
  async editSession(sessionId,changes){
    
    this.requireUser();const {data,error}=await this.requireClient().from('study_sessions').update(changes).eq('id',sessionId).select('id');
    if(error)throw error;if(!data?.length)throw new Error('Session update was not permitted. Check group-admin SQL permissions.');
  },
  async deleteSession(sessionId){
    
    this.requireUser();const {data,error}=await this.requireClient().from('study_sessions').delete().eq('id',sessionId).select('id');
    if(error)throw error;if(!data?.length)throw new Error('Session deletion was not permitted. Check group-admin SQL permissions.');
  },
  async rsvp(sessionId){
    this.requireUser();const {error}=await this.requireClient().from('session_rsvps').insert({session_id:sessionId,user_id:this.user.id});if(error)throw error;},
  async cancelRsvp(sessionId){
    this.requireUser();const {error}=await this.requireClient().from('session_rsvps').delete().eq('session_id',sessionId).eq('user_id',this.user.id);if(error)throw error;},
  async notifications(){
    this.requireUser();
    // Notifications is for groups, sessions and notes. Incoming chat messages
    // belong in Messages (unread count is read directly from the messages table).
    // Leave the message notification records untouched: the existing server-side
    // email webhook uses them for independently configurable message emails.
    const prefs=await this.getAppPreferences();
    const enabledKinds=['groups','sessions','notes'].filter(category=>prefs[category]);
    const kinds=enabledKinds.map(category=>({groups:'group',sessions:'session',notes:'note'})[category]);
    kinds.push('connect', 'moderation'); // Essential moderation notices cannot be disabled by optional preferences.
    const {data,error}=await this.requireClient().from('notifications')
      .select('*').eq('user_id',this.user.id).eq('in_app_visible',true).in('kind',kinds)
      .order('created_at',{ascending:false}).limit(100);
    if(error)throw error;return data||[];
  },
  async markNotificationRead(ids){
    this.requireUser();if(!ids.length)return;const {error}=await this.requireClient().from('notifications').update({is_read:true}).in('id',ids).eq('user_id',this.user.id);if(error)throw error;},
  async blockPeer(peerId){
    this.requireUser();const {error}=await this.requireClient().from('blocked_users').insert({blocker_id:this.user.id,blocked_id:peerId});if(error && error.code!=='23505')throw error;},
  async blockedPeers(){this.requireUser();const {data,error}=await this.requireClient().from('blocked_users').select('blocked_id');if(error)throw error;return (data||[]).map(x=>x.blocked_id);},
  async blockedProfiles(){
    this.requireUser();
    const {data:blocks,error}=await this.requireClient().from('blocked_users')
      .select('blocked_id,created_at').eq('blocker_id',this.user.id).order('created_at',{ascending:false});
    if(error)throw error;
    const ids=(blocks||[]).map(row=>row.blocked_id);
    if(!ids.length)return [];
    const {data:people,error:profileError}=await this.requireClient().from('profiles')
      .select('id,full_name,institution,avatar_path').in('id',ids);
    if(profileError)throw profileError;
    const byId=new Map((people||[]).map(p=>[p.id,p]));
    return (blocks||[]).map(b=>({...b,profile:byId.get(b.blocked_id)||null}));
  },
  async unblockPeer(peerId){
    this.requireUser();
    if(!/^[0-9a-f-]{36}$/i.test(String(peerId||'')))throw new Error('Invalid student.');
    const {data,error}=await this.requireClient().from('blocked_users').delete()
      .eq('blocker_id',this.user.id).eq('blocked_id',peerId).select('blocked_id');
    if(error)throw error;
    if(!data?.length)throw new Error('This student is not on your blocked list.');
  },
  async requestEmailChange(email){
    this.requireUser();
    const cleaned=String(email||'').trim().toLowerCase();
    const redirect=new URL('settings-account.html',location.href).href;
    const {error}=await this.requireClient().auth.updateUser({email:cleaned},{emailRedirectTo:redirect});
    if(error)throw error;
  },
  async verifyPassword(password){
    this.requireUser();
    const id=this.user.id,email=this.user.email;
    if(!email)throw new Error('No email address is linked to your account.');
    const {data,error}=await this.requireClient().auth.signInWithPassword({email,password});
    if(error)throw error;
    if(!data.user || data.user.id!==id)throw new Error('Account verification failed.');
    this.user=data.user;
  },
  async setAccountDeactivated(deactivated){
    this.requireUser();
    const {data,error}=await this.requireClient().rpc('pm_set_account_deactivated',{should_deactivate:Boolean(deactivated)});
    if(error)throw error;
    return data;
  },
  async permanentlyDeleteAccount(password){
    this.requireUser();
    const {data,error}=await this.requireClient().functions.invoke('manage-peer-account',{
      method:'POST',body:{action:'delete',password,confirmation:'DELETE'}
    });
    if(error)throw new Error('Account deletion could not be completed. Check that the secure account-management function is deployed: '+error.message);
    if(!data?.deleted)throw new Error(data?.error||'The server did not confirm that your account was deleted.');
    await this.requireClient().auth.signOut({scope:'local'}).catch(()=>{});
    this.user=null;
  },
  async reportPeer(peerId,reason){
    this.requireUser();const {error}=await this.requireClient().from('reports').insert({reporter_id:this.user.id,reported_id:peerId,reason});if(error)throw error;}
};
