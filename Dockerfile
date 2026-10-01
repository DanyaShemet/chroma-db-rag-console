FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/
RUN npm ci
COPY tsconfig.json ./
COPY src src
COPY web web
RUN npm run build && npm run build:web

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY web/package.json web/
RUN npm ci --omit=dev --workspaces=false
COPY --from=build /app/dist dist
COPY --from=build /app/web/dist web/dist
EXPOSE 3001
CMD ["node", "dist/server/index.js"]
