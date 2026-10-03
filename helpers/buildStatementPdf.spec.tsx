import { PDFDocument, PDFPage, StandardFonts } from "pdf-lib";
import { statementFont } from "./statementFont";
import { buildStatementPdf } from "./buildStatementPdf";
const guides={date:8,valueDate:22,label:37,debit:68,credit:79,balance:91,startY:28,endY:88,lineHeight:3.8};
const row={date:"2026-10-03",valueDate:"2026-10-03",label:"Dépôt épargne",type:"credit" as const,amount:1234.56,balance:1234.56};
async function background(){const d=await PDFDocument.create();d.addPage([595,842]);return (await d.save()).buffer as ArrayBuffer;}
describe("Statement PDF regression checks",()=>{
  // Keep geometry/error tests offline. Real uploaded-font embedding is verified separately.
  beforeEach(()=>spyOn(statementFont,"load").and.returnValue(Promise.resolve(StandardFonts.Helvetica)));
  it("identifies the screenshot's 100 percent date guide independently of valid vertical guides",async()=>{
    await expectAsync(buildStatementPdf(await background(),[row],{...guides,date:100,startY:49.8,endY:77.2,lineHeight:5})).toBeRejectedWithError(/Date transaction.*100/);
    const output=await buildStatementPdf(await background(),[row],{...guides,date:8,startY:49.8,endY:77.2,lineHeight:5});
    expect((await PDFDocument.load(output)).getPageCount()).toBe(1);
  });
  it("exports French thousands and accented labels",async()=>{
    const output=await buildStatementPdf(await background(),[row],guides);
    expect((await PDFDocument.load(output)).getPageCount()).toBe(1);
  });
  it("generates all three pages for 31 operations",async()=>{
    const output=await buildStatementPdf(await background(),Array.from({length:31},()=>({...row})),guides);
    const pdf=await PDFDocument.load(output);
    expect(pdf.getPageCount()).toBe(3);
    expect(pdf.getPages().every(p=>p.getWidth()===595&&p.getHeight()===842)).toBeTrue();
  });
  it("rejects reversed guides and zero spacing",async()=>{
    await expectAsync(buildStatementPdf(await background(),[row],{...guides,startY:90,endY:80})).toBeRejectedWithError(/Repères invalides/);
    await expectAsync(buildStatementPdf(await background(),[row],{...guides,lineHeight:0})).toBeRejectedWithError(/Repères invalides/);
  });
  it("reports invalid PDF and unsupported labels",async()=>{
    await expectAsync(buildStatementPdf(new ArrayBuffer(8),[row],guides)).toBeRejectedWithError(/PDF valide/);
    await expectAsync(buildStatementPdf(await background(),[{...row,label:"😀"}],guides)).toBeRejectedWithError(/caractères non pris/);
  });
  it("rejects empty exports and text outside page",async()=>{
    await expectAsync(buildStatementPdf(await background(),[],guides)).toBeRejectedWithError(/au moins une/);
    await expectAsync(buildStatementPdf(await background(),[row],{...guides,balance:99})).toBeRejectedWithError(/dépasse la page/);
  });

  it("uses independent coordinates and capacities without losing transactions",async()=>{
    const draw=spyOn(PDFPage.prototype,"drawText").and.callThrough();
    const first={...guides,startY:20,endY:40,lineHeight:10};
    const second={...guides,date:12,startY:50,endY:80,lineHeight:10};
    const output=await buildStatementPdf(await background(),Array.from({length:7},(_,i)=>({...row,label:"Row "+i})),first,{2:second});
    expect((await PDFDocument.load(output)).getPageCount()).toBe(3);
    const calls=draw.calls.allArgs();
    expect(calls.length).toBe(7*5);
    expect(calls[0][1]!.x).toBeCloseTo(595*.08);
    expect(calls[0][1]!.y).toBeCloseTo(842*.8);
    expect(calls[10][1]!.x).toBeCloseTo(595*.12);
    expect(calls[10][1]!.y).toBeCloseTo(842*.5);
    expect(calls[25][1]!.y).toBeCloseTo(842*.8);
    expect(calls.filter(c=>c[0].startsWith("Row ")).map(c=>c[0])).toEqual(Array.from({length:7},(_,i)=>"Row "+i));
  });
  it("identifies an invalid setting on the second page",async()=>{
    await expectAsync(buildStatementPdf(await background(),Array.from({length:16},()=>({...row})),guides,{2:{...guides,lineHeight:0}})).toBeRejectedWithError(/Page 2.*Repères invalides/);
  });

  it("applies one font size to every field across pages",async()=>{
    const draw=spyOn(PDFPage.prototype,"drawText").and.callThrough();
    const output=await buildStatementPdf(await background(),Array.from({length:31},()=>({...row})),guides,{2:{...guides,date:10}},10);
    expect((await PDFDocument.load(output)).getPageCount()).toBe(3);
    expect(draw.calls.count()).toBe(155);
    expect(draw.calls.allArgs().every(args=>args[1]!.size===10)).toBeTrue();
  });
  it("validates font size and measures overflow with the selected size",async()=>{
    for(const size of [0,NaN,25]){
      await expectAsync(buildStatementPdf(await background(),[row],guides,{},size)).toBeRejectedWithError(/Taille du texte invalide/);
    }
    await expectAsync(buildStatementPdf(await background(),[row],{...guides,balance:94},{},8)).toBeResolved();
    await expectAsync(buildStatementPdf(await background(),[row],{...guides,balance:94},{},24)).toBeRejectedWithError(/dépasse la page/);
  });
});