import fs from 'fs';
import path from 'path';


import * as ENGINE from 'genesys.js';
import * as THREE from 'three';

import { getProjectRoot, mockBrowserEnvironment } from './common.js';
import { DEFAULT_SCENE_NAME } from './const.js';

mockBrowserEnvironment();

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

export enum PrimitiveType {
  Cube = 'cube',
  Cone = 'cone',
  Cylinder = 'cylinder',
  Sphere = 'sphere',
  Torus = 'torus',
  Capsule = 'capsule'
}

export interface PrimitiveArgs {
  type: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color?: [number, number, number] | string | number;
}

export async function placePrimitive(args: {
  project: string;
  mergeToOneActor: boolean;
  primitives: PrimitiveArgs[];
}): Promise<string[]> {
  const projectPath = path.join(getProjectRoot(), 'local-storage', 'games', args.project);
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project ${args.project} does not exist`);
  }

  const sceneFile = path.join(projectPath, DEFAULT_SCENE_NAME);
  const world = new ENGINE.World(defaultWorldOptions);
  const worldData = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
  ENGINE.WorldSerializer.loadWorld(world, worldData);

  const actorIds: string[] = [];
  const rootActor = args.mergeToOneActor ? new ENGINE.Actor() : null;

  for (const primitive of args.primitives) {
    const actor = rootActor ?? new ENGINE.Actor();
    let geometry: THREE.BufferGeometry;
    const primitiveType = primitive.type as PrimitiveType;
    switch (primitiveType) {
      case PrimitiveType.Cube:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case PrimitiveType.Cone:
        geometry = new THREE.ConeGeometry(0.5, 1, 32);
        break;
      case PrimitiveType.Cylinder:
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      case PrimitiveType.Sphere:
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        break;
      case PrimitiveType.Torus:
        geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
        break;
      case PrimitiveType.Capsule:
        geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
        break;
      default:
        throw new Error(`Unsupported primitive type: ${primitive.type}`);
    }

    let material = ENGINE.MaterialUtils.DefaultMaterial;
    if (primitive.color != null) {  // rule out null and undefined
      const color = primitive.color;
      if (Array.isArray(color) && color.length === 3) {
        material = new THREE.MeshStandardMaterial({ color: new THREE.Color(...color) });
      } else {
        material = new THREE.MeshStandardMaterial({ color });
      }
    }

    const meshOptions: ENGINE.MeshComponentOptions = {
      geometry,
      material,
    };

    if (rootActor) {
      // attaching to the root actor, transforms must be applied to the mesh component
      if (primitive.position) {
        meshOptions.position = new THREE.Vector3(...primitive.position);
      }
      if (primitive.rotation) {
        meshOptions.rotation = new THREE.Euler(...primitive.rotation);
      }
      if (primitive.scale) {
        meshOptions.scale = new THREE.Vector3(...primitive.scale);
      }
    }
    const mesh = new ENGINE.MeshComponent(meshOptions);

    if (!rootActor) {
      // attaching to individual actors, transforms are applied to each actor's root component
      if (primitive.position) {
        actor.getRootComponent().position.set(...primitive.position);
      }
      if (primitive.rotation) {
        actor.getRootComponent().rotation.set(...primitive.rotation);
      }
      if (primitive.scale) {
        actor.getRootComponent().scale.set(...primitive.scale);
      }
    }

    actor.getRootComponent().add(mesh);

    if (!rootActor) {
      world.addActors(actor);
      actorIds.push(actor.uuid);
    }
  }

  if (rootActor) {
    world.addActors(rootActor);
    actorIds.push(rootActor.uuid);
  }

  fs.writeFileSync(sceneFile, JSON.stringify(world.asExportedObject(), null, 2));
  return actorIds;
}


export async function removeActors(args: {
  project: string;
  actorIds: string[];
}): Promise<void> {
  const projectPath = path.join(getProjectRoot(), 'local-storage', 'games', args.project);
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project ${args.project} does not exist`);
  }

  const sceneFile = path.join(projectPath, DEFAULT_SCENE_NAME);
  const world = new ENGINE.World(defaultWorldOptions);
  const worldData = JSON.parse(fs.readFileSync(sceneFile, 'utf8'));
  ENGINE.WorldSerializer.loadWorld(world, worldData);

  const actorIdsSet = new Set(args.actorIds);
  const actors = world.getActors(ENGINE.Actor);
  const actorsToRemove = actors.filter(actor => actorIdsSet.has(actor.uuid));
  world.removeActors(...actorsToRemove);

  fs.writeFileSync(sceneFile, JSON.stringify(world.asExportedObject(), null, 2));
}
