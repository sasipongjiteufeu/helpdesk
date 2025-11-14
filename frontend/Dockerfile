# ---- base: deps cache ----
FROM node:20 AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- build: vite build ----
FROM base AS build
# Declare the build argument
ARG VITE_API_BASE_URL
# Set it as an environment variable for the build command
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .

# The build command will now have access to VITE_API_BASE_URL
RUN npm run build

# ---- runtime: nginx serving static files ----
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]