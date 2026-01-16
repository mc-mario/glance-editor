import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders connected status', () => {
    render(<StatusBadge status="connected" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders disconnected status', () => {
    render(<StatusBadge status="disconnected" />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('renders loading status', () => {
    render(<StatusBadge status="loading" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<StatusBadge status="connected" label="Custom Label" />);
    expect(screen.getByText('Custom Label')).toBeInTheDocument();
  });

  it('applies correct CSS class for status', () => {
    const { container } = render(<StatusBadge status="connected" />);
    // Status is now indicated by text-success class
    const badge = container.querySelector('button');
    expect(badge).toHaveClass('text-success');
  });
});
