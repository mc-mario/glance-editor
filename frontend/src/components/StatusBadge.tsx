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

  const statusColors = {
    connected: 'text-success',
    disconnected: 'text-error',
    loading: 'text-warning',
  };

  return (
    <button
      className={`group inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium border-none bg-transparent cursor-pointer transition-all duration-150 ${statusColors[status]} ${onClick ? 'hover:bg-bg-tertiary' : ''}`}
      onClick={onClick}
      title={label || defaultLabels[status]}
    >
      <span className="w-2 h-2 rounded-full bg-current flex-shrink-0" />
      <span className="opacity-0 max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:opacity-100 group-hover:max-w-[100px] group-hover:ml-1">
        {label || defaultLabels[status]}
      </span>
    </button>
  );
}
