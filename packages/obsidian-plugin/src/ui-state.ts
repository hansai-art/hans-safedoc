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
    reasons.push(`仍有 ${blockers.pendingCandidates} 個項目尚未確認`);
  if ((blockers.secrets ?? 0) > 0) reasons.push(`有 ${blockers.secrets} 個機密字串`);
  if ((blockers.unsupportedFiles ?? 0) > 0)
    reasons.push(`有 ${blockers.unsupportedFiles} 個不支援附件未排除`);
  if (blockers.sourceChanged) reasons.push('原始文件已變更');
  if (blockers.mappingUnlocked === false) reasons.push('安全代碼對照資料尚未解鎖');
  if (blockers.residualScanComplete === false) reasons.push('殘留敏感資料檢查尚未完成');
  return reasons;
}
/** Sensitive commands are derived from lock state, never cached by the view. */
export function commandPresentation(
  state: ClientUiState,
  action: WorkspaceAction,
): CommandPresentation {
  const actionLabel: Readonly<Record<WorkspaceAction, string>> = {
    scan: '掃描',
    review: '檢查',
    export: '輸出',
    backup: '備份',
    restore: '還原',
    recovery: '修復',
  };
  const ariaLabel = `Hans SafeDoc：${actionLabel[action]}`;
  if (state === 'UNLOCKED' || action === 'recovery') return { enabled: true, ariaLabel };
  return { enabled: false, disabledReason: '請先解鎖敏感資料工作區才能執行此操作。', ariaLabel };
}
export function clearSensitiveUiState(): {
  readonly selectedEntityId: undefined;
  readonly preview: undefined;
} {
  return { selectedEntityId: undefined, preview: undefined };
}
