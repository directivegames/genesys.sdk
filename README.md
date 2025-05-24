[![CI](https://github.com/directivegames/genesys.sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/directivegames/genesys.sdk/actions/workflows/ci.yml)
[![Publish](https://github.com/directivegames/genesys.sdk/actions/workflows/publish.yml/badge.svg)](https://github.com/directivegames/genesys.sdk/actions/workflows/publish.yml)

# User Workflow
- Download and install the latest version from the [Release](https://github.com/directivegames/genesys.sdk/releases) page.
- Create an empty folder on your disk to store the project.
- Open the folder in this app, create a new project based on the template you select, then run the file server.
- Launch the web editor and cursor to develop.

## Mac User
Currently there's no pre-built installer for macOS as it requires some effort to setup code-signing.

Mac users will need to build and install the installer locally for now, See the **Run Locally** section below for instructions.

# Developer

## Run Locally
- `npm install`
- `npm run dev` to run the dev vesion
- `npm run dist` to build the app locally. Installer will be generated in the `dist` folder that you can use to install the app directly on your machine.

## New Project Template
- The logic to setup a new project is in [new-project.ts](src/backend/tools//new-project.ts), it contains a few steps:  
  - Generate `game.ts` and `default.scene.json` based on the selected template.
  - Generate `package.json` and `{project}.code-workspace` from code.
  - Copy the files from `assets/new-project` to the project folder.
  - Run `npm install` and `npm run build` in the project folder.

## Add Electron API
Electron API is for exposing code that relies on the nodejs environment to the frontend environment.

To add a new one, following this:
- Define the API in [api.ts](src/api.ts)
- Add the API wrapper in [preload.ts](src/preload.ts)
- Implement the API in [handler.ts](src/backend/handler.ts)
