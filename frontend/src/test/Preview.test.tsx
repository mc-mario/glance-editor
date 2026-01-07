import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Preview } from '../components/Preview';

describe('Preview', () => {
  it('renders preview container', () => {
    render(<Preview glanceUrl="http://localhost:8080" />);
    expect(screen.getByText('Live Preview')).toBeInTheDocument();
  });

  it('renders iframe with correct src', () => {
    render(<Preview glanceUrl="http://localhost:8080" />);
    const iframe = screen.getByTitle('Glance Dashboard Preview');
    expect(iframe).toHaveAttribute('src', 'http://localhost:8080');
  });

  it('adds refresh key to src when provided', () => {
    render(<Preview glanceUrl="http://localhost:8080" refreshKey={5} />);
    const iframe = screen.getByTitle('Glance Dashboard Preview');
    expect(iframe).toHaveAttribute('src', 'http://localhost:8080?_refresh=5');
  });

  it('renders open in new tab link', () => {
    render(<Preview glanceUrl="http://localhost:8080" />);
    const link = screen.getByText(/Open in new tab/);
    expect(link).toHaveAttribute('href', 'http://localhost:8080');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
