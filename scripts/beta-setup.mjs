import 'dotenv/config';
import {createServices} from '../server/premium.js';
const env=process.env;
if(env.BETA_MODE!=='true'||!env.OWNER_USER_ID||!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY){console.error('Set BETA_MODE=true, OWNER_USER_ID, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first. See BETA_SETUP.md.');process.exit(1)}
try{const services=createServices(env);await services.rpc('pp_beta_configure',{owner:env.OWNER_USER_ID});const c=await services.rpc('pp_beta_status',{});if(!c?.enabled||c.ownerId!==env.OWNER_USER_ID)throw new Error('Beta configuration did not match.');console.log('Private beta configured: 10 tester slots plus the owner. Sign in as owner and open Beta desk to add approved emails. No invitations were sent.');}catch(e){console.error('Beta setup failed:',e.message);process.exitCode=1}
