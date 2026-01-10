interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'loading';
  label?: string;
}

const statusStyles = {
  connected: 'bg-success/20 text-success',
  disconnected: 'bg-error/20 text-error',
  loading: 'bg-warning/20 text-warning',
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const defaultLabels = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    loading: 'Loading...',
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}
    >
      <span className="w-2 h-2 rounded-full bg-current" />
      {label || defaultLabels[status]}
    </span>
  );
}
