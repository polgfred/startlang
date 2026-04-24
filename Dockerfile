FROM node:22
WORKDIR /app
COPY package.json package-lock.json ./
COPY ./apps/web/package.json ./apps/web/package.json
COPY ./packages/lang-core/package.json ./packages/lang-core/package.json
COPY ./packages/lang-browser/package.json ./packages/lang-browser/package.json
RUN npm clean-install
COPY ./apps ./apps
COPY ./packages ./packages
COPY eslint.config.js reference.md tsconfig.base.json tsconfig.json ./
RUN npm run build -w @startlang/web

FROM nginx:alpine
COPY --from=0 /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
