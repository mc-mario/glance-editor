export interface GlanceConfig {
  server?: ServerConfig;
  auth?: AuthConfig;
  document?: DocumentConfig;
  theme?: ThemeConfig;
  branding?: BrandingConfig;
  pages: PageConfig[];
}

export interface ServerConfig {
  host?: string;
  port?: number;
  proxied?: boolean;
  'assets-path'?: string;
  'base-url'?: string;
}

export interface AuthConfig {
  'secret-key': string;
  users: Record<string, UserConfig>;
}

export interface UserConfig {
  password?: string;
  'password-hash'?: string;
}

export interface DocumentConfig {
  head?: string;
}

export interface ThemeConfig {
  'background-color'?: string;
  'primary-color'?: string;
  'positive-color'?: string;
  'negative-color'?: string;
  light?: boolean;
  'contrast-multiplier'?: number;
  'text-saturation-multiplier'?: number;
  'custom-css-file'?: string;
  'disable-picker'?: boolean;
  presets?: Record<string, ThemeProperties>;
}

export interface ThemeProperties {
  'background-color'?: string;
  'primary-color'?: string;
  'positive-color'?: string;
  'negative-color'?: string;
  light?: boolean;
  'contrast-multiplier'?: number;
  'text-saturation-multiplier'?: number;
}

export interface BrandingConfig {
  'hide-footer'?: boolean;
  'custom-footer'?: string;
  'logo-text'?: string;
  'logo-url'?: string;
  'favicon-url'?: string;
  'app-name'?: string;
  'app-icon-url'?: string;
  'app-background-color'?: string;
}

export interface PageConfig {
  name: string;
  slug?: string;
  width?: 'wide' | 'slim';
  'desktop-navigation-width'?: 'wide' | 'slim';
  'show-mobile-header'?: boolean;
  'hide-desktop-navigation'?: boolean;
  'center-vertically'?: boolean;
  'head-widgets'?: WidgetConfig[];
  columns: ColumnConfig[];
}

export interface ColumnConfig {
  size: 'small' | 'full';
  widgets: WidgetConfig[];
}

export interface WidgetConfig {
  type: string;
  title?: string;
  'title-url'?: string;
  'hide-header'?: boolean;
  'css-class'?: string;
  cache?: string;
  [key: string]: unknown;
}

export interface ConfigResponse {
  config: GlanceConfig | null;
  raw: string;
  parseError?: YamlParseError | null;
}

export interface YamlParseError {
  message: string;
  line: number | null;
  column: number | null;
  name: string;
}

export interface ApiError {
  error: string;
}
