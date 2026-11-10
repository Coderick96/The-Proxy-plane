import * as ort from 'onnxruntime-web/webgpu';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import runtimeUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
// ORT 1.27 /webgpu uses the native WebGPU EP (Asyncify), not the older JS EP (JSEP).
export function configureDeviceRuntime(){
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
 ort.env.wasm.wasmPaths={wasm:wasmUrl,mjs:runtimeUrl};return ort;
}
const join=(...parts)=>Uint8Array.from(parts.flatMap(p=>Array.from(p)));
const integer=value=>{const bytes=[];do{let b=value&127;value>>>=7;if(value)b|=128;bytes.push(b)}while(value);return Uint8Array.from(bytes)};
const scalar=(field,value)=>join(integer(field*8),integer(value));
const message=(field,value)=>join(integer(field*8+2),integer(value.length),value);
const text=(field,value)=>message(field,new TextEncoder().encode(value));
// A real, weight-free ONNX Add graph: output = input + 1.5. It exercises runtime/backend initialization.
export function runtimeProbeModel(){
 const type=message(1,join(scalar(1,1),message(2,message(1,scalar(1,1)))));
 const info=name=>join(text(1,name),message(2,type));
 const data=new Uint8Array(4);new DataView(data.buffer).setFloat32(0,1.5,true);
 const node=join(text(1,'x'),text(1,'bias'),text(2,'y'),text(4,'Add'));
 const bias=join(scalar(1,1),scalar(2,1),message(4,data),text(8,'bias'));
 const graph=join(message(1,node),text(2,'ProxyPlaneWebGPUProbe'),message(5,bias),message(11,info('x')),message(12,info('y')));
 return join(scalar(1,8),text(2,'The Proxy Plane'),message(7,graph),message(8,scalar(2,17)));
}
export async function verifyDeviceRuntime(runtime){
 const session=await runtime.InferenceSession.create(runtimeProbeModel(),{executionProviders:['webgpu'],graphOptimizationLevel:'all'});
 let outputs;const input=new runtime.Tensor('float32',Float32Array.of(2),[1]);
 try{outputs=await session.run({x:input});if(outputs.y?.data?.[0]!==3.5)throw new Error('The GPU runtime self-check returned an incorrect result.');}
 finally{input.dispose();for(const value of Object.values(outputs||{}))value.dispose();await session.release();}
}
