import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { docxAdapter } from '../packages/document-formats/src/docx/adapter.js';
import { xlsxAdapter } from '../packages/document-formats/src/xlsx/adapter.js';

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

const outputDirectory = resolve(process.argv[2] ?? 'office-reopen-evidence');
await mkdir(outputDirectory, { recursive: true });

const docxSource = await readFile(
  resolve('tests/fixtures/formats/docx/hsd-acc-docx-002/input.docx'),
);
const docxBefore = sha256(docxSource);
const docxExtraction = docxAdapter.extract(docxSource);
const docxSurface = docxExtraction.surfaces.find((surface) =>
  surface.text.includes('0900-000-001'),
);
if (!docxSurface) throw new Error('Synthetic DOCX phone surface was not found');
const docxStart = docxSurface.text.indexOf('0900-000-001');
const docxArtifact = docxAdapter.rewrite(docxSource, [
  {
    locator: {
      ...docxSurface.locator,
      logicalStartUtf16: docxStart,
      logicalEndUtf16: docxStart + '0900-000-001'.length,
    },
    replacement: '⟦PB:PHONE:E1:EVIDENCE⟧',
  },
]);
docxAdapter.reopen(docxArtifact);
const docxManifest = docxAdapter.verifyReopen(docxArtifact);
if (docxAdapter.residual(docxArtifact, ['0900-000-001']).length > 0)
  throw new Error('Synthetic DOCX residual check failed');
if (sha256(docxSource) !== docxBefore) throw new Error('Synthetic DOCX source changed');
const docxPath = resolve(outputDirectory, 'hans-safedoc-synthetic-anonymized.docx');
await writeFile(docxPath, docxArtifact, { flag: 'wx' });

const xlsxSource = await readFile(
  resolve('tests/fixtures/formats/xlsx/hsd-acc-xlsx-003/input.xlsx'),
);
const xlsxBefore = sha256(xlsxSource);
const xlsxExtraction = xlsxAdapter.extract(xlsxSource);
const xlsxCell = xlsxExtraction.cells.find((cell) => cell.cell === 'B2');
if (!xlsxCell) throw new Error('Synthetic XLSX phone cell was not found');
const xlsxArtifact = xlsxAdapter.rewrite(xlsxSource, [
  { locator: xlsxCell.locator, replacement: '⟦PB:PHONE:E1:EVIDENCE⟧' },
]);
xlsxAdapter.reopen(xlsxArtifact);
const xlsxManifest = xlsxAdapter.verifyReopen(xlsxArtifact);
if (xlsxAdapter.residual(xlsxArtifact, ['900000001', '0900-000-001']).length > 0)
  throw new Error('Synthetic XLSX residual check failed');
if (sha256(xlsxSource) !== xlsxBefore) throw new Error('Synthetic XLSX source changed');
const xlsxPath = resolve(outputDirectory, 'hans-safedoc-synthetic-anonymized.xlsx');
await writeFile(xlsxPath, xlsxArtifact, { flag: 'wx' });

const evidence = {
  generatedAt: new Date().toISOString(),
  syntheticOnly: true,
  docx: {
    sourceSha256Before: docxBefore,
    sourceSha256After: sha256(docxSource),
    artifactPath: docxPath,
    artifactSha256: sha256(docxArtifact),
    residualCount: 0,
    reopen: docxManifest,
  },
  xlsx: {
    sourceSha256Before: xlsxBefore,
    sourceSha256After: sha256(xlsxSource),
    artifactPath: xlsxPath,
    artifactSha256: sha256(xlsxArtifact),
    residualCount: 0,
    reopen: xlsxManifest,
  },
};
await writeFile(
  resolve(outputDirectory, 'artifact-evidence.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
  { flag: 'wx' },
);
console.log(JSON.stringify(evidence, null, 2));
