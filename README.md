# Background

The idea for this project first came to me in 2014. I was thinking about how best to teach programming to kids and absolute beginners, and about what computers were like when I got my first one in 1983. You just turned it on, and it announced that it was READY for whatever commands you wanted to give it. Today, even the simplest languages require enough installation and configuration to be daunting for a beginner—as well as providing plenty of rope to hang yourself with. I wanted to make a learning language that was humanely designed, intentionally constrained, but capable enough to make interesting things—a graphical visualization perhaps, or even a text adventure!

As I began to look around for inspiration, I discovered Bret Victor's fantastic work on [Learnable Programming](https://worrydream.com/LearnableProgramming/), and my brain completely exploded. It was so dense and rich with fertile ideas, I hardly knew where to start—but I knew this was absolutely the direction I needed to go in. I struggled for a long time to clear away the cruft that is so distracting and defeating to beginners, scrapping whatever syntactic and conceptual noise I could spare. I looked to BASIC and LOGO for inspiration, while trying to avoid their pitfalls.

A key concept in Learnable Programming is making the program flow tangible and visible, so I had to build an interpreter with inspection and time-travel capabilities baked in. In technical terms, I needed to leverage immutable state in a radical way, such that the entire execution environment could be paused, saved, and restored at any time. This resulted in a "stack of state-machines" design I'm quite pleased with, where OO and immutability frolic in unexpected ways. With that groundwork in place, it was surprisingly easy to build a simple take on Victor's time-traveling control flow, in order to move forward and backward through the execution of a program.

There are still plenty of bugs and rough edges to keep me busy, and a long list of desirable features I still want to add. But I believe it's finally in a good place to open up to the world!

# Setup

How to build and run it yourself, if you're so inclined.

## Local Development

- Install [NodeJS](https://nodejs.org/)
- Clone the repository to your machine
- [Optional: If you want to use Devcontainers]
  - Install the [VSCode Devcontainers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) from Microsoft
  - Open the repository in VSCode
  - Click `Reopen in Container` when prompted
- Install packages and run the app:

```console
$ npm install
$ npm run dev
```

## Production

- Install [Docker](https://docker.com/)
- Clone the repository to your machine

Build and run the docker container:

```console
$ docker build --tag startlang:latest .
$ docker run -it --rm -p 3000:3000 startlang:latest
```
