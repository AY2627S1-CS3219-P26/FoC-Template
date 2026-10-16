# Stage 1 builds the static files. Node and node_modules stay behind in this stage.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 only serves the built files. The unprivileged image runs nginx as a non-root user on 8080.
FROM nginxinc/nginx-unprivileged:1.30-alpine
# Only variables ending in _SERVICE_URL are filled into the templates, so nginx's own $uri etc. stay intact.
ENV NGINX_ENVSUBST_FILTER=_SERVICE_URL
COPY nginx/templates/ /etc/nginx/templates/
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080