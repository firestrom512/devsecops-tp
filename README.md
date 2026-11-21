# TP3 — Rends ce repo prêt pour la prod (DevSecOps)

[![CI DevSecOps](https://github.com/firestrom512/devsecops-tp/actions/workflows/ci.yml/badge.svg)](https://github.com/firestrom512/devsecops-tp/actions/workflows/ci.yml)

> Projet de correction du TP de clôture CI/CD. **Les résultats de CI, npm audit, CodeQL, Docker et Trivy ne sont pas certifiés tant que le dépôt n'a pas été publié et que les workflows n'ont pas été exécutés.** Cette archive contient le code final sécurisé, pas une application initiale volontairement vulnérable mise en ligne.

## Exécution

Pré-requis : Node.js 22, npm, Git. Docker facultatif pour le développement et nécessaire pour la partie image.

```bash
npm install                  # Génère package-lock.json, à COMMITER
npm run lint
npm test                     # Jest + Supertest et couverture >= 80 %
npm audit --audit-level=high
npm start
```

Puis tester `http://localhost:3000/health`, `/hello?name=Lina`, `/prefs?theme=dark&lang=en`.

**Important :** le `package-lock.json` doit être généré via `npm install` et ajouté au premier commit **avant** un push sur GitHub : le pipeline et le Dockerfile emploient `npm ci`. L'archive a été préparée dans un environnement sans accès au registre npm, donc aucun lockfile artificiel ou résultat d'audit inventé n'a été fourni. Sous Windows, le script `scripts/publier.ps1` peut automatiser installation, tests, audit et push vers un dépôt `devsecops-tp` déjà créé. Exécuter ce script uniquement après avoir regardé sa destination.

### Routes

| Route | Comportement sécurisé |
|---|---|
| `GET /health` | `200`, `{ "status": "ok" }` |
| `GET /hello?name=...` | Bonjour en HTML avec **échappement** des données utilisateur |
| `GET /ping?host=google.com` | `ping` sans shell, hôte validé et placé dans une allowlist, timeout |
| `GET /prefs?theme=dark&lang=en` | Seules `theme` et `lang` sont lues ; valeurs autorisées contrôlées |

Les 2 tests de départ sont conservés, avec des tests supplémentaires dont 3 régressions de sécurité dans `tests/security.test.js`.

## Sécurité & coûts

### 1. Secrets

- `.gitignore` exclut `.env`, les logs, `node_modules` et `coverage` ; `.env.example` contient uniquement `PORT=3000`.
- Configurer dans GitHub **Secret scanning**, **Push protection**, Dependabot et protection de branche. Leur activation par interface n'est **pas vérifiée** dans cette archive.

**Question — un collègue a supprimé une clé AWS fuitée du code : est-ce suffisant ?** Non. Une clé divulguée subsiste dans l'historique Git, des clones, des caches ou des journaux. Dans l'ordre : (1) **désactiver/révoquer immédiatement** la clé dans IAM, (2) analyser les événements CloudTrail et détecter les usages non autorisés, (3) générer un remplacement avec permissions minimales si nécessaire, distribuer via un gestionnaire de secrets, (4) nettoyer soigneusement l'historique et les traces accessibles, avec coordination des collaborateurs, (5) activer les protections et documenter l'incident. Un simple `git rm` n'annule pas la fuite.

### 2. Dépendances et audit

Le starter du professeur utilise **Express 4.17.1** et **Lodash 4.17.15**. Cette correction utilise **Express 5.3.0**. **Lodash est supprimé** car une sélection explicite de clés remplace `_.merge()` sans nécessiter cette dépendance. Jest et Supertest sont installés pour les tests. Dependabot inspecte `npm`, `github-actions` et `docker` chaque semaine (`.github/dependabot.yml`).

Le workflow `deps-audit` exécute `npm audit --audit-level=high` et bloque sur les vulnérabilités de gravité HIGH ou CRITICAL.

| Audit npm | Critical | High | Moderate | Low |
|---|---:|---:|---:|---:|
| Avant — dépendances du starter | À mesurer | À mesurer | À mesurer | À mesurer |
| Après — dépendances corrigées | À mesurer | À mesurer | À mesurer | À mesurer |

Les valeurs sont volontairement laissées **non mesurées** : une estimation n'est pas un audit réel. Voir `docs/MESURES.md` pour les commandes.

### 3. Correction des trois failles et tests de régression

| Route | Faille | URL de démonstration (sur serveur local uniquement) | Correction |
|---|---|---|---|
| `/hello` | XSS réfléchie | `/hello?name=%3Cscript%3Ealert(1)%3C%2Fscript%3E` | `escapeHtml()` encode les caractères spéciaux avant de construire la réponse HTML. |
| `/ping` | Injection de commande | `/ping?host=google.com%3Bwhoami` | `execFile` reçoit un tableau d'arguments ; pas de shell ; regex stricte + allowlist. |
| `/prefs` | Prototype pollution | `/prefs?__proto__%5Badmin%5D=true` | Jamais de `_.merge()` avec l'entrée utilisateur ; sélection de `theme`/`lang` uniquement. |

`tests/security.test.js` vérifie chacune de ces corrections et des cas limites (hôtes privés interdits, réponses propres, en-têtes d'identification). Le code final ne reproduit aucune de ces failles.

CodeQL est configuré dans le job `CodeQL` du pipeline. L'étape de l'énoncé **« trouver la règle, le fichier, la ligne et la gravité »** exige une analyse GitHub réelle : aucun résultat n'est fabriqué ici.

### 4. Pipeline durci

- `push` et `pull_request` **vers `main` uniquement**.
- `permissions: contents: read` par défaut, exceptions spécifiques pour CodeQL.
- `timeout-minutes` sur tous les jobs.
- `npm ci`, cache npm, `concurrency` et `cancel-in-progress: true`.
- `test` (Jest + couverture), `deps-audit` (audit npm), `CodeQL` et `image` (Buildx + Trivy).
- Le job `image` attend `test` et `deps-audit` avant de construire l'image.
- Trivy est épinglé au commit **`ed142fd0673e97e23eac54620cfb913e5ce36c25`**, correspondant au tag v0.36.0, plutôt qu'à un tag mutable.

La protection de branche **nécessite un réglage manuel GitHub** : PR obligatoire, checks `test`, `deps-audit` et `CodeQL` obligatoires ; `image` recommandé aussi. Sur GitHub, configurer dans Settings → Rules.

**Question — incident Trivy de mars 2026 :** les tags des versions 0.0.1 à 0.34.2 (notamment `v0.34.0`) ont été compromis pendant l'incident du 19 mars 2026. Un workflow qui chargeait alors un tag détourné était exposé. Un workflow épinglé **avant l'incident sur le SHA d'un commit sain** résistait au détournement du tag ; épingler un SHA de code malveillant n'aurait pas protégé. Source : [avis officiel du projet](https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23).

### 5. Image Docker optimisée et scan

Le `Dockerfile` fourni est **multi-stage**, avec une version explicite de Node/Alpine (`node:22.23.5-alpine3.24`), `npm ci --omit=dev`, `COPY package*.json` avant les sources, un `.dockerignore`, `USER node` et `CMD ["node", "src/index.js"]`. Pour une immutabilité totale, épingler aussi un **digest** de base après vérification sur Docker Hub. Le fichier `Dockerfile.naif.example` permet la comparaison demandée par l'enseignant ; **ne pas exposer cette image naïve sur Internet**.

```bash
docker build -f Dockerfile.naif.example -t devsecops-tp:naif .
docker build -t devsecops-tp:optim .
docker images devsecops-tp
docker history devsecops-tp:naif
docker history devsecops-tp:optim
docker run --rm -p 127.0.0.1:3000:3000 devsecops-tp:optim
# autre terminal : curl http://localhost:3000/health
```

| Image | Taille | Couches | CVE HIGH | CVE CRITICAL |
|---|---:|---:|---:|---:|
| Naïve | Non mesurée | Non mesuré | Non mesuré | Non mesuré |
| Optimisée | Non mesurée | Non mesuré | Non mesuré | Non mesuré |

Pour une image naïve sans `.dockerignore`, le `COPY . .` risque d'intégrer `.env` et `.git` au contexte / à une couche de construction, ainsi que les modules et tests. La couche la plus lourde **doit être déterminée** avec `docker history` ; il ne faut pas inventer son poids. En CI, Trivy fait échouer le job en présence d'une CVE HIGH ou CRITICAL **corrigeable**. Voir `docs/MESURES.md`.

### 6. AWS : architecture cible (étude sur papier, aucune ressource créée)

```mermaid
flowchart LR
  Dev[Développeur] --> Repo[GitHub / code]
  Repo --> CI[GitHub Actions / test + audit + CodeQL + Trivy]
  CI -->|OIDC: rôle IAM temporaire| ECR[Amazon ECR]
  ECR --> ECS[ECS Fargate]
  ECS --> ALB[Application Load Balancer]
  ALB --> User[Utilisateur]
  SM[Secrets Manager] --> ECS
  ECS --> CW[CloudWatch Logs + métriques]
```

Calculs à partir des **tarifs fournis dans l'énoncé** (région `us-east-1`, novembre 2026) :

- x86 : `0,25 × 0,04048 + 0,5 × 0,004445 = 0,0123425 $/h` ;
- ARM : `0,25 × 0,03238 + 0,5 × 0,003556 = 0,009873 $/h` ;
- Scénario C : `12 h × 5 jours × 52 semaines / 12 mois = 260 h/mois` (moyenne annuelle).

| Scénario | Heures / mois | Calcul | Coût / mois |
|---|---:|---|---:|
| A — x86, 24h/24 | 730 | `0,0123425 × 730` | **9,01 $** |
| B — ARM, 24h/24 | 730 | `0,009873 × 730` | **7,21 $** |
| C — x86, 12 h × 5 jours | 260 | `0,0123425 × 260` | **3,21 $** |

**Question NAT Gateway —** sans aucun trafic, `0,045 × 730 = 32,85 $/mois`, soit **3,65 fois** la tâche x86 du scénario A. Une NAT Gateway peut donc coûter nettement plus que le calcul Fargate lui-même ; il faut envisager l'architecture réseau, les VPC endpoints et les coûts cachés. Ces totaux n'incluent **pas** ALB, ECR, CloudWatch, stockage, trafic, IPv4, taxes ou support ; il ne s'agit pas d'un devis AWS.

La politique `aws/ecr-lifecycle.json` conserve les **10 images les plus récentes** en ECR.

### 7. Bonus : déploiement OIDC

`.github/workflows/deploy-aws.yml` prévoit des jobs de vérification (`test` + `deps-audit`), une authentification OIDC, un `docker build`, un push ECR par SHA de commit, puis une nouvelle révision de définition de tâche ECS et une mise à jour du service. **Pas de clé AWS statique** dans le code. Le workflow reste inactif tant que la variable GitHub `AWS_ENABLED` n'est pas définie à `true`.

Variables requises **seulement en cas de déploiement réel** : `AWS_ROLE_ARN`, `AWS_REGION`, `ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE`, `ECS_TASK_FAMILY`, `ECS_CONTAINER_NAME`. Ne pas créer de ressources AWS pour ce TP papier.

## Checklist de rendu

| Critère demandé | État du projet |
|---|---|
| Code : 3 failles corrigées + tests | Écrit ; exécution Jest à vérifier après npm install |
| Dependabot, `gitignore`, `.env.example` | Préparés |
| CI npm audit, tests et CodeQL | Workflows préparés ; exécution réelle à vérifier |
| Docker multi-stage + Trivy SHA | Préparé ; build/scan réel non effectué |
| Calculs AWS + ECR lifecycle + Mermaid | Complétés à partir de l'énoncé |
| Bonus déploiement OIDC | Workflow préparé et volontairement désactivé |
| Secret protection / branch protection | Réglages GitHub à activer manuellement |
| `package-lock.json` | **À générer et commiter** via `npm install` |
| Audit avant/après et tailles images | **À mesurer** (ne jamais inventer les chiffres) |

Voir [docs/MESURES.md](docs/MESURES.md) pour les manipulations et captures à produire et [docs/BASELINE.md](docs/BASELINE.md) pour la description de l'application initiale vulnérable.