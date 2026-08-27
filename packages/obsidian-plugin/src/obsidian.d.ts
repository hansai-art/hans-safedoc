declare module 'obsidian' {
  export class Plugin {
    onload(): Promise<void> | void;
  }
  export const Platform: { isMobile: boolean };
}
