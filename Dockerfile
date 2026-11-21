# Version explicite de Node et d'Alpine. Pour un déploiement réel : figer aussi par digest.
ARG NODE_IMAGE=node:22.23.5-alpine3.24
FROM ${NODE_IMAGE} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
# NPM et Corepack ne sont pas nécessaires dans le conteneur en production.
# Les supprimer réduit la surface d'attaque et élimine leurs dépendances vulnérables.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
           /usr/local/lib/node_modules/corepack /usr/local/bin/corepack
USER node
EXPOSE 3000
CMD ["node", "src/index.js"]
