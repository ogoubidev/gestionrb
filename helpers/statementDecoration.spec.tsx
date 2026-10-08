import {PDFDocument,PDFPage,StandardFonts} from "pdf-lib";
import {buildStatementPdf} from "./buildStatementPdf";
import {statementFont} from "./statementFont";
import {serializeBackup,parseBackup} from "./statementBackup";
describe("Récapitulatif et pied de page",()=>{
const guides={date:8,valueDate:22,label:37,debit:68,credit:79,balance:91,startY:28,endY:88,lineHeight:3.8};
beforeEach(()=>{spyOn(statementFont,"load").and.resolveTo(StandardFonts.Helvetica);});
it("génère trois pages, un seul récapitulatif et la clôture sur chaque page",async()=>{
const doc=await PDFDocument.create();doc.addPage([595,842]);const bytes=await doc.save();
const rows=Array.from({length:31},(_,i)=>({date:"2026-01-01",valueDate:"2026-01-01",label:"Depot",type:"credit" as const,amount:10,balance:100+(i+1)*10}));
const draw=spyOn(PDFPage.prototype,"drawText").and.callThrough();
const output=await buildStatementPdf(bytes.buffer as ArrayBuffer,rows,guides,{},8,{opening:100,closingDate:"2026-06-30",summaryFontSize:14,footerLabel:"Relevé de compte"});
expect((await PDFDocument.load(output)).getPageCount()).toBe(3);
const calls=draw.calls.allArgs();const texts=calls.map(c=>c[0]);
expect(texts.filter(t=>t==="Solde d'ouverture").length).toBe(1);
expect(texts).toContain("Page 1 sur 3");expect(texts).toContain("Page 3 sur 3");
expect(texts.filter(t=>t==="Relevé de compte · 2026-06-30").length).toBe(3);
expect(texts).toContain("310");expect(texts).toContain("410");
expect(calls.find(c=>c[0]==="Solde d'ouverture")?.[1]?.size).toBe(14);
});
it("déplace les blocs ensemble sans déplacer les opérations sur trois pages",async()=>{
const doc=await PDFDocument.create();doc.addPage([595,842]);const bytes=await doc.save();
const rows=Array.from({length:31},(_,i)=>({date:"2026-01-01",valueDate:"2026-01-01",label:"Depot",type:"credit" as const,amount:10,balance:100+(i+1)*10}));
const draw=spyOn(PDFPage.prototype,"drawText").and.callThrough();
const decoration={opening:100,closingDate:"2026-06-30",summaryFontSize:8,footerLabel:"Relevé de compte"};
await buildStatementPdf(bytes.buffer as ArrayBuffer,rows,guides,{},8,decoration);
const before=draw.calls.allArgs();draw.calls.reset();
await buildStatementPdf(bytes.buffer as ArrayBuffer,rows,guides,{},8,{...decoration,summaryX:2,summaryY:-2,footerX:-2,footerY:1});
const after=draw.calls.allArgs();
for(const label of ["Solde d'ouverture","Total des débits","Total des crédits","Solde final"]){
const a=before.find(c=>c[0]===label)![1]!,b=after.find(c=>c[0]===label)![1]!;
expect(b.x!-a.x!).toBeCloseTo(595*.02,6);expect(b.y!-a.y!).toBeCloseTo(842*.02,6);
}
for(const label of ["Relevé de compte · 2026-06-30","Page 1 sur 3","Page 2 sur 3","Page 3 sur 3"]){
const a=before.filter(c=>c[0]===label),b=after.filter(c=>c[0]===label);
expect(b.length).toBe(a.length);
a.forEach((c,i)=>{expect(b[i][1]!.x!-c[1]!.x!).toBeCloseTo(-595*.02,6);expect(b[i][1]!.y!-c[1]!.y!).toBeCloseTo(842*.01,6);});
}
const positions=(calls:ReturnType<typeof draw.calls.allArgs>)=>calls.filter(c=>c[0]==="Depot").map(c=>({x:c[1]?.x,y:c[1]?.y,size:c[1]?.size}));expect(positions(after)).toEqual(positions(before));
});
it("bloque les blocs hors page et les chevauchements",async()=>{
const doc=await PDFDocument.create();doc.addPage([595,842]);const bytes=await doc.save();
const rows=[{date:"2026-01-01",valueDate:"2026-01-01",label:"Depot",type:"credit" as const,amount:10,balance:110}];
const d={opening:100,closingDate:"2026-06-30",summaryFontSize:8,footerLabel:"Relevé de compte"};
await expectAsync(buildStatementPdf(bytes.buffer as ArrayBuffer,rows,guides,{},8,{...d,summaryY:14})).toBeRejectedWithError(/chevauche/);
await expectAsync(buildStatementPdf(bytes.buffer as ArrayBuffer,rows,guides,{},8,{...d,footerY:68})).toBeRejectedWithError(/chevauche/);
await expectAsync(buildStatementPdf(bytes.buffer as ArrayBuffer,rows,guides,{},8,{...d,summaryX:NaN})).toBeRejectedWithError(/Position/);
});
it("préserve les réglages et accepte les anciennes sauvegardes",async()=>{
const original={format:"gestion-rb" as const,version:1 as const,opening:100,startDate:"2026-01-01",endDate:"2026-06-30",rows:[],baseGuides:guides,pageGuides:{},fontSize:8,pdf:null};
expect((await parseBackup(serializeBackup(original))).data).toEqual(original);
const updated={...original,summarySize:7,footerLabel:"Relevé personnel",summaryX:2,summaryY:-2,footerX:-2,footerY:1};
expect((await parseBackup(serializeBackup(updated))).data).toEqual(updated);
});
});