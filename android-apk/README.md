# Gestion RB pour Android

Application Android installable directement, sans Google Play. Cette version ouvre https://gestionrb.floot.app dans une WebView ; Internet est nécessaire. Elle comporte un sélecteur de fichiers et l'enregistrement des exports PDF/JSON via le sélecteur Android.

Le workflow GitHub Actions compile un APK de test signé (assembleDebug). Ce n'est pas une version publiée dans un store. Le rendu et les interactions doivent être validés sur téléphone. Conserver les sauvegardes JSON avant les exports.

Compilation : Gradle 8.9, JDK 17, Android SDK 35, puis gradle -p android-apk assembleDebug. La clé de test d'un runner neuf peut changer : une prochaine version peut nécessiter une désinstallation préalable (sauvegarder ses données).
