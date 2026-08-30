interface HTMLElement {
  empty(): void;
  createDiv(options?: { cls?: string }, callback?: (element: HTMLElement) => void): HTMLElement;
  createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: { text?: string; cls?: string; attr?: Record<string, string> },
    callback?: (element: HTMLElementTagNameMap[K]) => void,
  ): HTMLElementTagNameMap[K];
}

declare module 'obsidian' {
  export class App {}
  export class Modal {
    app: App;
    modalEl: HTMLElement;
    contentEl: HTMLElement;
    constructor(app: App);
    open(): void;
    close(): void;
    onOpen(): void;
    onClose(): void;
  }
  export class TFile {
    path: string;
    extension: string;
    basename: string;
  }
  export interface WorkspaceLeaf {
    view?: ItemView;
    setViewState(state: { type: string; active?: boolean }): Promise<void>;
    openFile(file: TFile): Promise<void>;
  }
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
    manifest: { id: string; dir?: string };
    app: {
      workspace: {
        getLeavesOfType(type: string): WorkspaceLeaf[];
        getRightLeaf(split: boolean): WorkspaceLeaf | null;
        getLeaf(mode: 'tab'): WorkspaceLeaf;
        getActiveFile(): TFile | null;
        revealLeaf(leaf: WorkspaceLeaf): Promise<void>;
        onLayoutReady(callback: () => void): void;
      };
      vault: {
        configDir: string;
        adapter: { getBasePath?: () => string };
        read(file: TFile): Promise<string>;
        getFileByPath(path: string): TFile | null;
        getFolderByPath(path: string): object | null;
        createFolder(path: string): Promise<void>;
        create(path: string, content: string): Promise<TFile>;
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
    loadData(): Promise<unknown>;
    saveData(data: unknown): Promise<void>;
  }
  export class Notice {
    constructor(message: string, timeout?: number);
  }
  export const Platform: { isMobile: boolean };
  export function requestUrl(input: {
    url: string;
    method?: string;
    throw?: boolean;
  }): Promise<{ status: number; arrayBuffer: ArrayBuffer }>;
}
