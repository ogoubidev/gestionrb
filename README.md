# Gestion RB

Copie des sources du projet Floot Gestion RB, version 1791444924109, synchronisée le 8 octobre 2026.

Application : https://gestionrb.floot.app

## Contenu
- Sources React/TypeScript, styles, composants et tests tels que présents dans Floot.
- Générateur PDF, repères distincts par page, taille de texte commune et sauvegarde JSON réimportable.
- Récapitulatif de première page (ouverture, débits, crédits, solde final), taille 7–14 pt et déplacement horizontal/vertical.
- Pied de page déplaçable : libellé, date de clôture et pagination Page X sur Y.
- Outil Retoucher le fond : activation explicite, rectangle cible, sélection source, aperçu Appliquer/Annuler.
- Annuler/Rétablir les retouches pendant la session ; sauvegarde des retouches appliquées dans le JSON.
- Retouches visuelles superposées au fond : le contenu PDF sous-jacent n’est pas supprimé.
- Mention de document personnel non émis par la banque dans les exports.
- Inventaire des dépendances : `static/__dev/dependencies.json`.
- Police Tw Cen MT Regular : `assets/fonts/tw-cen-mt-regular.ttf`.

## Dépendances à Floot
Cette copie conserve les fichiers sources et leurs chemins d'origine. Elle ne constitue pas une application autonome prête à lancer avec npm : l'entrée React, le routage par fichiers, l'enveloppe globale, la compilation des CSS Modules et l'exécution des tests Jasmine sont fournis par Floot et ne figurent pas dans l'arborescence exportable.
Le routage de `pages/_index.tsx`, les layouts et `components/_globalContextProviders.tsx` suivent les conventions Floot.
Aucun endpoint métier ni schéma de base de données ne figure dans cet export.
Pour une adaptation locale, il faudra configurer explicitement le bundler, l'entrée React, les providers, le routage et le lanceur de tests.

## Ressources
`helpers/statementFont.tsx` conserve le chemin Floot `/_cdn/static/c47a6892-1722-4fe6-a7b2-ca4ad1179415-tw-cen-mt-regular.ttf`. La copie binaire correspondante est incluse dans `assets/fonts/`. Une exécution hors Floot doit servir cette police au chemin attendu ou adapter ce chemin.
La feuille `base.css` référence les polices IBM Plex via Google Fonts ; Floot les auto-héberge lors de sa compilation.
Le lecteur PDF utilise un worker pdfjs chargé depuis unpkg, à la version indiquée par pdfjs.
La police Tw Cen MT a été fournie pour ce projet. Cet export n'ajoute aucune licence ni permission de redistribution ; vérifier les droits applicables avant toute redistribution ultérieure.

## Données et confidentialité
Aucun PDF de relevé utilisateur, fichier de sauvegarde de transactions ni secret d'environnement n'est inclus.
Les exemples et jeux de tests fournis par le projet sont conservés.
Les opérations et le PDF de fond sont manipulés dans le navigateur. Le fichier JSON téléchargé par l'utilisateur contient sa sauvegarde ; il n'est pas une ressource du dépôt.

## Portée de la vérification
Les 190 fichiers texte de l’inventaire Floot ont été lus intégralement et leurs longueurs vérifiées. La comparaison des empreintes Git avec le dépôt a identifié dix fichiers ajoutés ou modifiés, synchronisés dans ce commit ; les autres sources correspondent à l’export précédent. Le binaire de police existant est conservé.
Six fichiers de tests Jasmine passent dans Floot : themeMode, statementBackup, buildStatementPdf, statementDecoration, backgroundHistory et backgroundPatches. TypeScript : aucune erreur. Deux fichiers de tests de hooks sont exclus par le lanceur par défaut.
Les gestes de sélection dans un navigateur réel n’ont pas été vérifiés : aucune fenêtre de prévisualisation Floot n’était ouverte.
Ce transfert ne modifie ni ne republie l'application Floot. Il ne valide pas un lancement autonome hors Floot.
