import type { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: string;
};

export function EmptyState({ icon: Icon, title, description, badge }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden />
      </div>
      {badge && (
        <span className="mb-2 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {badge}
        </span>
      )}
      <h2 className="font-medium">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
    </section>
  );
}
