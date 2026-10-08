import { PDFDocument, rgb } from "pdf-lib";
import {applyBackgroundPatches} from "./applyBackgroundPatches";
import type {BackgroundPatch} from "./backgroundHistory";
import fontkit from "@pdf-lib/fontkit";
import { statementFont } from "./statementFont";
import { formatStatementAmount } from "./formatStatementAmount";

type Guides = { date:number; valueDate:number; label:number; debit:number; credit:number; balance:number; startY:number; endY:number; lineHeight:number };
type Row = { date:string; valueDate:string; label:string; type:"credit"|"debit"; amount:number; balance:number };

// Pure export pipeline: no browser state, so actual PDF generation can be tested.
export async function buildStatementPdf(bytes:ArrayBuffer, rows:Row[], defaultGuides:Guides, pageGuides:Record<number,Guides> = {}, fontSize:number = 8, decoration?:{opening:number;closingDate:string;summaryFontSize:number;footerLabel:string;summaryX?:number;summaryY?:number;footerX?:number;footerY?:number}, patches:BackgroundPatch[] = []) {
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
  await applyBackgroundPatches(doc,patches);
  // Copy retouched backgrounds before drawing transactions.
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
  if(decoration){
    const {opening,closingDate,summaryFontSize,footerLabel,summaryX=0,summaryY=0,footerX=0,footerY=0}=decoration;
    if([summaryX,summaryY,footerX,footerY].some(v=>!Number.isFinite(v))||Math.abs(summaryX)>8||Math.abs(footerX)>8||summaryY < -10||summaryY>70||footerY < -1||footerY>90)throw new Error("Position du bloc invalide.");
    if(!Number.isFinite(opening)||!Number.isFinite(summaryFontSize)||summaryFontSize<7||summaryFontSize>14)throw new Error("Taille du récapitulatif invalide : 7 à 14 points.");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(closingDate)||!footerLabel.trim()||footerLabel.length>60)throw new Error("Date de clôture ou libellé du pied de page invalide.");
    const credits=rows.reduce((s,r)=>s+(r.type==="credit"?r.amount:0),0),debits=rows.reduce((s,r)=>s+(r.type==="debit"?r.amount:0),0);
    const summary:[string,number][]=[["Solde d'ouverture",opening],["Total des débits",debits],["Total des crédits",credits],["Solde final",rows[rows.length-1].balance]];
    for(let p=0;p<doc.getPageCount();p++){
      const page=doc.getPage(p),{width,height}=page.getSize();
      const draw=(value:string,x:number,y:number,size:number)=>{
        const t=text(value);if(x<0||y<0||x+font.widthOfTextAtSize(t,size)>width||y+size>height)throw new Error("Le récapitulatif ou le pied de page dépasse la page.");
        page.drawText(t,{x,y,size,font,color:rgb(.08,.08,.08)});
      };
      const last=layout[p];
      const rowTop=last?height*(1-last.guides.startY/100)+fontSize:0;
      const rowBottom=last?height*(1-(last.guides.startY+(last.count-1)*last.guides.lineHeight)/100):0;
      const overlaps=(bottom:number,top:number)=>!!last&&bottom<rowTop+8&&top>rowBottom-8;
      if(p===0){
        const top=height*(.88-summaryY/100),bottom=top-3*(summaryFontSize+6);
        if(overlaps(bottom,top+summaryFontSize))throw new Error("Le récapitulatif chevauche les opérations. Déplace le bloc ou règle le début des lignes.");
        summary.forEach(([label,value],i)=>{
          const y=height*(.88-summaryY/100)-i*(summaryFontSize+6);
          draw(label,width*(.08+summaryX/100),y,summaryFontSize);
          const amount=money(value);draw(amount,width*(.9+summaryX/100)-font.widthOfTextAtSize(amount,summaryFontSize),y,summaryFontSize);
        });
      }
      const footerBaseline=30+height*footerY/100;
      if(p===0){const top=height*(.88-summaryY/100),bottom=top-3*(summaryFontSize+6);if(footerBaseline<top+summaryFontSize+8&&footerBaseline+8>bottom-8)throw new Error("Le pied de page chevauche le récapitulatif. Éloigne les deux blocs.");}
      if(overlaps(footerBaseline,footerBaseline+8))throw new Error("Le pied de page chevauche les opérations. Déplace le bloc ou règle la fin des lignes.");
      if(footerBaseline<23)throw new Error("Le pied de page chevauche la mention de document personnel. Remonte le bloc.");
      const footerText=text(footerLabel.trim()+" · "+closingDate);
      const pageText=text("Page "+(p+1)+" sur "+doc.getPageCount());
      if(width*.08+font.widthOfTextAtSize(footerText,8)+10>width*.92-font.widthOfTextAtSize(pageText,8))throw new Error("Le libellé du pied de page chevauche la pagination. Raccourcis le libellé.");
      draw(footerText,width*(.08+footerX/100),footerBaseline,8);
      const number="Page "+(p+1)+" sur "+doc.getPageCount();
      draw(number,width*(.92+footerX/100)-font.widthOfTextAtSize(number,8),footerBaseline,8);
      draw("DOCUMENT PERSONNEL - NON EMIS PAR LA BANQUE",width*.08,14,7);
    }
  }
  return doc.save();
}
