# Setup for Local Development

- Install [NodeJS](https://nodejs.org/)
- Clone the repository to your machine
- Install packages and run the app:

```console
$ npm install
$ npm run dev
```

# Setup for Devcontainer

- Install [VSCode](https://visualstudio.microsoft.com/)
- Install the [VSCode Devcontainers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) from Microsoft
- Clone the repository to your machine
- Open the repository in VSCode
- Click `Reopen in Container` when prompted
- Install packages and run the app:

```console
$ npm install
$ npm run dev
```

# Build a Production Container

- Install [Docker](https://docker.com/)
- Clone the repository to your machine

Build and run the docker container:

```console
$ docker build --tag startlang:latest .
$ docker run -it --rm -p 3000:3000 startlang:latest
```

The app should now be running at [`http://localhost:3000/home`](http://localhost:3000/home)!
