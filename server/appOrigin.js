// Hosting supplies VERCEL_URL; never derive checkout/OAuth destinations from client headers.
export function appOrigin(env){
 if(env.VERCEL_ENV==='preview'&&/^[a-z0-9-]+\.vercel\.app$/i.test(env.VERCEL_URL||''))return 'https://'+env.VERCEL_URL.toLowerCase();
 return env.CLIENT_ORIGIN||'http://127.0.0.1:5173';
}
