export type ClientUiState = 'LOCKED' | 'UNLOCKED';
export interface CommandPresentation {
  readonly enabled: boolean;
  readonly disabledReason?: string;
  readonly ariaLabel: string;
}
export type WorkspaceAction = 'scan' | 'review' | 'export' | 'backup' | 'restore' | 'recovery';
export interface WorkflowBlockers {
  readonly pendingCandidates?: number;
  readonly secrets?: number;
  readonly unsupportedFiles?: number;
  readonly sourceChanged?: boolean;
  readonly mappingUnlocked?: boolean;
  readonly residualScanComplete?: boolean;
}
export function disabledReasons(blockers: WorkflowBlockers): readonly string[] {
  const reasons: string[] = [];
  if ((blockers.pendingCandidates ?? 0) > 0)
    reasons.push(`仍有 ${blockers.pendingCandidates} 個未審核候選`);
  if ((blockers.secrets ?? 0) > 0) reasons.push(`有 ${blockers.secrets} 個 Secret`);
  if ((blockers.unsupportedFiles ?? 0) > 0)
    reasons.push(`有 ${blockers.unsupportedFiles} 個不支援附件未排除`);
  if (blockers.sourceChanged) reasons.push('原始文件已變更');
  if (blockers.mappingUnlocked === false) reasons.push('Mapping 尚未解鎖');
  if (blockers.residualScanComplete === false) reasons.push('Residual Scan 尚未完成');
  return reasons;
}
/** Sensitive commands are derived from lock state, never cached by the view. */
export function commandPresentation(
  state: ClientUiState,
  action: WorkspaceAction,
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
