FROM node:24.14.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html ./
COPY public/ public/
COPY src/ src/
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:24.14.0-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-chi-sim && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=5173 WAYMARK_HOST=0.0.0.0 WAYMARK_DATA=/var/lib/waymark WAYMARK_CONFIG=/run/waymark-private/backend.env
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY server/ ./server/
RUN mkdir -p /var/lib/waymark && chown node:node /var/lib/waymark
USER node
EXPOSE 5173
CMD ["node", "server/index.mjs"]
