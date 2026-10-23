'use strict';
/* Peer Match connection requests. Database RLS and triggers own access and alerts. */
(() => {
 const db=window.PM?.backend;if(!db)return;
 db.connectionRequests=async function(){
  this.requireUser();const user=this.identity();
  const {data,error}=await this.requireClient().from('connection_requests')
   .select('id,sender_id,recipient_id,status,created_at')
   .or(`sender_id.eq.${user},recipient_id.eq.${user}`)
   .order('created_at',{ascending:false}).limit(1000);
  if(error)throw error;return data||[];
 };
 db.connectionWith=function(rows,peerId){
  const self=this.identity();
  return (rows||[]).find(row=>(row.sender_id===self&&row.recipient_id===peerId)||
   (row.recipient_id===self&&row.sender_id===peerId))||null;
 };
 db.sendConnectionRequest=async function(peerId){
  this.requireUser();if(!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(peerId))throw new Error('Invalid student profile.');
  if(peerId===this.identity())throw new Error('You cannot connect with yourself.');
  const {data,error}=await this.requireClient().from('connection_requests')
   .insert({sender_id:this.identity(),recipient_id:peerId}).select('id,status').single();
  if(error){if(error.code==='23505')throw new Error('A connection request has already been sent to this student.');
   if(error.code==='42P01'||error.code==='42501'||error.code==='42703')throw new Error('Connection requests require the Supabase SQL setup. Run upgrade-connection-requests.sql first.');
   throw error;}
  return data;
 };
 db.respondConnectionRequest=async function(requestId,accept){
  this.requireUser();
  const {data,error}=await this.requireClient().from('connection_requests')
   .update({status:accept?'accepted':'declined'})
   .eq('id',requestId).eq('recipient_id',this.identity()).eq('status','pending')
   .select('id,status').maybeSingle();
  if(error)throw error;
  if(!data)throw new Error('This request was already answered or is no longer available.');
  return data;
 };
 window.PM.connectionAction=(row,ownId)=>{
  if(!row)return {label:'Connect',state:'new',disabled:false};
  if(row.status==='accepted')return {label:'Connected',state:'accepted',disabled:true};
  if(row.sender_id===ownId){
   return row.status==='pending'?{label:'Requested',state:'pending',disabled:true}:{label:'Not accepted',state:'declined',disabled:true};
  }
  return row.status==='pending'?{label:'Respond',state:'received',disabled:false}:{label:'Connect',state:'new',disabled:false};
 };
})();
