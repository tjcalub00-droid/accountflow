import React from 'react';

type BadgeVariant =
  | 'paid' |'sent' |'draft' |'overdue' |'partial' |'void' |'closed' |'pending' |'approved' |'rejected' |'processing' |'scheduled' |'active' |'archived' |'printed';

const variantMap: Record<BadgeVariant, string> = {
  paid: 'bg-success/10 text-success border border-success/20',
  sent: 'bg-primary/10 text-primary border border-primary/20',
  draft: 'bg-muted text-muted-foreground border border-border',
  overdue: 'bg-danger/10 text-danger border border-danger/20',
  partial: 'bg-warning/10 text-warning border border-warning/20',
  void: 'bg-muted text-muted-foreground border border-border line-through',
  closed: 'bg-muted text-muted-foreground border border-border',
  pending: 'bg-warning/10 text-warning border border-warning/20',
  approved: 'bg-success/10 text-success border border-success/20',
  rejected: 'bg-danger/10 text-danger border border-danger/20',
  processing: 'bg-primary/10 text-primary border border-primary/20',
  scheduled: 'bg-secondary text-secondary-foreground border border-border',
  active: 'bg-success/10 text-success border border-success/20',
  archived: 'bg-muted text-muted-foreground border border-border',
  printed: 'bg-primary/10 text-primary border border-primary/20',
};

interface StatusBadgeProps {
  status: BadgeVariant;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const display = label ?? status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide ${variantMap[status]}`}
    >
      {display}
    </span>
  );
}