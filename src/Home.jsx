import React, {useEffect, useState} from 'react';
import {ArrowRight, BookOpen, ChevronRight, Compass, Gem, Layers, Printer, Search, Sparkles, WandSparkles} from 'lucide-react';
import staples from './homeStaples.json';
import {usePremium} from './PremiumContext.jsx';
import './home.css';

const paths = [
 {id:'vault', icon:Layers, title:'My Vault', text:'Your saved cards, ready for the next idea.'},
 {id:'studio', icon:WandSparkles, title:'AI Art Studio', text:'Open the studio for artwork and editable drafts.'},
 {id:'kingdom', icon:Compass, title:'Gathering Plane', text:'Discover creations and the Cardsmiths behind them.'},
 {id:'premium', icon:Gem, title:'Premium', text:'Explore membership, tools and credit options.'}
];

export default function Home({saved=[], onNavigate, onOpen, client=null, user=null, onSignIn, onOpenAI}) {
 const {access} = usePremium();
 const [featured, setFeatured] = useState([]);
 const recent = saved.slice(0,3);
 useEffect(() => {
  let active = true;
  const urls = new Set();
  setFeatured([]);
  if (!client?.rpc) return;
  Promise.resolve().then(() => client.rpc('pp_home_featured')).then(async ({data,error}) => {
   if (error || !Array.isArray(data)) return;
   const loaded = await Promise.all(data.slice(0,3).map(async card => {
    try {
     const {data:blob,error:readError} = await client.storage.from('proxy-kingdom-community').download(card.image_path);
     if (readError || !blob || !active) return null;
     const image = URL.createObjectURL(blob);
     urls.add(image);
     return {...card,image};
    } catch { return null; }
   }));
   if (active) setFeatured(loaded.filter(Boolean));
  }).catch(() => {});
  return () => { active=false; urls.forEach(url => URL.revokeObjectURL(url)); };
 },[client]);
 const welcome = staples.map((card,index) => {
  const spot = featured.find(item => item.slot === index+1);
  return spot ? {name:spot.title,image:spot.image,artist:spot.artist_credit,creator:'@'+spot.username} : card;
 });
 const name = user?.user_metadata?.display_name || user?.user_metadata?.full_name;
 return <main className="page-wrap plane-home" id="main-content" tabIndex={-1}>
  <section className="plane-hero" aria-labelledby="plane-title">
   <div className="plane-hero-copy">
    <div className="plane-kicker"><span aria-hidden="true">✦</span> YOUR CARDS. YOUR ART. YOUR WORLD.</div>
    <h1 id="plane-title">A new plane<br/>of <em>possibility.</em></h1>
    <p className="plane-intro">Welcome to <strong>The Proxy Plane.</strong> Find a favorite, forge something of your own, and bring your next deck to life.</p>
    <div className="plane-primary-actions">
     <button className="plane-button plane-button-primary" onClick={() => onNavigate('library')}><Search size={18} aria-hidden="true"/> Search Cards <ArrowRight size={18} aria-hidden="true"/></button>
     <button className="plane-button plane-button-secondary" onClick={() => onNavigate('studio')}><Sparkles size={18} aria-hidden="true"/> Create a Card</button>
     <button className="plane-print-link" onClick={() => onNavigate('print')}><Printer size={18} aria-hidden="true"/> Print Proxies <ArrowRight size={16} aria-hidden="true"/></button>
    </div>
    <div className="plane-hero-notes"><span><i aria-hidden="true"/> Free core editor</span><span>Private until you share</span></div>
   </div>
   <div className="plane-hero-art">
    <div className="plane-portal" aria-hidden="true"><span>✦</span></div>
    <div className="plane-card-fan" aria-label={featured.length?'Cardsmith spotlight':'Commander staples'}>
     {welcome.map((card,index) => <div className={'plane-showcase-card plane-showcase-'+index} key={index}><img src={card.image} alt={card.name} width="200" height="279" decoding="async"/></div>)}
    </div>
    <span className="plane-showcase-label"><span aria-hidden="true">✦</span> {featured.length?'CARDSMITH SPOTLIGHT':'A LITTLE COMMANDER INSPIRATION'}</span>
   </div>
   <div className="plane-art-credits">{welcome.map((card,index) => <span key={index}>{card.url?<a href={card.url} target="_blank" rel="noreferrer">{card.name}</a>:<b>{card.name} · {card.creator}</b>} <span>· {card.artist||'See card credit'}</span></span>)}</div>
  </section>

  <section className="plane-account-strip" aria-label="Your workspace">
   <div className="plane-workspace-mark" aria-hidden="true">◇</div>
   <div><strong>{user ? (name ? `Welcome back, ${name}.` : 'Your account is signed in.') : 'Your next great card starts here.'}</strong><p>{user ? 'Open your vault to manage saved cards.' : client?.auth ? 'Create on this device. Sign in to access your private cloud vault.' : 'Device workspace available. Cloud sign-in is not configured in this build.'}</p></div>
   {user ? <button className="plane-inline-button" onClick={() => onNavigate('vault')}>Open My Vault <ArrowRight size={16} aria-hidden="true"/></button> : onSignIn ? <button className="plane-inline-button" onClick={onSignIn} disabled={!client?.auth}>Sign in <ArrowRight size={16} aria-hidden="true"/></button> : <button className="plane-inline-button" onClick={() => onNavigate('vault')}>Explore My Vault <ArrowRight size={16} aria-hidden="true"/></button>}
  </section>

  <nav className="plane-destinations" aria-label="Explore The Proxy Plane">
   {paths.map(({id,icon:Icon,title,text}) => <button className="plane-destination" key={title} onClick={() => title==='AI Art Studio' && onOpenAI ? onOpenAI() : onNavigate(id)}><span className="plane-destination-icon"><Icon size={22} aria-hidden="true"/></span><span className="plane-destination-copy"><strong>{title}</strong><span>{text}</span></span><ChevronRight className="plane-destination-arrow" size={18} aria-hidden="true"/></button>)}
  </nav>

  <section className="plane-how" aria-labelledby="plane-how-title">
   <div className="plane-section-heading"><div><div className="plane-kicker">FROM INSPIRATION TO THE TABLE</div><h2 id="plane-how-title">Make it yours. Then make it real.</h2></div><span className="plane-section-caption">A little inspiration. A lot of possibility.</span></div>
   <div className="plane-steps">
    <article><span className="plane-step-number">01</span><BookOpen size={23} aria-hidden="true"/><h3>Find your starting point</h3><p>Search Magic cards and alternate printings, import a deck, or start with a blank canvas.</p><button onClick={() => onNavigate('deck')}>Import a deck <ArrowRight size={15} aria-hidden="true"/></button></article>
    <article><span className="plane-step-number">02</span><Sparkles size={23} aria-hidden="true"/><h3>Give it your signature</h3><p>Make the artwork, frame, symbols and text your own. Save your creation before moving on.</p><button onClick={() => onNavigate('studio')}>Open the editor <ArrowRight size={15} aria-hidden="true"/></button></article>
    <article><span className="plane-step-number">03</span><Printer size={23} aria-hidden="true"/><h3>Bring it to the table</h3><p>Build a print queue and export a PDF. Use 100% scale and check a test sheet before a full deck.</p><button onClick={() => onNavigate('print')}>Set up your print <ArrowRight size={15} aria-hidden="true"/></button></article>
   </div>
  </section>

  <section className="plane-workbench" aria-labelledby="plane-workbench-title">
   <div className="plane-section-heading"><div><div className="plane-kicker">YOUR WORKBENCH</div><h2 id="plane-workbench-title">{recent.length?'Pick up where inspiration left you.':'Room for your next creation.'}</h2></div><button className="plane-inline-button" onClick={() => onNavigate('vault')}>View vault <ArrowRight size={16} aria-hidden="true"/></button></div>
   {recent.length ? <div className="plane-recent">{recent.map(card => <button key={card.id} onClick={() => onOpen(card)}><span className="plane-recent-glyph" aria-hidden="true">✧</span><span><strong>{card.name||'Untitled card'}</strong><small>{card.visibility==='public'?'Public setting':'Private'} · Continue editing</small></span><ArrowRight size={18} aria-hidden="true"/></button>)}</div> : <div className="plane-empty"><span aria-hidden="true">✧</span><div><h3>A blank canvas is a good beginning.</h3><p>Save a card in the studio and find it here next time. Device saves stay on this browser.</p></div><button className="plane-button plane-button-secondary" onClick={() => onNavigate('studio')}>Create your first card <ArrowRight size={16} aria-hidden="true"/></button></div>}
  </section>

  <section className="plane-plans" aria-labelledby="plane-plans-title">
   <div className="plane-plan-copy"><div className="plane-kicker">MORE ROOM TO CREATE</div><h2 id="plane-plans-title">Start freely.<br/>Explore your possibilities.</h2><p>The core editor, standard exports and community sharing are free. AI features require a connected account and available credits.</p><button className="plane-inline-button" onClick={() => onNavigate('premium')}>View Premium & credits <ArrowRight size={16} aria-hidden="true"/></button></div>
   <div className="plane-plan-details">
    <article><span className="plane-plan-tag">FREE ACCOUNT</span><h3>10 starter credits</h3><p>Once per account. No daily or weekly refill.</p></article>
    <article><span className="plane-plan-tag">PREMIUM MEMBERSHIP</span><h3>200 credits / paid month</h3><p>Unused monthly credits expire at the billing period end. Purchased credits carry forward.</p></article>
    <p className="plane-plan-note">{user ? access?.policyVersion===30 && Number.isFinite(access?.credits) ? <>Account balance: <strong>{access.credits} credits</strong>. </> : 'Account balance unavailable. Open Premium to refresh. ' : 'Sign in to view your balance. '}Plans and credit packs depend on service availability. Check Premium for current options; no purchase is made here.</p>
   </div>
  </section>

  <footer className="plane-footer"><div><img src="/proxy-plane-icon-v4.png" alt="" width="32" height="32" loading="lazy"/><strong>THE PROXY PLANE</strong><span>by ChaseCreates</span></div><p>A fan-made creative tool, unaffiliated with and not endorsed by Wizards of the Coast. Magic: The Gathering and related marks belong to Wizards of the Coast. Proxies are for personal play; check with your playgroup and event rules.</p></footer>
 </main>;
}
