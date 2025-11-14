FROM node:22
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm clean-install
COPY ./app ./app
COPY ./src ./src
COPY ./tests ./tests
COPY next.config.js next-env.d.ts peggy-loader.js tsconfig.json ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM nginx:alpine
COPY --from=0 /app/out /usr/share/nginx/html
COPY ./public /usr/share/nginx/html
