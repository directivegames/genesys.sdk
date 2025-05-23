// How to use:
// it must be built first with: npm run build
// open cursor settings - MCP servers, refresh and make sure "genesys" is connected
// and you're good to go with asking cursor to place primitives in a specified project
//
// for another client that wants to use this MCP, the command is: node ./dist/src/genesys-mcp.js
// please not unfortunately, `npm run genesys-mcp` doesn't work

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { placePrimitive, PrimitiveType, removeActors } from './place-primitive.js';

// Create an MCP server
const server = new McpServer({
  name: 'Genesys-MCP',
  version: '0.0.1'
});


function silenceConsole(): Disposable {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  console.log = () => {};
  console.error = () => {};

  return {
    [Symbol.dispose]() {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }
  };
}

server.tool(
  'placePrimitive',
  'Place one or more 3D primitives in the scene. Unless clearly specified otherwise, all primitives will be merged into one single actor to reduce the number of actors in the scene',
  {
    project: z.string().describe('Name of the project'),
    mergeToOneActor: z.boolean().optional().default(true).describe('Merge all primitives into one single actor to reduce the number of actors in the scene'),
    primitives: z.array(
      z.object({
        type: z.enum(Object.values(PrimitiveType) as [string, ...string[]]).describe(`Type of primitive to place, one of: ${Object.values(PrimitiveType).join(', ')}`),
        position: z.array(z.number()).length(3).optional().describe('Position as [x, y, z]'),
        rotation: z.array(z.number()).length(3).optional().describe('Rotation in radians as [x, y, z]'),
        scale: z.array(z.number()).length(3).optional().describe('Scale as [x, y, z]'),
        color: z.union([z.array(z.number()).length(3), z.string(), z.number()]).optional().describe('Color as [r, g, b], hex string, hex number, or X11 color name'),
      })
    ).describe('List of primitives to add'),
  },
  async ({ project, mergeToOneActor, primitives }) => {
    let actorIds: string[] = [];

    using silencer = silenceConsole();
    {
      try {
        actorIds = await placePrimitive({
          project,
          mergeToOneActor,
          primitives: primitives.map(p => ({
            type: p.type,
            position: p.position as [number, number, number] | undefined,
            rotation: p.rotation as [number, number, number] | undefined,
            scale: p.scale as [number, number, number] | undefined,
            color: p.color as [number, number, number] | string | number | undefined,
          })),
        });
      } catch (error) {
        return {
          content: [{ type: 'text', text: `${error}` }]
        };
      }
    }

    const uuids = actorIds.join(', ');
    const text = `Primitives placed successfully, placed actor UUIDs are [${uuids}]`;
    return {
      content: [{ type: 'text', text }]
    };
  }
);

server.tool(
  'removeActors',
  'Remove one or more actors from the scene',
  {
    project: z.string().describe('Name of the project'),
    actorIds: z.array(z.string()).describe('List of actor UUIDs to remove'),
  },
  async ({ project, actorIds }) => {
    using silencer = silenceConsole();
    {
      await removeActors({ project, actorIds });
    }
    const text = `${actorIds.length} actors removed successfully`;
    return {
      content: [{ type: 'text', text }]
    };
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
