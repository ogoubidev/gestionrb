import React,{useEffect,useRef,useState} from "react";
import {Document,Page} from "react-pdf";
import {Button} from "./Button";
import type {BackgroundPatch} from "../helpers/backgroundHistory";
type Rect={x:number;y:number;width:number;height:number};
export const BackgroundRetouch=({url,patches,onApply,onUndo,onRedo,canUndo,canRedo}:{url:string;patches:BackgroundPatch[];onApply:(p:BackgroundPatch)=>void;onUndo:()=>void;onRedo:()=>void;canUndo:boolean;canRedo:boolean})=>{
 const [active,setActive]=useState(false),[page,setPage]=useState(1),[pages,setPages]=useState(0),[ready,setReady]=useState(false),[rect,setRect]=useState<Rect|null>(null),[pending,setPending]=useState<BackgroundPatch|null>(null),[error,setError]=useState("");
 const canvas=useRef<HTMLCanvasElement>(null),surface=useRef<HTMLDivElement>(null),anchor=useRef<{x:number;y:number}|null>(null);
 useEffect(()=>{setPage(1);setPages(0);setReady(false);setActive(false);setRect(null);setPending(null);setError("");},[url]);
 const clear=()=>{anchor.current=null;setRect(null);setPending(null);setError("");};
 const point=(e:React.PointerEvent)=>{const b=surface.current!.getBoundingClientRect();return{x:Math.max(0,Math.min(100,(e.clientX-b.left)/b.width*100)),y:Math.max(0,Math.min(100,(e.clientY-b.top)/b.height*100))};};
 const down=(e:React.PointerEvent)=>{
  if(!ready||pending)return;e.preventDefault();const p=point(e);setError("");
  if(rect){
   if(p.x+rect.width>100||p.y+rect.height>100){setError("La zone source dépasse la page. Clique plus haut ou plus à gauche.");return;}
   try{
    const original=canvas.current!;const crop=document.createElement("canvas");
    crop.width=Math.max(1,Math.round(original.width*rect.width/100));crop.height=Math.max(1,Math.round(original.height*rect.height/100));
    const ctx=crop.getContext("2d");if(!ctx)throw new Error("Canvas indisponible.");
    ctx.drawImage(original,original.width*p.x/100,original.height*p.y/100,original.width*rect.width/100,original.height*rect.height/100,0,0,crop.width,crop.height);
    const png=crop.toDataURL("image/png");if(png.length>2000000)throw new Error("Zone trop volumineuse : sélectionne un rectangle plus petit.");
    setPending({page,...rect,png});
   }catch(err){setError(err instanceof Error?err.message:"Retouche impossible.");}
   return;
  }
  anchor.current=p;e.currentTarget.setPointerCapture(e.pointerId);
 };
 const move=(e:React.PointerEvent)=>{if(!anchor.current)return;const p=point(e),a=anchor.current;setRect({x:Math.min(a.x,p.x),y:Math.min(a.y,p.y),width:Math.abs(p.x-a.x),height:Math.abs(p.y-a.y)});};
 const up=()=>{if(!anchor.current)return;anchor.current=null;setRect(r=>r&&r.width>=.3&&r.height>=.3?r:null);};
 return <section style={{border:"1px solid #d7dde5",borderRadius:12,padding:16,margin:"16px 0"}}>
 <h2>Retoucher le fond</h2><p>Travaille sur une copie pour ton document personnel. Le fichier importé reste intact. Les retouches couvrent visuellement la zone ; elles ne suppriment pas les données sous-jacentes du PDF.</p>
 <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Button disabled={!url} onClick={()=>{clear();setActive(v=>!v);}}>{active?"Quitter l’outil":"Retoucher le fond"}</Button>
 <Button disabled={!canUndo} onClick={()=>{clear();onUndo();}}>Annuler la dernière retouche</Button><Button disabled={!canRedo} onClick={()=>{clear();onRedo();}}>Rétablir la retouche</Button></div>
 {active&&url&&<><p role="status">{pending?"Vérifie la retouche puis applique-la ou annule-la.":rect?"Clique sur le coin supérieur gauche de la zone source de même taille.":"Dessine un rectangle sur la zone à remplacer."} La copie provient du fond original de cette page.</p>
 <div style={{display:"flex",gap:8,alignItems:"center"}}><Button disabled={page<=1} onClick={()=>{clear();setReady(false);setPage(p=>p-1);}}>Précédente</Button><span>Fond : page {page} sur {pages||"…"}</span><Button disabled={!pages||page>=pages} onClick={()=>{clear();setReady(false);setPage(p=>p+1);}}>Suivante</Button></div>
 <div ref={surface} style={{position:"relative",width:"fit-content",maxWidth:"100%",marginTop:12}}>
 <Document file={url} onLoadSuccess={({numPages})=>setPages(numPages)} onLoadError={()=>setError("Impossible de charger le PDF de fond.")}><Page pageNumber={page} width={Math.min(760,typeof window!=="undefined"?window.innerWidth-70:760)} canvasRef={canvas} onRenderSuccess={()=>setReady(true)} onRenderError={()=>{setReady(false);setError("Impossible d’afficher cette page.");}} renderTextLayer={false} renderAnnotationLayer={false}/></Document>
 {[...patches,...(pending?[pending]:[])].filter(p=>p.page===page).map((p,i)=><img key={i} alt="Retouche du fond" src={p.png} style={{position:"absolute",left:p.x+"%",top:p.y+"%",width:p.width+"%",height:p.height+"%",pointerEvents:"none"}}/>)}
 {rect&&<div style={{position:"absolute",left:rect.x+"%",top:rect.y+"%",width:rect.width+"%",height:rect.height+"%",border:"2px dashed #b32020",boxSizing:"border-box",pointerEvents:"none"}}/>}
 <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{anchor.current=null;setRect(null);}} style={{position:"absolute",inset:0,touchAction:"none",cursor:ready?"crosshair":"wait"}}/>
 </div><div style={{display:"flex",gap:8,marginTop:12}}><Button disabled={!pending||patches.length>=100} onClick={()=>{if(pending){onApply(pending);clear();}}}>Appliquer</Button><Button variant="ghost" onClick={clear}>Annuler la sélection</Button></div></>}
 {error&&<p role="alert">{error}</p>}<p>{patches.length} retouche(s) appliquée(s). Télécharge une sauvegarde pour les conserver. Annuler/Rétablir fonctionne pendant cette session.</p>
 </section>;
};