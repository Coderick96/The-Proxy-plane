export const AVATARS={crown:'♛',crystal:'◇',moon:'☾',shield:'⬡',spark:'✦',book:'▤'};
export function visibility(value){return value==='public'?'public':'private';}
export function effectivePublic(card,collections,profile){const collection=collections.find(c=>c.id===card.collectionId);return visibility(card.visibility)==='public'&&profile?.is_public===true&&(!card.collectionId||collection?.visibility==='public');}
export function check(result){if(result.error)throw result.error;return result.data;}
export function setupError(error){const message=error?.message||'The Gathering Plane could not load.';return /does not exist|schema cache|Could not find.*pk_|relation.*pk_/i.test(message)?'Community setup is not finished yet. Your device vault and editor still work. See COMMUNITY_SETUP.md in the project.':message;}
export async function getProfile(client,id){return check(await client.from('pk_profiles').select('*').eq('id',id).maybeSingle());}
export async function saveProfile(client,user,profile){const username=profile.username.trim().toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(username))throw new Error('Use 3–24 lowercase letters, numbers or underscores for your Cardsmith name.');return check(await client.from('pk_profiles').upsert({id:user.id,username,display_name:profile.display_name.trim().slice(0,64),bio:profile.bio.slice(0,500),avatar:profile.avatar,is_public:profile.is_public,theme:profile.theme||'classic',banner_text:(profile.banner_text||'').slice(0,80),featured_ids:profile.featured_ids||[],showcase_layout:profile.showcase_layout||'grid'}).select().single());}
export async function saveCollections(client,user,collections){if(!collections.length)return;check(await client.from('pk_collections').upsert(collections.map(c=>({id:c.id,user_id:user.id,name:c.name,visibility:visibility(c.visibility)}))));}
const digest=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function listCloudProjects(client,userId,stillCurrent=()=>true){try{const rows=[];for(let offset=0;offset<10000;offset+=500){if(!stillCurrent())return {data:null,error:null};const batch=check(await client.from('proxy_kingdom_projects').select('*').eq('user_id',userId).order('updated_at',{ascending:false}).order('id').range(offset,offset+499));rows.push(...batch);if(batch.length<500)break;}return {data:rows,error:null}}catch(error){return {data:null,error}}}
export async function cloudProject(client,user,card,collections=[]){
 await saveCollections(client,user,collections);
 const payload={...card,cloudOwnerId:user.id};
 if(typeof payload.art==='string'&&payload.art.startsWith('data:')){const blob=await (await fetch(payload.art)).blob();const ext=blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png';const path=`${user.id}/${card.id}/${await digest(blob)}.${ext}`;check(await client.storage.from('proxy-kingdom-art').upload(path,blob,{contentType:blob.type,upsert:true}));payload.art='';payload.artStoragePath=path;}
 if(payload.back?.mode==='custom'&&payload.back.image?.startsWith('data:')){const blob=await (await fetch(payload.back.image)).blob();const path=`${user.id}/${card.id}/back-${await digest(blob)}.${blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png'}`;check(await client.storage.from('proxy-kingdom-art').upload(path,blob,{contentType:blob.type,upsert:true}));payload.back={...payload.back,image:'',imageStoragePath:path};}
 if(payload.artStoragePath)payload.art='';if(payload.back?.imageStoragePath)payload.back={...payload.back,image:''};
 check(await client.from('proxy_kingdom_projects').upsert({id:card.id,user_id:user.id,title:card.name||'Untitled card',project_json:payload,visibility:visibility(card.visibility),collection_id:card.collectionId||null,published_at:card.publishedAt||null,updated_at:new Date().toISOString()}));return payload;
}
export async function updatePrivacy(client,user,card,collections){
 // Save collection settings before changing the card metadata.
 if(card.cloudOwnerId&&card.cloudOwnerId!==user.id)throw new Error('Sign in with this card’s Cardsmith account to change its privacy.');
 await saveCollections(client,user,collections);
 const rows=check(await client.from('proxy_kingdom_projects').update({visibility:visibility(card.visibility),collection_id:card.collectionId||null}).eq('id',card.id).eq('user_id',user.id).select('id'));
 if(card.publishedAt&&!rows?.length)throw new Error('The published card was not found in this account. Sign in with its Cardsmith account.');
 return rows;
}
export async function publishCard(client,user,card,collections,blob,details){
 if(card.origin?.provider==='Proxxied'&&!card.origin.rightsConfirmed)throw new Error('Confirm permission to share this imported proxy first.');
 const profile=await getProfile(client,user.id);if(!profile)throw new Error('Create your Cardsmith profile in the Kingdom first.');if(!profile.is_public)throw new Error('Make your Cardsmith profile public before posting to the Kingdom.');
 const collection=collections.find(c=>c.id===card.collectionId);if(card.collectionId&&collection?.visibility!=='public')throw new Error('Choose a public collection, or move the card out of its private collection, before posting.');
 // Hide the existing publication before replacing its snapshot; failed uploads stay private.
 await cloudProject(client,user,{...card,visibility:'private'},collections);
 try {
 const image_path=`${user.id}/${card.id}.png`;
 check(await client.storage.from('proxy-kingdom-community').upload(image_path,blob,{contentType:'image/png',upsert:true,cacheControl:'0'}));
 check(await client.from('pk_posts').upsert({project_id:card.id,owner_id:user.id,title:(card.name||'Untitled card').slice(0,120),caption:details.caption.slice(0,1000),artist_credit:(card.artist||'').slice(0,200),origin_credit:(card.origin?.creator||'').slice(0,200),source_url:card.origin?.sourceUrl||'',kind:details.kind,image_path,updated_at:new Date().toISOString()}));
 check(await client.from('proxy_kingdom_projects').update({visibility:'public',published_at:new Date().toISOString()}).eq('id',card.id).eq('user_id',user.id).select('id').single());
 }catch(error){error.cardMadePrivate=true;throw error;}
}
export async function gallery(client,{creator=null,collection=null,following=false,offset=0}={}){
 return check(await client.rpc('pk_gallery',{creator_filter:creator,collection_filter:collection,following_only:following,page_offset:offset}))||[];
}
export async function setFollow(client,user,target,following){
 if(target===user.id)throw new Error('You cannot follow yourself.');
 if(following)check(await client.from('pk_follows').delete().eq('follower_id',user.id).eq('creator_id',target));
 else check(await client.from('pk_follows').insert({follower_id:user.id,creator_id:target}));
}
