import type { MemoryType } from '../api/client';

type BadgeVariant = 'success' | 'warning' | 'info' | 'default' | MemoryType;

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
}

const VARIANT_MAP: Record<BadgeVariant, string> = {
  user: 'badge badge-user',
  project: 'badge badge-project',
  knowledge: 'badge badge-knowledge',
  distilled: 'badge badge-distilled',
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  info: 'badge badge-info',
  default: 'badge badge-default',
};

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  const className = VARIANT_MAP[variant] ?? VARIANT_MAP.default;
  const displayLabel = label ?? variant;
  return <span className={className}>{displayLabel}</span>;
}
