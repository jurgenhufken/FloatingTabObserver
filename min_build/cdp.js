import http from 'node:http'
const PORTS = Array.from({ length: 9 }, (_, i) => 9222 + i)
function get(u){return new Promise(r=>{const q=http.get(u,(res)=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{r(JSON.parse(d))}catch{r(null)}})});q.on('error',()=>r(null));q.setTimeout(400,()=>{try{q.destroy()}catch{};r(null)})})}
export async function findChromiumTabByTitle(title){for(const p of PORTS){const list=await get(`http://127.0.0.1:${p}/json/list`);if(!Array.isArray(list))continue;const canon=s=>(s||'').trim();let t=list.find(t=>canon(t.title)===canon(title));if(!t)t=list.find(t=>canon(title).includes(canon(t.title))||canon(t.title).includes(canon(title)));if(t)return{port:p,url:t.url||'',audible:!!t.audible}}return{port:0,url:'',audible:false}}
