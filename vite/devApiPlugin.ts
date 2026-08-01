/**
 * Serves the real Cloudflare Pages Functions from the Vite dev server.
 *
 * `npm run dev` therefore needs a single process on a single port, and — more
 * importantly — runs the *actual* handler code rather than a re-implementation,
 * so local behaviour cannot drift from production. `wrangler pages dev` stays
 * available (`npm run preview:cf`) to confirm the real runtime before deploying.
 *
 * Handlers are pulled in through `server.ssrLoadModule` instead of a static
 * import: Vite transpiles the TypeScript, and invalidates the module when the
 * file changes, so editing a Function hot-reloads without restarting the server.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';
import { readFunctionsEnv } from './devVars';

/** URL path → module the dev server loads. Mirrors Pages' file routing. */
const ROUTES: Record<string, string> = {
  '/api/login': '/functions/api/login.ts',
  '/api/verify': '/functions/api/verify.ts',
};

type Handler = (context: {
  request: Request;
  env: Record<string, string>;
}) => Promise<Response>;

type FunctionModule = Partial<Record<'onRequest' | 'onRequestPost', Handler>>;

export function devApiPlugin(): Plugin {
  let root = process.cwd();

  return {
    name: 'clap-dev-api',
    // Inert during `vite build` and under Vitest, which stubs fetch instead.
    apply: 'serve',

    configResolved(config) {
      root = config.root;
    },

    configureServer(server: ViteDevServer) {
      // Registered directly rather than from a returned closure, so this runs
      // *before* Vite's internal middlewares — otherwise the SPA fallback would
      // answer /api/login with index.html.
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url ?? '/').split('?')[0];
        const modulePath = ROUTES[pathname];
        if (!modulePath) {
          next();
          return;
        }

        try {
          // Re-read per request: editing .dev.vars needs no restart.
          const env = readFunctionsEnv(root);
          const module = (await server.ssrLoadModule(modulePath)) as FunctionModule;

          // Same resolution order Pages applies.
          const handler =
            req.method === 'POST'
              ? (module.onRequestPost ?? module.onRequest)
              : module.onRequest;

          if (!handler) {
            res.statusCode = 405;
            res.setHeader('allow', 'POST');
            res.end();
            return;
          }

          await writeNodeResponse(res, await handler({ request: await toWebRequest(req), env }));
        } catch (error) {
          // Almost always a missing or malformed .dev.vars. Log the real reason
          // for the developer, mirror the production 500 for the client.
          server.config.logger.error(
            `[api] ${pathname} : ${(error as Error).message}`,
            { error: error as Error },
          );
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Configuration du serveur incomplète.' }));
        }
      });
    },
  };
}

/** Node's IncomingMessage → the Request a Pages Function expects. */
async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
    else headers.set(key, value);
  }

  // Buffered rather than streamed: handing a ReadableStream to Request would
  // require `duplex: 'half'`, and these bodies are a few hundred bytes.
  const chunks: Buffer[] = [];
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    for await (const chunk of req) chunks.push(chunk as Buffer);
  }

  return new Request(url, {
    method: req.method ?? 'GET',
    headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
}

async function writeNodeResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}
