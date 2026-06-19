# Build Stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

# Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/server.js ./

EXPOSE 5000

USER node

CMD ["node", "server.js"]
