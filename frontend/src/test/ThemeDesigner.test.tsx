import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeDesigner } from '../components/ThemeDesigner';
import type { ThemeConfig } from '../types';

describe('ThemeDesigner', () => {
  const mockOnChange = vi.fn();
  const mockOnClose = vi.fn();

  const defaultTheme: ThemeConfig = {
    'background-color': '0 0 16',
    'primary-color': '240 50 50',
    light: false,
    'contrast-multiplier': 1.0,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnClose.mockClear();
  });

  it('renders the theme designer sections', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    expect(screen.getByText('Quick Presets')).toBeInTheDocument();
    expect(screen.getByText('Colors')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('renders preset buttons', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    expect(screen.getByText('dark-default')).toBeInTheDocument();
    expect(screen.getByText('light-default')).toBeInTheDocument();
    expect(screen.getByText('nord')).toBeInTheDocument();
    expect(screen.getByText('gruvbox')).toBeInTheDocument();
    expect(screen.getByText('dracula')).toBeInTheDocument();
  });

  it('renders color pickers', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    expect(screen.getByText('Background Color')).toBeInTheDocument();
    expect(screen.getByText('Primary Color')).toBeInTheDocument();
    expect(screen.getByText('Positive Color')).toBeInTheDocument();
    expect(screen.getByText('Negative Color')).toBeInTheDocument();
  });

  it('calls onChange when applying a preset', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText('nord'));
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        'background-color': '220 16 22',
        'primary-color': '193 43 67',
        light: false,
      })
    );
  });

  it('renders the Light Mode checkbox', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    const checkbox = screen.getByLabelText('Light Mode');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('calls onChange when toggling Light Mode', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    const checkbox = screen.getByLabelText('Light Mode');
    fireEvent.click(checkbox);
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ light: true })
    );
  });

  it('renders contrast multiplier slider', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    expect(screen.getByText('Contrast Multiplier')).toBeInTheDocument();
    // Slider should exist with the current value
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThan(0);
  });

  it('renders text saturation multiplier slider', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    expect(screen.getByText('Text Saturation Multiplier')).toBeInTheDocument();
  });

  it('renders custom CSS file input', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    expect(screen.getByText('Custom CSS File')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('/path/to/custom.css')).toBeInTheDocument();
  });

  it('renders disable picker checkbox', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    expect(screen.getByLabelText('Disable Theme Picker in Glance')).toBeInTheDocument();
  });

  it('shows save preset button', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    expect(screen.getByText('+ Save Current as Preset')).toBeInTheDocument();
  });

  it('shows new preset form when clicking save preset button', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText('+ Save Current as Preset'));
    
    expect(screen.getByPlaceholderText('Preset name')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('saves custom preset with name', () => {
    render(<ThemeDesigner theme={defaultTheme} onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText('+ Save Current as Preset'));
    
    const input = screen.getByPlaceholderText('Preset name');
    fireEvent.change(input, { target: { value: 'my-theme' } });
    fireEvent.click(screen.getByText('Save'));
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        presets: expect.objectContaining({
          'my-theme': expect.any(Object),
        }),
      })
    );
  });

  it('renders with undefined theme', () => {
    render(<ThemeDesigner theme={undefined} onChange={mockOnChange} />);
    
    expect(screen.getByText('Quick Presets')).toBeInTheDocument();
    expect(screen.getByText('Colors')).toBeInTheDocument();
  });

  it('renders user custom presets', () => {
    const themeWithPresets: ThemeConfig = {
      ...defaultTheme,
      presets: {
        'custom-preset': {
          'background-color': '100 50 50',
          light: false,
        },
      },
    };
    
    render(<ThemeDesigner theme={themeWithPresets} onChange={mockOnChange} />);
    
    expect(screen.getByText('custom-preset')).toBeInTheDocument();
  });
});
