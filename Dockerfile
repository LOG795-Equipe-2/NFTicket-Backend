# syntax=docker/dockerfile:1
FROM node:16-alpine AS builder

WORKDIR /usr/src/app
COPY package*.json ./

# Install packages
RUN npm ci
COPY . .
RUN npm run build

# Only copy the transpiled JS code for production
FROM node:16-alpine

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .
COPY --from=builder /usr/src/app/dist ./dist

CMD ["node", "dist/main"]