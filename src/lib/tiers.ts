export interface TierStyle {
  color: string
  bg: string
  border: string
}

export const TIER_STYLES: Record<string, TierStyle> = {
  Bronze:   { color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  Silver:   { color: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
  Gold:     { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  Platinum: { color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' },
  Diamond:  { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  Ruby:     { color: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
}

export const TIER_DEFAULT: TierStyle = { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' }

export function getTierStyle(tierName: string | null | undefined): TierStyle {
  return (tierName && TIER_STYLES[tierName]) ? TIER_STYLES[tierName] : TIER_DEFAULT
}

export function parseTierName(aiTier: string | null | undefined): string | null {
  return aiTier ? aiTier.split(' ')[0] : null
}
