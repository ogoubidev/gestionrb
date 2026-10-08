import { z } from "zod";
import { PDFDocument } from "pdf-lib";
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{
  const d=new Date(s+"T12:00:00Z");
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s&&s>="1000-01-01"&&s<="9998-12-31";
},"Date invalide");
const finite=z.number().finite();
const guides=z.object({
  date:finite.min(0).max(99),valueDate:finite.min(0).max(99),label:finite.min(0).max(99),
  debit:finite.min(0).max(99),credit:finite.min(0).max(99),balance:finite.min(0).max(99),
  startY:finite.min(0),endY:finite.max(100),lineHeight:finite.positive()
}).refine(g=>g.startY<g.endY&&g.lineHeight<=g.endY-g.startY,"Repères invalides");
const patch=z.object({page:z.number().int().positive(),x:finite.min(0),y:finite.min(0),width:finite.positive(),height:finite.positive(),png:z.string().startsWith("data:image/png;base64,").max(2000000)}).refine(p=>p.x+p.width<=100.000001&&p.y+p.height<=100.000001,"Retouche hors page");
const schema=z.object({
  format:z.literal("gestion-rb"),version:z.literal(1),patches:z.array(patch).max(100).optional(),
  opening:finite,startDate:date,endDate:date,
  rows:z.array(z.object({id:z.number().int().positive(),date,valueDate:date,label:z.string().trim().min(1).max(1000),type:z.enum(["credit","debit"]),amount:finite.nonnegative()})).max(100000),
  baseGuides:guides,pageGuides:z.record(z.string().regex(/^[1-9]\d*$/),guides),
  fontSize:finite.min(4).max(24),
  summaryX:finite.min(-8).max(8).optional(),summaryY:finite.min(-10).max(70).optional(),footerX:finite.min(-8).max(8).optional(),footerY:finite.min(-1).max(90).optional(),
  summarySize:finite.min(7).max(14).optional(),footerLabel:z.string().trim().min(1).max(60).optional(),
  pdf:z.object({name:z.string().max(255),base64:z.string().max(40000000)}).nullable()
}).refine(s=>s.startDate<=s.endDate,"La fin doit suivre le début")
.refine(s=>new Set(s.rows.map(r=>r.id)).size===s.rows.length,"Identifiants de lignes dupliqués");
export type StatementBackup=z.infer<typeof schema>;
export function encodePdf(bytes:ArrayBuffer):string{
  const data=new Uint8Array(bytes);let binary="";
  for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192));
  return btoa(binary);
}
export function serializeBackup(data:StatementBackup):string{
  const text=JSON.stringify(schema.parse(data),null,2);
  if(new TextEncoder().encode(text).length>45000000)throw new Error("Sauvegarde trop volumineuse (45 Mo maximum).");
  return text;
}
export async function parseBackup(text:string){
  if(text.length>45000000)throw new Error("Sauvegarde trop volumineuse (45 Mo maximum).");
  let data:StatementBackup;
  try{data=schema.parse(JSON.parse(text));}
  catch{throw new Error("Sauvegarde invalide ou version non prise en charge. Vérifie les dates, montants et repères.");}
  let pdfBytes:ArrayBuffer|null=null;
  if(data.pdf){
    try{
      const binary=atob(data.pdf.base64);
      pdfBytes=Uint8Array.from(binary,c=>c.charCodeAt(0)).buffer;
      const doc=await PDFDocument.load(pdfBytes);
      if(!doc.getPageCount())throw new Error("empty");
      for(const p of data.patches??[]){if(p.page>doc.getPageCount())throw new Error("Retouche hors page");await doc.embedPng(p.png);}
    }catch{throw new Error("Le PDF inclus dans la sauvegarde est invalide.");}
  }
  if(!pdfBytes&&data.patches?.length)throw new Error("Les retouches nécessitent un PDF de fond.");
  return {data,pdfBytes};
}
