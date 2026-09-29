# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Prisma engines need OpenSSL on Alpine
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
RUN apk add --no-cache openssl && chown node:node /app

# Production dependencies only. The postinstall hook generates the Prisma client for this platform.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3001
# Applies pending migrations before serving traffic, like order-service. An unreachable database stops startup.
CMD ["npm", "run", "start:migrate"]
