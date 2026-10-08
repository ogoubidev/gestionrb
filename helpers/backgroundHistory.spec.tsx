import {backgroundHistory,BackgroundPatch} from "./backgroundHistory";
describe("Historique des retouches",()=>{
const patch=(x:number):BackgroundPatch=>({page:1,x,y:5,width:10,height:10,png:"data:image/png;base64,test"});
it("annule et rétablit plusieurs retouches sans modifier les états précédents",()=>{
const original=backgroundHistory.empty(),a=backgroundHistory.apply(original,patch(1)),b=backgroundHistory.apply(a,patch(2));
expect(original.present.length).toBe(0);expect(a.present.length).toBe(1);
const undone=backgroundHistory.undo(b);expect(undone.present).toEqual(a.present);
const empty=backgroundHistory.undo(undone);expect(empty.present).toEqual([]);
expect(backgroundHistory.redo(backgroundHistory.redo(empty)).present).toEqual(b.present);
expect(backgroundHistory.undo(original)).toBe(original);
});
it("abandonne la branche future lorsqu’on applique une nouvelle retouche",()=>{
const a=backgroundHistory.apply(backgroundHistory.empty(),patch(1));
const b=backgroundHistory.apply(a,patch(2));
const next=backgroundHistory.apply(backgroundHistory.undo(b),patch(3));
expect(next.present.map(p=>p.x)).toEqual([1,3]);expect(next.future).toEqual([]);
expect(backgroundHistory.redo(next)).toBe(next);
});
});