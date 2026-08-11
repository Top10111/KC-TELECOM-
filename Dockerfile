# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps (including devDeps needed for build)
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Copy source and build
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npx --no-install prisma generate
RUN npm run build

# ---------- Stage 2: production runtime ----------
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Reuse the builder's full node_modules instead of a fresh --omit=dev install.
# This guarantees the Prisma CLI (needed for `migrate deploy`) and ts-node
# (needed for `prisma db seed`, which runs prisma/seed.ts directly) are
# present and version-matched with what built the app — no npx-triggered
# download from the registry at container start or exec time.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
COPY prisma ./prisma

# Run as the image's built-in non-root user instead of root
RUN chown -R node:node /app
USER node

EXPOSE 3000

# TCP-level check that the API is accepting connections on its port.
# Uses only Node's built-in net module — no app route required, so this
# doesn't touch application source.
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "require('net').createConnection(3000,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"

# Apply migrations, then start the API.
# "migrate deploy" is prod-safe: it only applies existing migrations, no prompts, no schema drift.
CMD ["sh", "-c", "npx --no-install prisma migrate deploy && node dist/main"]
