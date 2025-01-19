FROM node:22
WORKDIR /startlang
COPY package.json package-lock.json ./
RUN npm install
COPY peggy-loader.js postcss.config.js webpack.config.js ./
COPY ./src ./src
COPY ./static ./static
RUN npm run build

FROM nginx:alpine
COPY --from=0 /startlang/static /usr/share/nginx/html
COPY --from=0 /startlang/node_modules/blockly/media /usr/share/nginx/html/blockly/media
