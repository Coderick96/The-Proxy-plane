import React from 'react';
import {symbolClass} from './mana.js';
export {symbolClass} from './mana.js';
export function SymbolText({text=''}){
 return String(text).split(/(\{[^}]+\})/g).map((part,index)=>{
  const token=part.startsWith('{')?part.slice(1,-1):null;
  if(token&&/^h[wubrg]$/i.test(token))return <span key={index} className="ms-half" role="img" aria-label={token}><i className={`ms ms-${token.slice(1).toLowerCase()} ms-cost`}/></span>;
  if(token&&/^\d+$/.test(token)&&!symbolClass(token))return <span key={index} className="pk-number-mana" role="img" aria-label={`${token} generic mana`}>{token}</span>;
  const name=token&&symbolClass(token);
  return name?<i key={index} className={`ms ms-${name} ms-cost`} role="img" aria-label={token} title={token}/>:part;
 });
}
