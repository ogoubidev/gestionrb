import { PDFDocument, StandardFonts } from "pdf-lib";
import { encodePdf, serializeBackup, parseBackup, StatementBackup } from "./statementBackup";
import { buildStatementPdf } from "./buildStatementPdf";
import { statementFont } from "./statementFont";
const guides={date:8,valueDate:22,label:37,debit:68,credit:79,balance:91,startY:28,endY:88,lineHeight:3.8};
function fixture():StatementBackup{return {format:"gestion-rb",version:1,opening:1000,startDate:"2026-01-01",endDate:"2026-01-31",rows:[{id:1,date:"2026-01-02",valueDate:"2026-01-02",label:"Dépôt",type:"credit",amount:250.75}],baseGuides:guides,pageGuides:{2:{...guides,startY:35}},fontSize:9,pdf:null};}
describe("Portable statement backup",()=>{
 it("restores transactions, precision, independent guides and original PDF bytes",async()=>{
   const doc=await PDFDocument.create();doc.addPage();doc.addPage();
   const bytes=(await doc.save()).buffer as ArrayBuffer;
   const original=fixture();original.pdf={name:"modèle.pdf",base64:encodePdf(bytes)};
   const restored=await parseBackup(serializeBackup(original));
   expect(restored.data).toEqual(original);
   expect(Array.from(new Uint8Array(restored.pdfBytes!))).toEqual(Array.from(new Uint8Array(bytes)));
   expect((await PDFDocument.load(restored.pdfBytes!)).getPageCount()).toBe(2);
 });
 it("supports correction and another PDF export after import",async()=>{
   spyOn(statementFont,"load").and.returnValue(Promise.resolve(StandardFonts.Helvetica));
   const doc=await PDFDocument.create();doc.addPage([595,842]);
   const data=fixture();data.pdf={name:"fond.pdf",base64:encodePdf((await doc.save()).buffer as ArrayBuffer)};
   const restored=await parseBackup(serializeBackup(data));
   restored.data.rows[0].amount=500;restored.data.rows[0].label="Retrait corrigé";restored.data.rows[0].type="debit";
   const again=await parseBackup(serializeBackup(restored.data));
   expect(again.data.rows[0].amount).toBe(500);
   const output=await buildStatementPdf(again.pdfBytes!,again.data.rows.map(r=>({...r,balance:500})),again.data.baseGuides,again.data.pageGuides,again.data.fontSize);
   expect((await PDFDocument.load(output)).getPageCount()).toBe(1);
 });
 it("rejects malformed, unknown-version, invalid-date and duplicate-row backups",async()=>{
   await expectAsync(parseBackup("{")).toBeRejectedWithError(/Sauvegarde invalide/);
   for(const mutate of [
     (d:any)=>d.version=2,
     (d:any)=>d.rows[0].date="2026-02-30",
     (d:any)=>d.rows[0].amount=-1,
     (d:any)=>d.rows.push({...d.rows[0]}),
     (d:any)=>d.pageGuides[2].lineHeight=0
   ]){
     const d=fixture();mutate(d);
     await expectAsync(parseBackup(JSON.stringify(d))).toBeRejectedWithError(/Sauvegarde invalide/);
   }
 });
 it("rejects a corrupt embedded PDF and accepts a draft without a PDF",async()=>{
   const d=fixture();d.pdf={name:"bad.pdf",base64:btoa("not a PDF")};
   await expectAsync(parseBackup(JSON.stringify(d))).toBeRejectedWithError(/PDF inclus/);
   expect((await parseBackup(serializeBackup(fixture()))).pdfBytes).toBeNull();
 });
});
