import {PDFDocument} from "pdf-lib";
import type {BackgroundPatch} from "./backgroundHistory";
export async function applyBackgroundPatches(doc:PDFDocument,patches:BackgroundPatch[]){
 if(patches.length>100)throw new Error("100 retouches maximum par relevé.");
 for(const p of patches){
  if(!Number.isInteger(p.page)||p.page<1||p.page>doc.getPageCount()||[p.x,p.y,p.width,p.height].some(v=>!Number.isFinite(v))||p.x<0||p.y<0||p.width<=0||p.height<=0||p.x+p.width>100.000001||p.y+p.height>100.000001||!p.png.startsWith("data:image/png;base64,")||p.png.length>2000000)throw new Error("Retouche de fond invalide ou trop volumineuse.");
  const page=doc.getPage(p.page-1),{width,height}=page.getSize();
  let image;try{image=await doc.embedPng(p.png);}catch{throw new Error("Image de retouche PNG invalide.");}
  page.drawImage(image,{x:width*p.x/100,y:height*(1-(p.y+p.height)/100),width:width*p.width/100,height:height*p.height/100});
 }
}