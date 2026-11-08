import {createApp} from '../server/index.js';

// The web server owns the socket; preserve the existing Express routes and raw webhook body.
export default createApp({env:{...process.env,SERVERLESS_MODE:'true'}});
