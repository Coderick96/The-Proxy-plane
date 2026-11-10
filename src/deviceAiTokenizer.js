import {Tokenizer} from '@huggingface/tokenizers';
// CLIP layout: Xenova/clip-vit-large-patch14, revision c307790166907339eed5a9a53a249af534102536.
// The vocabulary/merges are supplied from the pinned diffusion model, not fetched here.
export function createDeviceTokenizer(vocab,mergesText){
 if(!vocab||Array.isArray(vocab)||vocab['<|startoftext|>']!==49406||vocab['<|endoftext|>']!==49407||typeof mergesText!=='string')throw new Error('The device model tokenizer is incomplete. Clear its download and retry.');
 const merges=mergesText.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
 const added_tokens=[['<|startoftext|>',49406],['<|endoftext|>',49407]].map(([content,id])=>({id,content,single_word:false,lstrip:false,rstrip:false,normalized:id===49406,special:true}));
 const tokenizer=new Tokenizer({version:'1.0',truncation:null,padding:null,added_tokens,
  normalizer:{type:'Sequence',normalizers:[{type:'NFC'},{type:'Replace',pattern:{Regex:'\\s+'},content:' '},{type:'Lowercase'}]},
  pre_tokenizer:{type:'Sequence',pretokenizers:[{type:'Split',pattern:{Regex:"'s|'t|'re|'ve|'m|'ll|'d|[\\p{L}]+|[\\p{N}]|[^\\s\\p{L}\\p{N}]+"},behavior:'Removed',invert:true},{type:'ByteLevel',add_prefix_space:false,trim_offsets:true,use_regex:true}]},
  post_processor:{type:'RobertaProcessing',sep:['<|endoftext|>',49407],cls:['<|startoftext|>',49406],trim_offsets:false,add_prefix_space:false},
  decoder:{type:'ByteLevel',add_prefix_space:true,trim_offsets:true,use_regex:true},
  model:{type:'BPE',dropout:null,unk_token:'<|endoftext|>',continuing_subword_prefix:'',end_of_word_suffix:'</w>',fuse_unk:false,byte_fallback:false,vocab,merges}
 },{add_prefix_space:false,bos_token:'<|startoftext|>',eos_token:'<|endoftext|>',pad_token:'<|endoftext|>',unk_token:'<|endoftext|>',do_lower_case:true,model_max_length:77,tokenizer_class:'CLIPTokenizer',clean_up_tokenization_spaces:true});
 return prompt=>{
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>1000)throw new Error('Enter an artwork prompt of 1–1,000 characters.');
  const raw=tokenizer.encode(prompt).ids,ids=raw.slice(0,77);
  if(raw.length>77)ids[76]=49407;
  while(ids.length<77)ids.push(49407);
  if(ids[0]!==49406||ids.some(id=>!Number.isInteger(id)||id<0||id>49407))throw new Error('The device tokenizer returned invalid tokens.');
  return BigInt64Array.from(ids,id=>BigInt(id));
 };
}
