import { WidgetConfig } from './types';

// Widget definition for the palette
export interface WidgetDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: 'content' | 'social' | 'monitoring' | 'utility' | 'media' | 'developer';
}

// All 27 widget types supported by Glance
export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  // Content widgets
  {
    type: 'rss',
    name: 'RSS Feed',
    description: 'Display items from RSS/Atom feeds',
    icon: '📰',
    category: 'content',
  },
  {
    type: 'bookmarks',
    name: 'Bookmarks',
    description: 'Display a list of bookmarks',
    icon: '🔖',
    category: 'content',
  },
  {
    type: 'iframe',
    name: 'IFrame',
    description: 'Embed external content in an iframe',
    icon: '🖼️',
    category: 'content',
  },
  {
    type: 'html',
    name: 'HTML',
    description: 'Display custom HTML content',
    icon: '📝',
    category: 'content',
  },

  // Social widgets
  {
    type: 'hacker-news',
    name: 'Hacker News',
    description: 'Display posts from Hacker News',
    icon: '🟠',
    category: 'social',
  },
  {
    type: 'lobsters',
    name: 'Lobsters',
    description: 'Display posts from Lobsters',
    icon: '🦞',
    category: 'social',
  },
  {
    type: 'reddit',
    name: 'Reddit',
    description: 'Display posts from Reddit subreddits',
    icon: '🔴',
    category: 'social',
  },
  {
    type: 'twitch-top-games',
    name: 'Twitch Top Games',
    description: 'Display top games on Twitch',
    icon: '🎮',
    category: 'social',
  },
  {
    type: 'twitch-channels',
    name: 'Twitch Channels',
    description: 'Display specific Twitch channels',
    icon: '📺',
    category: 'social',
  },

  // Monitoring widgets
  {
    type: 'monitor',
    name: 'Monitor',
    description: 'Monitor service availability',
    icon: '🔍',
    category: 'monitoring',
  },
  {
    type: 'server-stats',
    name: 'Server Stats',
    description: 'Display server statistics',
    icon: '📊',
    category: 'monitoring',
  },
  {
    type: 'docker-containers',
    name: 'Docker Containers',
    description: 'Display Docker container status',
    icon: '🐳',
    category: 'monitoring',
  },
  {
    type: 'dns-stats',
    name: 'DNS Stats',
    description: 'Display DNS server statistics',
    icon: '🌐',
    category: 'monitoring',
  },
  {
    type: 'change-detection',
    name: 'Change Detection',
    description: 'Monitor websites for changes',
    icon: '👁️',
    category: 'monitoring',
  },

  // Utility widgets
  {
    type: 'clock',
    name: 'Clock',
    description: 'Display current time with timezones',
    icon: '🕐',
    category: 'utility',
  },
  {
    type: 'calendar',
    name: 'Calendar',
    description: 'Display calendar with events',
    icon: '📅',
    category: 'utility',
  },
  {
    type: 'calendar-legacy',
    name: 'Calendar (Legacy)',
    description: 'Legacy calendar widget',
    icon: '📆',
    category: 'utility',
  },
  {
    type: 'weather',
    name: 'Weather',
    description: 'Display weather information',
    icon: '⛅',
    category: 'utility',
  },
  {
    type: 'search',
    name: 'Search',
    description: 'Search bar with multiple engines',
    icon: '🔎',
    category: 'utility',
  },
  {
    type: 'markets',
    name: 'Markets',
    description: 'Display market/stock information',
    icon: '📈',
    category: 'utility',
  },
  {
    type: 'to-do',
    name: 'To-Do',
    description: 'Display a to-do list',
    icon: '✅',
    category: 'utility',
  },

  // Media widgets
  {
    type: 'videos',
    name: 'Videos',
    description: 'Display YouTube videos',
    icon: '🎬',
    category: 'media',
  },
  {
    type: 'releases',
    name: 'Releases',
    description: 'Display media releases',
    icon: '🎵',
    category: 'media',
  },

  // Developer widgets
  {
    type: 'repository',
    name: 'Repository',
    description: 'Display GitHub repository information',
    icon: '📦',
    category: 'developer',
  },
  {
    type: 'custom-api',
    name: 'Custom API',
    description: 'Fetch data from custom API endpoints',
    icon: '🔌',
    category: 'developer',
  },
  {
    type: 'extension',
    name: 'Extension',
    description: 'Load external widget extension',
    icon: '🧩',
    category: 'developer',
  },

  // Container widgets
  {
    type: 'group',
    name: 'Group',
    description: 'Group multiple widgets together',
    icon: '📁',
    category: 'utility',
  },
  {
    type: 'split-column',
    name: 'Split Column',
    description: 'Split a column into sub-columns',
    icon: '⬜',
    category: 'utility',
  },
];

// Get widget definition by type
export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return WIDGET_DEFINITIONS.find((w) => w.type === type);
}

// Get widgets by category
export function getWidgetsByCategory(category: WidgetDefinition['category']): WidgetDefinition[] {
  return WIDGET_DEFINITIONS.filter((w) => w.category === category);
}

// Get all categories
export const WIDGET_CATEGORIES: { id: WidgetDefinition['category']; name: string }[] = [
  { id: 'content', name: 'Content' },
  { id: 'social', name: 'Social' },
  { id: 'monitoring', name: 'Monitoring' },
  { id: 'utility', name: 'Utility' },
  { id: 'media', name: 'Media' },
  { id: 'developer', name: 'Developer' },
];

// Create a default widget config for a given type
export function createDefaultWidget(type: string): WidgetConfig {
  const def = getWidgetDefinition(type);
  const widget: WidgetConfig = { type };
  
  if (def) {
    widget.title = def.name;
  }

  // Add default properties based on widget type
  switch (type) {
    case 'clock':
      widget['hour-format'] = '24h';
      break;
    case 'weather':
      widget.location = 'New York, NY';
      break;
    case 'rss':
      widget.feeds = [{ url: '', title: '' }];
      widget.limit = 10;
      break;
    case 'bookmarks':
      widget.groups = [{ title: 'Links', links: [] }];
      break;
    case 'monitor':
      widget.sites = [];
      break;
    case 'hacker-news':
    case 'lobsters':
      widget.limit = 15;
      break;
    case 'reddit':
      widget.subreddit = '';
      widget.limit = 10;
      break;
    case 'videos':
      widget.channels = [];
      widget.limit = 10;
      break;
    case 'repository':
      widget.repository = '';
      break;
  }

  return widget;
}
