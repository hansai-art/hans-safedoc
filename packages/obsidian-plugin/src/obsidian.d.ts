interface HTMLElement {
  empty(): void;
  createDiv(options?: { cls?: string }): HTMLElement;
  createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: { text?: string; attr?: Record<string, string> },
    callback?: (element: HTMLElementTagNameMap[K]) => void,
  ): HTMLElementTagNameMap[K];
}
declare module 'obsidian' {
  export interface WorkspaceLeaf {}
  export class ItemView {
    containerEl: HTMLElement;
    constructor(leaf: WorkspaceLeaf);
    getViewType(): string;
    getDisplayText(): string;
    getIcon(): string;
    onOpen(): Promise<void> | void;
    onClose(): Promise<void> | void;
  }
  export class Plugin {
    app: {
      workspace: {
        getLeavesOfType(type: string): WorkspaceLeaf[];
        getRightLeaf(split: boolean): WorkspaceLeaf | null;
        revealLeaf(leaf: WorkspaceLeaf): Promise<void>;
      };
    };
    onload(): Promise<void> | void;
    onunload(): Promise<void> | void;
    addRibbonIcon(icon: string, title: string, callback: () => unknown): HTMLElement;
    addCommand(command: {
      id: string;
      name: string;
      callback: () => unknown;
      checkCallback?: (checking: boolean) => boolean;
    }): void;
    registerView(type: string, creator: (leaf: WorkspaceLeaf) => ItemView): void;
  }
  export const Platform: { isMobile: boolean };
}
