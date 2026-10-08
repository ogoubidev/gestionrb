import {PDFDocument,PDFPage,StandardFonts} from "pdf-lib";
import {applyBackgroundPatches} from "./applyBackgroundPatches";
import {buildStatementPdf} from "./buildStatementPdf";
import {statementFont} from "./statementFont";
import {encodePdf,serializeBackup,parseBackup} from "./statementBackup";
describe("Retouches du fond PDF",()=>{
const png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9N8AAAAASUVORK5CYII=";
const patch={page:1,x:10,y:20,width:15,height:5,png};
const guides={date:8,valueDate:22,label:37,debit:68,credit:79,balance:91,startY:28,endY:88,lineHeight:3.8};
it("convertit les coordonnées du rectangle vers celles du PDF",async()=>{
const doc=await PDFDocument.create();doc.addPage([600,800]);const draw=spyOn(PDFPage.prototype,"drawImage").and.callThrough();
await applyBackgroundPatches(doc,[patch]);
const options=draw.calls.mostRecent().args[1];expect(options?.x).toBe(60);expect(options?.y).toBe(600);expect(options?.width).toBe(90);expect(options?.height).toBe(40);
});
it("refuse les zones hors page et les PNG invalides",async()=>{
const doc=await PDFDocument.create();doc.addPage();
await expectAsync(applyBackgroundPatches(doc,[{...patch,x:99}])).toBeRejectedWithError(/invalide/);
await expectAsync(applyBackgroundPatches(doc,[{...patch,png:"data:image/png;base64,wrong"}])).toBeRejectedWithError(/PNG invalide/);
});
it("exporte trois pages avec retouches sans modifier les octets importés",async()=>{
spyOn(statementFont,"load").and.resolveTo(StandardFonts.Helvetica);
const doc=await PDFDocument.create();doc.addPage([595,842]);const bytes=await doc.save();const before=Array.from(bytes);
const rows=Array.from({length:31},(_,i)=>({date:"2026-01-01",valueDate:"2026-01-01",label:"Depot",type:"credit" as const,amount:10,balance:100+(i+1)*10}));
const out=await buildStatementPdf(bytes.buffer as ArrayBuffer,rows,guides,{},8,{opening:100,closingDate:"2026-06-30",summaryFontSize:8,footerLabel:"Relevé de compte"},[patch]);
const result=await PDFDocument.load(out);expect(result.getPageCount()).toBe(3);
for(const page of result.getPages())expect(page.node.Resources()?.toString()).toContain("/XObject");
expect(Array.from(bytes)).toEqual(before);
});
it("restaure les retouches depuis la sauvegarde",async()=>{
const doc=await PDFDocument.create();doc.addPage();const bytes=await doc.save();
const data={format:"gestion-rb" as const,version:1 as const,opening:0,startDate:"2026-01-01",endDate:"2026-06-30",rows:[],baseGuides:guides,pageGuides:{},fontSize:8,patches:[patch],pdf:{name:"fond.pdf",base64:encodePdf(bytes.buffer as ArrayBuffer)}};
expect((await parseBackup(serializeBackup(data))).data.patches).toEqual([patch]);
});
});