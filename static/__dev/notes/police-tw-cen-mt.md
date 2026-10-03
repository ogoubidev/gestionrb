# Police et aperçu — 3 octobre 2026

Police fournie par l’utilisateur : tw-cen-mt-cufonfonts.zip.
Nom interne vérifié : Tw Cen MT, Regular, PostScript TwCenMT-Regular.
Fichier TTF de 76252 octets hébergé dans les assets du projet.
helpers/statementFont.tsx charge et met en cache la police ; nouvelle tentative après échec.
helpers/buildStatementPdf.tsx incorpore un sous-ensemble via @pdf-lib/fontkit.
Tous les textes ajoutés utilisent cette police. Le contenu existant du PDF de fond n’est pas réécrit.
L’aperçu des opérations était déjà implémenté au début de cette reprise, avec le même générateur que l’export ; conservé.

Vérification : six tests de géométrie/erreurs passent avec une police standard simulée.
Vérification supplémentaire dans la VM avec le vrai TTF hébergé :
31 opérations donnent 3 pages ; BaseFont TwCenMT-Regular présent ; caractères absents refusés.
Test navigateur non exécuté : aucune fenêtre Floot n’a répondu dans le délai.
Pas de republication durant cette session.

Format confirmé par l’utilisateur : 500,000 et 1,000,000, sans décimales.
helpers/formatStatementAmount.tsx est partagé entre le tableau et le générateur PDF
(aperçu et export). Affichage arrondi à l’entier, calculs et stockage non arrondis.