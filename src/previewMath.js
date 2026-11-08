export const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function dragGeometry(layer,dx,dy,width,height,resize=false){
 if(width<=0||height<=0)return {};
 if(!resize)return {x:clamp(layer.x+dx/width*100,-100,200),y:clamp(layer.y+dy/height*100,-100,200)};
 const angle=(layer.rotation||0)*Math.PI/180;
 return {w:clamp(layer.w+(dx*Math.cos(angle)+dy*Math.sin(angle))/width*100,.25,200),h:clamp(layer.h+(-dx*Math.sin(angle)+dy*Math.cos(angle))/height*100,.25,200)};
}
