declare module '*.mjs' {
  export const scanProductionPaths: (root: string) => Array<{ path: string; term: string }>;
}
