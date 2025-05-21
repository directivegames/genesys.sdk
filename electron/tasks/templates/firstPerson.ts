import * as ENGINE from 'genesys.js';
import * as THREE from 'three';

import { defaultWorldOptions } from './interface.js';

import type { IGameTemplate} from './interface.js';


const gameCode = `
import * as ENGINE from 'genesys.js';

class MyGame extends ENGINE.BaseGameLoop {

  protected override preStart(): void {
    ENGINE.GameBuilder.createDefaultPawnWithPhysics(this.world, ENGINE.CharacterMovementType.FirstPerson);
  }
}

export function main(container: HTMLElement): ENGINE.IGameLoop {
  const game = new MyGame(container);
  return game;
}
`;

@ENGINE.GameClass()
export class FirstPersonGameTemplate implements IGameTemplate {
  public getWorld(): ENGINE.World {
    const world = new ENGINE.World(defaultWorldOptions);
    ENGINE.GameBuilder.createDefaultLighting(world);
    ENGINE.GameBuilder.createDefaultGround(world);
    ENGINE.GameBuilder.createPlayerStart(world, new THREE.Vector3(0, ENGINE.CHARACTER_HEIGHT / 2, 0));
    return world;
  }

  public getGameCode(): string {
    return gameCode;
  }

  public async additionalSetup(): Promise<boolean> {
    return true;
  }
}
