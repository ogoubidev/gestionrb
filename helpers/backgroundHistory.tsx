export type BackgroundPatch={page:number;x:number;y:number;width:number;height:number;png:string};
export type BackgroundHistory={past:BackgroundPatch[][];present:BackgroundPatch[];future:BackgroundPatch[][]};
export const backgroundHistory={
 empty:():BackgroundHistory=>({past:[],present:[],future:[]}),
 apply:(h:BackgroundHistory,patch:BackgroundPatch):BackgroundHistory=>({past:[...h.past,h.present],present:[...h.present,patch],future:[]}),
 undo:(h:BackgroundHistory):BackgroundHistory=>h.past.length?({past:h.past.slice(0,-1),present:h.past[h.past.length-1],future:[h.present,...h.future]}):h,
 redo:(h:BackgroundHistory):BackgroundHistory=>h.future.length?({past:[...h.past,h.present],present:h.future[0],future:h.future.slice(1)}):h
};