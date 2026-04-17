# Development stage
FROM node:20-alpine AS development

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

CMD ["npm", "run", "dev", "--", "--host"]

# Build stage
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage — files in /app/dist are shared via volume
FROM alpine:3.19 AS production

COPY --from=build /app/dist /app/dist
CMD ["sh", "-c", "echo 'Frontend built. Files at /app/dist' && ls /app/dist/ && sleep infinity"]
