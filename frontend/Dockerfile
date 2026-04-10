# Development stage
FROM node:20-alpine AS development

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

CMD ["npm", "run", "dev"]

# Build stage
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage — copy build to shared volume
FROM alpine:3.19 AS production

COPY --from=build /app/dist /app/dist
CMD ["cp", "-r", "/app/dist/.", "/usr/share/nginx/html/"]
