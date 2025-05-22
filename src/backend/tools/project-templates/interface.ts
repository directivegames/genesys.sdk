import * as ENGINE from 'genesys.js';

import { mockBrowserEnvironment } from '../common.js';

mockBrowserEnvironment();

export interface IGameTemplate {
    getWorld(): ENGINE.World;
    getGameCode(): string;
    additionalSetup(): Promise<boolean>;
}

export const defaultWorldOptions = {
  rendererDomElement: document.createElement('div'),
  gameContainer: document.createElement('div'),
  backgroundColor: 0x2E2E2E,
  physicsOptions: {
    engine: ENGINE.PhysicsEngine.Rapier,
    gravity: ENGINE.MathHelpers.makeVector({ up: -9.81 }),
  },
  navigationOptions: {
    engine: ENGINE.NavigationEngine.RecastNavigation,
  },
  useManifold: true
};
