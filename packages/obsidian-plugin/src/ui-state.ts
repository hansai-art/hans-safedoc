export type ClientUiState = 'LOCKED' | 'UNLOCKED';
export interface CommandPresentation {
  readonly enabled: boolean;
  readonly disabledReason?: string;
  readonly ariaLabel: string;
}
/** Sensitive commands are derived from lock state, never cached by the view. */
export function commandPresentation(
  state: ClientUiState,
  action: 'scan' | 'review' | 'export' | 'backup' | 'restore' | 'recovery',
): CommandPresentation {
  const ariaLabel = `Privacy Bridge: ${action}`;
  if (state === 'UNLOCKED' || action === 'recovery') return { enabled: true, ariaLabel };
  return { enabled: false, disabledReason: '請先解鎖 Client 才能執行此操作。', ariaLabel };
}
export function clearSensitiveUiState(): {
  readonly selectedEntityId: undefined;
  readonly preview: undefined;
} {
  return { selectedEntityId: undefined, preview: undefined };
}
