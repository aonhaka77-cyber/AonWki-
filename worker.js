const ORIGIN="https://raw.githubusercontent.com/aonhaka77-cyber/AonWki-/main";
const MIME={".html":"text/html; charset=utf-8",".htm":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".wasm":"application/wasm",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".ico":"image/x-icon",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
async function listDocs(kv){const docs={};let cursor;do{const page=await kv.list({prefix:"doc:",limit:1000,cursor});for(const item of page.keys){const value=await kv.get(item.name,{type:"json"});if(value)docs[decodeURIComponent(item.name.slice(4))]=value}cursor=page.list_complete?undefined:page.cursor}while(cursor);return docs}
async function api(request,env,url){
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Methods":"GET, PUT, OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});
 const parts=url.pathname.split("/").filter(Boolean);
 if(parts[1]==="docs"&&parts.length===2&&request.method==="GET")return json(await listDocs(env.WIKI));
 if(parts[1]==="export"&&request.method==="GET"){const documents=await listDocs(env.WIKI),history={};for(const title of Object.keys(documents))history[title]=await env.WIKI.get("history:"+encodeURIComponent(title),{type:"json"})||[];return json({documents,history})}
 if(parts[1]==="docs"&&parts.length>=3){let title;try{title=decodeURIComponent(parts.slice(2).join("/"))}catch{return json({error:"invalid title"},400)}const key="doc:"+encodeURIComponent(title);
  if(request.method==="GET"){const doc=await env.WIKI.get(key,{type:"json"});return doc?json(doc):json({error:"not found"},404)}
  if(request.method==="PUT"){const raw=await request.text();if(raw.length>1000000)return json({error:"document too large"},413);let doc;try{doc=JSON.parse(raw)}catch{return json({error:"invalid JSON"},400)}if(!doc||typeof doc.source!=="string"||title.length>100)return json({error:"invalid document"},400);doc.title=title;doc.updated=doc.updated||new Date().toISOString();await env.WIKI.put(key,JSON.stringify(doc));return json({ok:true,title})}
 }
 if(parts[1]==="history"&&parts.length>=3){let title;try{title=decodeURIComponent(parts.slice(2).join("/"))}catch{return json({error:"invalid title"},400)}const key="history:"+encodeURIComponent(title);
  if(request.method==="GET")return json(await env.WIKI.get(key,{type:"json"})||[]);
  if(request.method==="PUT"){const raw=await request.text();if(raw.length>500000)return json({error:"history too large"},413);let items;try{items=JSON.parse(raw)}catch{return json({error:"invalid JSON"},400)}if(!Array.isArray(items))return json({error:"expected array"},400);await env.WIKI.put(key,JSON.stringify(items.slice(0,30)));return json({ok:true})}
 }
 return json({error:"not found"},404)
}
async function handle(request,env){
 const url=new URL(request.url);
 if(url.pathname==="/api"||url.pathname.startsWith("/api/"))return api(request,env,url);
 let pathname;try{pathname=decodeURIComponent(url.pathname)}catch{return new Response("Bad Request",{status:400})}
 if(pathname==="/")pathname="/index.html";
 if(pathname.includes("..")||pathname.includes("\\")||pathname.includes("\0"))return new Response("Bad Request",{status:400});
 const ext=pathname.toLowerCase().slice(pathname.lastIndexOf("."));
 const noCache=[".html",".htm",".js",".mjs"].includes(ext);
 const upstream=await fetch(ORIGIN+pathname+url.search,{method:request.method==="HEAD"?"HEAD":"GET",headers:{Accept:request.headers.get("Accept")||"*/*"},cf:noCache?{cacheTtl:0,cacheEverything:false}:{cacheTtl:60,cacheEverything:true}});
 const headers=new Headers(upstream.headers);
 if(MIME[ext])headers.set("Content-Type",MIME[ext]);
 headers.set("Cache-Control",noCache?"no-store, no-cache, must-revalidate":"public, max-age=60, s-maxage=60");
 headers.set("X-Content-Type-Options","nosniff");headers.delete("content-security-policy");
 return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers});
}
export default {fetch:handle};