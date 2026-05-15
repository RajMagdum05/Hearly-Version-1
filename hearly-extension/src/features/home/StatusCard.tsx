import { Card } from '@/ui/shared';

export interface StatusCardProps {
  title: string;
  subtitle?: string;
}

export function StatusCard({ title, subtitle }: StatusCardProps) {
  return (
    <Card>
      <p className="text-center text-sm font-medium text-hearly-text">{title}</p>
      {subtitle ? (
        <p className="mt-1 text-center text-xs text-hearly-secondary">
          {subtitle}
        </p>
      ) : null}
    </Card>
  );
}
