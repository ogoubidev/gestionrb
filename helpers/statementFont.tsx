import { StandardFonts } from "pdf-lib";
let pending:Promise<Uint8Array>|undefined;

// Shared by preview and download. Retry after a failed fetch; never silently substitute a font.
export const statementFont = {
  async load():Promise<Uint8Array|StandardFonts>{
    if(!pending) pending=(async()=>{
      const response=await fetch("/_cdn/static/c47a6892-1722-4fe6-a7b2-ca4ad1179415-tw-cen-mt-regular.ttf");
      if(!response.ok) throw new Error("Impossible de charger la police Tw Cen MT Regular. Vérifie ta connexion et réessaie.");
      return new Uint8Array(await response.arrayBuffer());
    })().catch(error=>{pending=undefined;throw error;});
    return pending;
  }
};
