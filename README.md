[![CI](https://github.com/directivegames/genesys.sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/directivegames/genesys.sdk/actions/workflows/ci.yml)
[![Publish](https://github.com/directivegames/genesys.sdk/actions/workflows/publish.yml/badge.svg)](https://github.com/directivegames/genesys.sdk/actions/workflows/publish.yml)

# User Workflow
- Download and install the latest version from the [Release](https://github.com/directivegames/genesys.sdk/releases) page.
- Create an empty folder on your disk to store the project.
- Open the folder in this app, create a new project based on the template you select, then run the file server.
- Launch the web editor and cursor to develop.

# Developer

## Run Locally
- `npm install`
- `npm run dev` to run the dev vesion
- `npm run dist` to build the app locally, then find installer in the `dist` folder

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
