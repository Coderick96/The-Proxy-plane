// Compatibility for the existing Vercel project's server-only legacy secret name.
// A public/anon key under this name must never be promoted to an admin credential.
export function serverAccountKey(env){
 if(env.SUPABASE_SERVICE_ROLE_KEY)return env.SUPABASE_SERVICE_ROLE_KEY;
 const legacy=env.supabase;
 if(typeof legacy!=='string')return undefined;
 if(/^sb_secret_[A-Za-z0-9_-]+$/.test(legacy))return legacy;
 try{
  const parts=legacy.split('.');
  if(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(legacy)&&parts.length===3&&JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8')).role==='service_role')return legacy;
 }catch{/* Invalid legacy configuration stays disconnected. */}
 return undefined;
}
