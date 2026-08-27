declare module '*.mjs' {
  export const scanProductionPaths: (root: string) => Array<{ path: string; term: string }>;
  export const generateSbom: (options: { root: string; outputFile: string }) => Promise<unknown>;
  export const validateSbom: (bom: unknown) => void;
}
