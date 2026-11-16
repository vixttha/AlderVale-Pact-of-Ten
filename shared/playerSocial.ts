export function isWizardMuted(blockedWizardIds: readonly string[], senderWizardId: string | undefined | null): boolean {
  return Boolean(senderWizardId && blockedWizardIds.includes(senderWizardId));
}