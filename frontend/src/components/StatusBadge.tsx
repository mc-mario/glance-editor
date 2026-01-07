interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'loading';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const defaultLabels = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    loading: 'Loading...',
  };

  return (
    <span className={`status-badge ${status}`}>
      <span className="status-dot" />
      {label || defaultLabels[status]}
    </span>
  );
}
