# ---- base: install dependencies ----
FROM node:20 AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# ---- build: compile typescript ----
FROM base AS build
COPY . .
RUN npm run build

# ---- runtime: run the application ----
FROM node:20-alpine AS prod
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"] 