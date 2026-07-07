export interface NetworkConnectionInfo {
  saveData?: boolean
  effectiveType?: string
}

/**
 * Adjacent-photo preloading is a nice-to-have; on constrained connections it
 * competes with bandwidth the guest may be paying for, so it must be skippable.
 */
export function shouldPreloadImages(connection: NetworkConnectionInfo | undefined): boolean {
  if (!connection) return true
  if (connection.saveData) return false
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') return false
  return true
}
