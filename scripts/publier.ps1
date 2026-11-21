# Exécuter ce script dans le dossier du projet APRÈS création du dépôt GitHub public devsecops-tp (vide, sans README).
$ErrorActionPreference = 'Stop'
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Node.js/npm absent : installer Node.js 22.' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git absent : installer Git.' }
Write-Host 'Installation et création du package-lock.json...'
npm install
if ($LASTEXITCODE -ne 0) { throw 'Echec npm install.' }
Write-Host 'Vérification et tests...'
npm run lint
if ($LASTEXITCODE -ne 0) { throw 'Echec lint.' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'Echec tests.' }
npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) { Write-Warning 'Audit avec vulnérabilités HIGH/CRITICAL : corriger avant publication.'; exit 1 }
if (-not (Test-Path '.git')) { git init -b main }
git add .
git commit -m 'feat: sécuriser API et préparer pipeline DevSecOps'
if ($LASTEXITCODE -ne 0) { Write-Warning 'Aucun changement à committer ou Git non configuré.' }
$remote='https://github.com/firestrom512/devsecops-tp.git'
$exists = (git remote) -contains 'origin'
if (-not $exists) { git remote add origin $remote }
git push -u origin main
if ($LASTEXITCODE -ne 0) { throw 'Impossible de publier. Vérifier que le dépôt GitHub existe et que Git est authentifié.' }
Write-Host 'Dépôt publié : https://github.com/firestrom512/devsecops-tp'
