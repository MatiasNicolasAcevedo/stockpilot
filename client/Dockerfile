# Imagen del client de StockPilot (contexto: client/). Targets:
#   dev      Vite con HMR y proxy a server (servicio client-dev, perfil "dev")
#   verify   typecheck, lint, formato, tests con cobertura y build (runner client-tests de scripts/verify.sh)
#   runtime  build real servido por nginx, origen público con proxy a server (servicio client; E2E en T-003)
# node_modules se instala siempre dentro de la imagen con npm ci: nunca se monta el del host (binarios de Windows).

FROM node:24.21.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS source
COPY . .

FROM source AS dev
ENV STOCKPILOT_API_TARGET=http://server:8080
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM source AS verify
CMD ["npm", "run", "verify"]

FROM source AS build
RUN npm run build

FROM nginx:1.30.5-alpine AS runtime
COPY nginx.conf /opt/stockpilot/nginx.conf.template
COPY 19-public-origin.sh /docker-entrypoint.d/19-public-origin.sh
RUN chmod +x /docker-entrypoint.d/19-public-origin.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
