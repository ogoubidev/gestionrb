# Gestion RB

Copie des sources du projet Floot Gestion RB, version 1791023629031, exportée le 3 octobre 2026.

Application : https://gestionrb.floot.app

## Contenu
- Sources React/TypeScript, styles, composants et tests tels que présents dans Floot.
- Générateur PDF, repères distincts par page, taille de texte commune et sauvegarde JSON réimportable.
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
Les 183 fichiers texte exportés ont été comparés aux longueurs de l'inventaire Floot. Le binaire de police est identifié TwCenMT-Regular (76252 octets).
Ce transfert ne modifie ni ne republie l'application Floot. Il ne valide pas un lancement autonome hors Floot.
