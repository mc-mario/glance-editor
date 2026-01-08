import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Preview } from '../components/Preview';

describe('Preview', () => {
  it('renders preview container', () => {
    render(<Preview glanceUrl="http://localhost:8080" />);
    const container = document.querySelector('.preview-container');
    expect(container).toBeInTheDocument();
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

  it('shows device info with default desktop', () => {
    render(<Preview glanceUrl="http://localhost:8080" />);
    expect(screen.getByText('Desktop - 1920 x 1080')).toBeInTheDocument();
  });

  it('shows tablet device info', () => {
    render(<Preview glanceUrl="http://localhost:8080" device="tablet" />);
    expect(screen.getByText('Tablet - 768 x 1024')).toBeInTheDocument();
  });

  it('shows phone device info', () => {
    render(<Preview glanceUrl="http://localhost:8080" device="phone" />);
    expect(screen.getByText('Phone - 375 x 667')).toBeInTheDocument();
  });

  it('applies desktop viewport class', () => {
    render(<Preview glanceUrl="http://localhost:8080" device="desktop" />);
    const viewport = document.querySelector('.preview-viewport');
    expect(viewport).toHaveClass('desktop');
  });

  it('applies tablet viewport class', () => {
    render(<Preview glanceUrl="http://localhost:8080" device="tablet" />);
    const viewport = document.querySelector('.preview-viewport');
    expect(viewport).toHaveClass('tablet');
  });

  it('applies phone viewport class', () => {
    render(<Preview glanceUrl="http://localhost:8080" device="phone" />);
    const viewport = document.querySelector('.preview-viewport');
    expect(viewport).toHaveClass('phone');
  });
});
