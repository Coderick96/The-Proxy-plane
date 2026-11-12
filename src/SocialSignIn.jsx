import React from 'react';
export default function SocialSignIn({disabled=false,onSignIn,googleEnabled=true,appleEnabled=true}){
 const providers=[['google','Google',googleEnabled],['apple','Apple',appleEnabled]];
 return <><div className="social-login">{providers.map(([id,label,enabled])=><button key={id} type="button" className="secondary full-width" disabled={disabled||!enabled} onClick={()=>{if(enabled&&!disabled)onSignIn(id)}}>Continue with {label}</button>)}</div>{providers.filter(([, ,enabled])=>!enabled).map(([id,label])=><p key={id} className="auth-note">{label} sign-in is currently unavailable. Use another sign-in option.</p>)}</>;
}
