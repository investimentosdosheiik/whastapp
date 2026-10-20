(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.CRMModel=model})(typeof window==='object'?window:this,function(){
 'use strict';
 const fields=['status','priority','site','due','notes','value'];
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const changes=(local,base)=>fields.filter(k=>!same(local[k],base[k]));
 function rebase(baseList,localList,remoteList){
  const bases=new Map(baseList.map(l=>[l.id,l])),locals=new Map(localList.map(l=>[l.id,l])),remoteIds=new Set(remoteList.map(l=>l.id)),conflicts=[];
  const leads=remoteList.map(remote=>{const base=bases.get(remote.id),local=locals.get(remote.id);if(!base||!local)return structuredClone(remote);const merged=structuredClone(remote),dirty=changes(local,base);for(const field of dirty){if(!same(remote[field],base[field])&&!same(remote[field],local[field]))conflicts.push({id:remote.id,field,local:local[field],remote:remote[field]});merged[field]=local[field]}return merged});
  for(const local of localList){if(remoteIds.has(local.id))continue;const base=bases.get(local.id);if(!base)leads.push(structuredClone(local));else if(changes(local,base).length){leads.push(structuredClone(local));conflicts.push({id:local.id,removed:true})}}
  return{leads,conflicts};
 }
 return{fields,same,changes,rebase};
});
