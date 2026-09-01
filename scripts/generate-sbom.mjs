#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

function executePnpm(args, options) {
  const pnpmCli = process.env.npm_execpath;
  if (pnpmCli) return execFileAsync(process.execPath, [pnpmCli, ...args], options);
  return execFileAsync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args, options);
}

function packageUrl(name, version) {
  const encodedName = name.startsWith('@') ? `%40${name.slice(1)}` : name;
  return `pkg:npm/${encodedName}@${encodeURIComponent(version)}`;
}

function componentFromPackage(packageInfo) {
  const purl = packageUrl(packageInfo.name, packageInfo.version);
  return {
    type: 'library',
    'bom-ref': purl,
    name: packageInfo.name,
    version: packageInfo.version,
    purl,
    ...(packageInfo.license ? { licenses: [{ license: { id: packageInfo.license } }] } : {}),
  };
}

function collectDependencies(node, packages, edges) {
  if (!node?.name || !node.version) return;
  const ref = packageUrl(node.name, node.version);
  if (!packages.has(ref)) packages.set(ref, node);
  if (!edges.has(ref)) edges.set(ref, new Set());

  for (const dependencyType of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [dependencyName, dependency] of Object.entries(node[dependencyType] ?? {})) {
      if (!dependency?.version) continue;
      const dependencyNode = { ...dependency, name: dependency.name ?? dependencyName };
      const dependencyRef = packageUrl(dependencyNode.name, dependencyNode.version);
      edges.get(ref).add(dependencyRef);
      collectDependencies(dependencyNode, packages, edges);
    }
  }
}

export function validateSbom(bom) {
  if (bom.bomFormat !== 'CycloneDX' || bom.specVersion !== '1.6' || bom.version !== 1)
    throw new Error('Generated SBOM is not CycloneDX 1.6 JSON.');
  if (!Array.isArray(bom.components) || bom.components.length === 0)
    throw new Error('Generated SBOM has no dependency components.');
  for (const component of bom.components) {
    if (component.type !== 'library' || !component.name || !component.version || !component.purl)
      throw new Error('Generated SBOM contains an invalid dependency component.');
  }
}

async function validateCycloneDxSchema(bom) {
  const cyclonedxNpm = require.resolve('@cyclonedx/cyclonedx-npm');
  const { Validation } = require(
    require.resolve('@cyclonedx/cyclonedx-library', { paths: [cyclonedxNpm] }),
  );
  const validationError = await new Validation.JsonStrictValidator('1.6').validate(
    JSON.stringify(bom),
  );
  if (validationError !== null)
    throw new Error(`Generated SBOM failed CycloneDX validation: ${validationError}`);
}

export async function generateSbom({ root, outputFile }) {
  // A frozen install is the dependency-resolution gate; no npm fallback or ignored errors.
  await executePnpm(['install', '--frozen-lockfile', '--ignore-scripts'], {
    cwd: root,
    maxBuffer: 16 * 1024 * 1024,
  });
  const { stdout } = await executePnpm(
    ['list', '--prod', '--recursive', '--json', '--depth', 'Infinity'],
    {
      cwd: root,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const workspaceTrees = JSON.parse(stdout);
  const packages = new Map();
  const edges = new Map();
  for (const workspaceTree of workspaceTrees) collectDependencies(workspaceTree, packages, edges);

  const rootManifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const rootRef = packageUrl(rootManifest.name, rootManifest.version);
  const serialHex = createHash('sha256')
    .update([rootRef, ...packages.keys()].sort().join('\n'))
    .digest('hex');
  const serialNumber = `urn:uuid:${serialHex.slice(0, 8)}-${serialHex.slice(8, 12)}-5${serialHex.slice(
    13,
    16,
  )}-a${serialHex.slice(17, 20)}-${serialHex.slice(20, 32)}`;
  const bom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber,
    version: 1,
    metadata: {
      component: {
        type: 'application',
        'bom-ref': rootRef,
        name: rootManifest.name,
        version: rootManifest.version,
        purl: rootRef,
      },
    },
    components: [...packages.values()]
      .map((node) => componentFromPackage(node))
      .sort((left, right) => left.purl.localeCompare(right.purl)),
    dependencies: [
      { ref: rootRef, dependsOn: [...packages.keys()].sort() },
      ...[...edges.entries()]
        .map(([ref, dependsOn]) => ({ ref, dependsOn: [...dependsOn].sort() }))
        .sort((left, right) => left.ref.localeCompare(right.ref)),
    ],
  };
  validateSbom(bom);
  await validateCycloneDxSchema(bom);
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(bom, null, 2)}\n`);
  return bom;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const root = resolve(import.meta.dirname, '..');
  const outputFile = resolve(root, process.argv[2] ?? 'artifacts/sbom.cdx.json');
  await generateSbom({ root, outputFile });
  console.log(`Generated CycloneDX SBOM with pnpm: ${outputFile}`);
}
