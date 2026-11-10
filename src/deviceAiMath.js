// LCMScheduler-compatible SD 1.5 schedule for the pinned DreamShaper 8 LCM export.
export const LCM_TIMESTEPS=Object.freeze([999,759,499,259]);
export function alphaSchedule(){
 const values=new Float64Array(1000);let product=1;
 const first=Math.sqrt(.00085),last=Math.sqrt(.012);
 for(let i=0;i<1000;i++){const beta=(first+(last-first)*i/999)**2;product*=1-beta;values[i]=product;}
 return values;
}
export const LCM_ALPHAS=alphaSchedule();
export function seededGaussian(seed){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('Use an unsigned 32-bit generation seed.');
 let state=seed>>>0;
 const uniform=()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return (((t^(t>>>14))>>>0)+.5)/4294967296;};
 return count=>{if(!Number.isInteger(count)||count<0)throw new Error('Invalid noise shape.');const data=new Float32Array(count);for(let i=0;i<count;i+=2){const radius=Math.sqrt(-2*Math.log(uniform())),angle=2*Math.PI*uniform();data[i]=radius*Math.cos(angle);if(i+1<count)data[i+1]=radius*Math.sin(angle);}return data;};
}
export function lcmStep(sample,epsilon,timestep,nextTimestep,noise){
 if(sample.length!==epsilon.length||!LCM_TIMESTEPS.includes(timestep))throw new Error('Invalid LCM sample.');
 const alpha=LCM_ALPHAS[timestep],rootAlpha=Math.sqrt(alpha),rootBeta=Math.sqrt(1-alpha),scaled=10*timestep;
 const skip=.25/(scaled*scaled+.25),out=scaled/Math.sqrt(scaled*scaled+.25),result=new Float32Array(sample.length);
 const final=nextTimestep===null||nextTimestep===undefined;
 if(!final&&(!LCM_TIMESTEPS.includes(nextTimestep)||nextTimestep>=timestep||noise?.length!==sample.length))throw new Error('Invalid LCM continuation.');
 const nextA=final?0:Math.sqrt(LCM_ALPHAS[nextTimestep]),nextB=final?0:Math.sqrt(1-LCM_ALPHAS[nextTimestep]);
 for(let i=0;i<sample.length;i++){
  const denoised=out*(sample[i]-rootBeta*epsilon[i])/rootAlpha+skip*sample[i];
  const value=final?denoised:nextA*denoised+nextB*noise[i];
  if(!Number.isFinite(value)||Math.abs(value)>3.4028234663852886e38)throw new Error('The GPU returned invalid image values. Try another prompt or device.');result[i]=value;
 }
 return result;
}
export function decodedPixels(values,width=512,height=512){
 if(!(values instanceof Float32Array)||values.length!==3*width*height)throw new Error('Unexpected image decoder output.');
 const count=width*height,pixels=new Uint8ClampedArray(count*4);
 for(let i=0;i<count;i++){
  for(let c=0;c<3;c++){const value=values[c*count+i];if(!Number.isFinite(value))throw new Error('The GPU returned invalid image pixels.');pixels[4*i+c]=Math.max(0,Math.min(255,Math.round((value/2+.5)*255)));}
  pixels[4*i+3]=255;
 }
 return pixels;
}

export async function deviceSeeds(operationId){
 if(typeof operationId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId))throw new Error('A valid authorized request ID is required.');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(operationId.toLowerCase()));const view=new DataView(digest);return [view.getUint32(0,true),view.getUint32(4,true),view.getUint32(8,true)];
}
