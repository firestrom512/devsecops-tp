# État initial du TP3 (non déployé)

L'énoncé fournit une API Node.js volontairement vulnérable :
- Express **4.17.1** et Lodash **4.17.15** ;
- `/hello` : insertion directe d'une entrée utilisateur dans du HTML (XSS) ;
- `/ping` : concaténation de `host` dans une commande shell (command injection) ;
- `/prefs` : `_.merge({}, defaults, req.query)` (risque de pollution des prototypes) ;
- image Docker `node:22` avec `COPY . .` et `npm install` ;
- pipeline de démarrage sans audit, couverture, scanner de conteneur.

**Important :** le dépôt final ne fournit pas une version déployable de ces failles. Les exemples restent dans l'énoncé et sont traités comme des cas de régression. Les comptes de vulnérabilités et tailles Docker doivent être mesurés et consignés, pas devinés.

## Traçabilité de l'exercice

- Avant : conserver localement le package-lock généré avec les dépendances initiales (ne jamais déployer l'API vulnérable).
- Après : relever `npm audit --json` sur le code final et la capture de GitHub Actions.
- CodeQL : relever le nom des alertes détectées lors du passage du code initial (si demandé par l'enseignant) et joindre les captures. Aucun résultat CodeQL n'est inventé.
