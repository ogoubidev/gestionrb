import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { statementFont } from "./statementFont";
import { formatStatementAmount } from "./formatStatementAmount";

type Guides = { date:number; valueDate:number; label:number; debit:number; credit:number; balance:number; startY:number; endY:number; lineHeight:number };
type Row = { date:string; valueDate:string; label:string; type:"credit"|"debit"; amount:number; balance:number };

// Pure export pipeline: no browser state, so actual PDF generation can be tested.
export async function buildStatementPdf(bytes:ArrayBuffer, rows:Row[], defaultGuides:Guides, pageGuides:Record<number,Guides> = {}, fontSize:number = 8) {
  if (!rows.length) throw new Error("Ajoute au moins une opération avant l’export.");
  if(!Number.isFinite(fontSize)||fontSize<4||fontSize>24) throw new Error("Taille du texte invalide : choisis entre 4 et 24 points.");
  const validate=(guides:Guides)=>{
  const columns:[string,number][] = [["Date transaction",guides.date],["Date valeur",guides.valueDate],["Libellé",guides.label],["Débit",guides.debit],["Crédit",guides.credit],["Solde",guides.balance]];
  for (const [name,value] of columns) {
    if (!Number.isFinite(value)||value<0||value>=100)
      throw new Error(`Repère « ${name} » invalide (${value} %). Place-le entre 0 et 99 % ; à 100 %, le texte commence hors de la page.`);
  }
  if (!Number.isFinite(guides.startY)||!Number.isFinite(guides.endY)||
      !Number.isFinite(guides.lineHeight)||guides.startY<0||guides.endY>100||
      guides.startY>=guides.endY||guides.lineHeight<=0||
      guides.lineHeight>guides.endY-guides.startY) {
    throw new Error("Repères invalides : place le début avant la fin, avec un espacement positif dans la zone de lignes.");
  }
  };
  validate(defaultGuides);
  if (rows.some(r=>!Number.isFinite(r.amount)||!Number.isFinite(r.balance)||r.amount<0))
    throw new Error("Une opération contient un montant ou un solde invalide.");
  let doc:PDFDocument;
  try { doc=await PDFDocument.load(bytes.slice(0)); }
  catch { throw new Error("Impossible de lire ce PDF. Choisis un PDF valide et non protégé."); }
  if (!doc.getPageCount()) throw new Error("Ce PDF ne contient aucune page.");
  doc.registerFontkit(fontkit);
  const font=await doc.embedFont(await statementFont.load(),{subset:true});
  const supported=new Set(font.getCharacterSet());
  // Normalize typographic spaces and reject missing glyphs instead of exporting blank boxes.
  const text=(value:string)=>{
    const normalized=value.replace(/[\u00a0\u202f]/g," ");
    try {
      if(Array.from(normalized).some(char=>!supported.has(char.codePointAt(0)!))) throw new Error("Missing glyph");
      font.encodeText(normalized);
    }
    catch { throw new Error("Un libellé contient des caractères non pris en charge par Tw Cen MT Regular. Modifie ces caractères, puis réessaie."); }
    return normalized;
  };
  const money=(n:number)=>text(formatStatementAmount(n));
  const prepared=rows.map(r=>({...r,date:text(r.date),valueDate:text(r.valueDate),label:text(r.label.slice(0,42)),amountText:money(r.amount),balanceText:money(r.balance)}));
  const layout:{guides:Guides; offset:number; count:number}[]=[];
  let offset=0;
  while(offset<rows.length){
    const pageNumber=layout.length+1;
    const guides=pageGuides[pageNumber]||defaultGuides;
    try { validate(guides); } catch(error) {
      throw new Error(`Page ${pageNumber} : ${error instanceof Error?error.message:String(error)}`);
    }
    const capacity=Math.floor((guides.endY-guides.startY)/guides.lineHeight);
    const count=Math.min(capacity,rows.length-offset);
    layout.push({guides,offset,count});
    offset+=count;
  }
  // Copy pristine backgrounds before drawing transactions.
  while(doc.getPageCount()<layout.length) {
    const [copy]=await doc.copyPages(doc,[0]);
    doc.addPage(copy);
  }
  for(let p=0;p<layout.length;p++){
    const {guides,offset,count}=layout[p];
    const page=doc.getPage(p),{width,height}=page.getSize();
    for(let i=0;i<count;i++){
      const row=prepared[offset+i];
      const y=height*(1-(guides.startY+i*guides.lineHeight)/100);
      const draw=(value:string,position:number)=>{
        const x=width*position/100;
        if (x+font.widthOfTextAtSize(value,fontSize)>width || y<0 || y+fontSize>height)
          throw new Error(`Page ${p+1} : du texte dépasse la page. Décale les repères vers la gauche ou augmente la marge supérieure.`);
        page.drawText(value,{x,y,size:fontSize,font,color:rgb(.08,.08,.08)});
      };
      draw(row.date,guides.date); draw(row.valueDate,guides.valueDate);
      draw(row.label,guides.label);
      draw(row.amountText,row.type==="debit"?guides.debit:guides.credit);
      draw(row.balanceText,guides.balance);
    }
  }
  return doc.save();
}
