interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'loading';
  label?: string;
  onClick?: () => void;
}

export function StatusBadge({ status, label, onClick }: StatusBadgeProps) {
  const defaultLabels = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    loading: 'Loading...',
  };

  return (
    <button
      className={`border-1 status-badge ${status} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      title={label || defaultLabels[status]}
    >
      <span className="status-dot" />
      <span className="status-text">{label || defaultLabels[status]}</span>
    </button>
  );
}
