import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Preview } from '../components/Preview';

describe('Preview', () => {
  it('renders preview container', () => {
    const { container } = render(<Preview glanceUrl="http://localhost:8080" />);
    // Container is the outer flex div
    expect(container.querySelector('.flex-1')).toBeInTheDocument();
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

  it('applies desktop styling (no rounded corners)', () => {
    const { container } = render(<Preview glanceUrl="http://localhost:8080" device="desktop" />);
    const wrapper = container.querySelector('.bg-white');
    expect(wrapper).toHaveClass('rounded-none');
  });

  it('applies tablet styling', () => {
    const { container } = render(<Preview glanceUrl="http://localhost:8080" device="tablet" />);
    const wrapper = container.querySelector('.bg-white');
    expect(wrapper).toHaveClass('max-w-[768px]');
  });

  it('applies phone styling', () => {
    const { container } = render(<Preview glanceUrl="http://localhost:8080" device="phone" />);
    const wrapper = container.querySelector('.bg-white');
    expect(wrapper).toHaveClass('w-[375px]');
  });
});
