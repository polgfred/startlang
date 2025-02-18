# Nutshell

This is an early Alpha release. Docs, tests, and a more comprehensive guide will be coming online soon.

Read the [Language Reference](/reference.md)!

# Setup

It's just a simple Next app! the only dependency to run it on your machine is [NodeJS](https://nodejs.org/).

Alternatively, if you want to use Docker devcontainers, you can:

- Install [Docker](https://docs.docker.com/get-started/get-docker/)
- Install the [VSCode Devcontainers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) from Microsoft
- Open the repository in VSCode
- Click `Reopen in Container` when prompted

### Install packages:

```console
$ npm install
```

### Run the app:

```console
$ npm run dev
```

### Run a REPL:

```console
$ npm run repl
```

### Run a script:

```console
$ npm run script -- path/to/script.start
```

## Production

- Install [Docker](https://docker.com/)
- Clone the repository to your machine

Build and run the docker container:

```console
$ docker build --tag startlang:latest .
$ docker run -it --rm -p 3000:3000 startlang:latest
```
