import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Preview } from '../components/Preview';

describe('Preview', () => {
  it('renders preview container', () => {
    render(<Preview glanceUrl="http://localhost:8080" />);
    // The container is a div with flex-1 flex flex-col
    const container = document.querySelector('div.flex-1.flex.flex-col');
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

  it('adds page slug to URL when provided', () => {
    render(<Preview glanceUrl="http://localhost:8080" pageSlug="my-page" />);
    const iframe = screen.getByTitle('Glance Dashboard Preview');
    expect(iframe).toHaveAttribute('src', 'http://localhost:8080/my-page');
  });

  it('combines page slug and refresh key', () => {
    render(<Preview glanceUrl="http://localhost:8080" pageSlug="my-page" refreshKey={3} />);
    const iframe = screen.getByTitle('Glance Dashboard Preview');
    expect(iframe).toHaveAttribute('src', 'http://localhost:8080/my-page?_refresh=3');
  });

  it('applies desktop viewport class', () => {
    render(<Preview glanceUrl="http://localhost:8080" device="desktop" />);
    // The viewport wrapper has the device class applied directly
    const viewport = document.querySelector('div.desktop');
    expect(viewport).toBeInTheDocument();
  });

  it('applies tablet viewport class', () => {
    render(<Preview glanceUrl="http://localhost:8080" device="tablet" />);
    const viewport = document.querySelector('div.tablet');
    expect(viewport).toBeInTheDocument();
  });

  it('applies phone viewport class', () => {
    render(<Preview glanceUrl="http://localhost:8080" device="phone" />);
    const viewport = document.querySelector('div.phone');
    expect(viewport).toBeInTheDocument();
  });
});
