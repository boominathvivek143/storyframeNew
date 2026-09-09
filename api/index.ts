// Vercel Serverless Function entry point.
//
// An Express app is itself a valid Node request handler ((req, res) => void),
// so no adapter library is needed -- built once per cold start and reused
// for every warm invocation after that. vercel.json rewrites every
// /api/(.*) request to this one function.
//
// Imports the already-bundled server (dist/server.cjs, built by `npm run
// build`) rather than the raw TypeScript source -- importing '../server'
// directly fails on Vercel with ERR_UNSUPPORTED_DIR_IMPORT, because this
// project root has both a server.ts FILE and a server/ DIRECTORY side by
// side, and Node's native ESM resolver (unlike a bundler, and unlike
// CommonJS require()) doesn't disambiguate that the way local dev does.
// The bundle has no such ambiguity: esbuild already inlined server/'s
// contents into one file at build time.
import type { IncomingMessage, ServerResponse } from 'http';
// @ts-ignore - dist/server.cjs is produced at build time
import { createApp } from '../dist/server.cjs';

let appPromise: ReturnType<typeof createApp> | null = null;
function getApp() {
  if (!appPromise) appPromise = createApp();
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app(req, res);
}
