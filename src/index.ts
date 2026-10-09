import{shell,receiptShell}from'@lapxo/topos/capsule';
import type{Asked}from'@lapxo/topos/capsule';
import{alphabet}from'@lapxo/topos/wire';
import * as r0 from './regions/github-actions.ts';
import * as r1 from './regions/ignore.ts';
import * as r2 from './regions/publish-auth-is-trusted.ts';
type Fields=Readonly<Record<string,string>>;
const provided=(asked:Asked):readonly Fields[]=>{const lines=(asked as Asked & {provider?:{lines?:readonly Fields[]}}).provider?.lines;if(lines===undefined)throw Error('REFUSE·world provider standing not handed');return lines;};
const own=(lines:readonly Fields[]):readonly Fields[]=>lines.filter(f=>['form','prose','notation','wire'].includes((f.scope??'').split('/')[0]!));
const readsOf=(lines:readonly Fields[],name:string,role:string):readonly string[]=>lines.filter(f=>f.scope==='region/'+name&&f.role===role&&f.measure==='reads').flatMap(f=>alphabet(f.value??'').members);
export const render=(asked:Asked)=>{const lines=provided(asked);return shell({
  "github-actions":{reads:readsOf(lines,"github-actions","render"),region:(a:Asked)=>r0.render({...a,lines:[...a.lines,...own(lines)]})},
  "ignore":{reads:readsOf(lines,"ignore","render"),region:(a:Asked)=>r1.render({...a,lines:[...a.lines,...own(lines)]})},
})(asked);};
export const receipt=(asked:Asked)=>{const lines=provided(asked);return receiptShell({
  "publish-auth-is-trusted":{reads:readsOf(lines,"publish-auth-is-trusted","receipt"),region:(a:Asked)=>r2.receipt({...a,lines:[...a.lines,...own(lines)]})},
})(asked);};
