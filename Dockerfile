FROM node
WORKDIR /startlang
COPY package.json package-lock.json ./
RUN npm install
COPY .babelrc.js postcss.config.js webpack.config.js ./
COPY ./src ./src
COPY ./static ./static
COPY ./node_modules/blockly/media ./static/blockly/media
RUN npm run build

FROM nginx:alpine
COPY --from=0 /startlang/static /usr/share/nginx/html
