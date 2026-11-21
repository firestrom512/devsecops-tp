# Guide de preuves et mesures — À compléter lors des exécutions réelles

Aucun résultat ci-dessous n'est présenté comme mesuré avant exécution.

## 1. Protection du dépôt

- GitHub → Settings → Code security : activer **Secret scanning**, **Push protection**, **Dependabot alerts** et **Dependabot security updates** si disponibles.
- GitHub → Rules → Rulesets / Branch protection : PR obligatoire sur `main`, checks obligatoires **test**, **deps-audit**, **CodeQL** (et `image` recommandé).
- Ajouter une capture montrant l'activation dans le README (ne jamais montrer de secret).

## 2. Audit NPM

Pour la version finale sécurisée :

```sh
npm install
npm audit --json > docs/audit-apres.json
npm audit --audit-level=high
```

La première commande produit `package-lock.json`, **qui doit être commité** avant l'utilisation de `npm ci` en CI et Docker.
Pour la version initiale volontairement vulnérable fournie par le professeur, effectuer `npm audit --json` exclusivement dans une copie locale isolée, sans exposer de serveur ; relever Critical / High / Moderate / Low. Ne pas inventer les comptes et ne pas commiter le résultat s'il contient des données sensibles.

## 3. CodeQL

Vérifier les alertes réelles dans GitHub → Security → Code scanning. Le workflow `ci.yml` lance CodeQL. Les détails (règle, ligne, gravité) nécessitent que GitHub exécute l'analyse ; ne pas inventer d'alertes.

## 4. Images Docker et scan Trivy

```sh
# Après génération de package-lock.json
# Baseline naïve (exercice uniquement, ne pas exposer sur Internet)
docker build -f Dockerfile.naif.example -t devsecops-tp:naif .
docker image inspect devsecops-tp:naif --format '{{.Size}}'
docker history devsecops-tp:naif

# Version optimisée
docker build -t devsecops-tp:optim .
docker image inspect devsecops-tp:optim --format '{{.Size}}'
docker history devsecops-tp:optim

docker run --rm -p 127.0.0.1:3000:3000 devsecops-tp:optim
# Dans un autre terminal : curl http://localhost:3000/health
```

Dans GitHub Actions, le job `image` exécute Trivy avec une action épinglée par SHA, `ignore-unfixed: true`, `exit-code: '1'`. Relever le nombre de CVE détectées et leurs sévérités dans les logs, puis compléter le tableau du README.

## 5. Red / Green des tests de régression

- Copier le starter du professeur dans un dossier local séparé *non public* ; **ne pas le déployer**.
- Mettre ses routes en place avec les dépendances du starter, ajouter les tests de régression depuis `tests/security.test.js` et constater les échecs attendus.
- Dans la version corrigée fournie ici, installer les dépendances, puis exécuter `npm test` et relever les tests verts.
- Conserver deux captures avant/après si le professeur les demande.

## 6. Mesures réelles et distinction avec l'estimation

La partie AWS est seulement un **exercice de calcul**. Aucun compte AWS ni aucune ressource n'est nécessaire et aucune dépense réelle ne doit être engagée.
