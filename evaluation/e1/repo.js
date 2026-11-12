// Where the ModelaU tool repository lives. The E1 scripts mirror what the tool
// does (its prompt, its request builder, its diagram parsers), so they import
// those modules from the repository instead of copying them.
//
// Default: this repository (evaluation/e1 is two levels below its root).
// Override with MODELAU_REPO=/path/to/modelau-uml-tutor.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(process.env.MODELAU_REPO || path.join(here, '..', '..'));
if (!existsSync(path.join(REPO, 'lib.js'))) {
  console.error(`Cannot find the ModelaU repository at ${REPO}.\nSet MODELAU_REPO=/path/to/modelau-uml-tutor.`);
  process.exit(1);
}
export const repoPath = (...p) => path.join(REPO, ...p);
export const fromRepo = rel => import(pathToFileURL(path.join(REPO, rel)).href);
