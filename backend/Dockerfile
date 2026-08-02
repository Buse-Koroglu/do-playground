# syntax=docker/dockerfile:1.7

FROM node:18-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npx prisma generate


FROM node:18-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
RUN addgroup -S pet_group && \
    adduser -S pet_user -G pet_group
COPY package*.json ./
RUN npm ci --omit=dev # Install only production dependencies not also dev dependencies
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
USER pet_user
EXPOSE 5000
ENTRYPOINT ["./docker-entrypoint.sh"]
