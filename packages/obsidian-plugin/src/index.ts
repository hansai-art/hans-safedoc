export interface RuntimeInfo {
  readonly isMobile: boolean;
}

export function assertDesktopRuntime(runtime: RuntimeInfo): void {
  if (runtime.isMobile)
    throw new Error('PB-PLATFORM-001: Privacy Bridge requires Obsidian Desktop.');
}

/**
 * Testable lifecycle shell. The production entrypoint adapts it to Obsidian's
 * Plugin base class; no sensitive state or product behavior is implemented in E00.
 */
export class PrivacyBridgePlugin {
  async onload(): Promise<void> {
    assertDesktopRuntime({ isMobile: false });
  }

  async onunload(): Promise<void> {}
}
