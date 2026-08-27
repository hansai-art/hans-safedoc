import { Plugin, Platform } from 'obsidian';
import { assertDesktopRuntime } from './index.js';

export default class ObsidianPrivacyBridgePlugin extends Plugin {
  override async onload(): Promise<void> {
    assertDesktopRuntime({ isMobile: Platform.isMobile });
  }
}
