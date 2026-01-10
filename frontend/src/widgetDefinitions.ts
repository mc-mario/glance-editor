import { WidgetConfig } from './types';
import {
  Rss,
  Bookmark,
  Frame,
  FileCode,
  Flame,
  Bug,
  MessageSquare,
  Gamepad2,
  Tv,
  Activity,
  Server,
  Container,
  Globe,
  Eye,
  Clock,
  Calendar,
  CalendarDays,
  CloudSun,
  Search,
  TrendingUp,
  ListChecks,
  Play,
  Disc3,
  GitBranch,
  Plug,
  Puzzle,
  FolderOpen,
  Columns,
  Package,
  type LucideIcon,
} from 'lucide-react';

// Property types for widget configuration schema
export type PropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'duration'
  | 'color'
  | 'url'
  | 'array'
  | 'object'
  | 'text';

// Property definition for form generation
export interface PropertyDefinition {
  type: PropertyType;
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  placeholder?: string;
  // For select type
  options?: { value: string; label: string }[];
  // For number type
  min?: number;
  max?: number;
  step?: number;
  // For array type
  itemType?: PropertyType;
  itemProperties?: Record<string, PropertyDefinition>;
  minItems?: number;
  maxItems?: number;
  // For object type
  properties?: Record<string, PropertyDefinition>;
}

// Widget definition for the palette
export interface WidgetDefinition {
  type: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: 'content' | 'social' | 'monitoring' | 'utility' | 'media' | 'developer';
  // Schema for widget-specific properties
  properties: Record<string, PropertyDefinition>;
}

// Common properties shared by all widgets
export const COMMON_PROPERTIES: Record<string, PropertyDefinition> = {
  title: {
    type: 'string',
    label: 'Title',
    description: 'Widget header title',
    placeholder: 'Widget Title',
  },
  'title-url': {
    type: 'url',
    label: 'Title URL',
    description: 'Link for the widget title',
    placeholder: 'https://example.com',
  },
  'hide-header': {
    type: 'boolean',
    label: 'Hide Header',
    description: 'Hide the widget header',
    default: false,
  },
  'css-class': {
    type: 'string',
    label: 'CSS Class',
    description: 'Custom CSS class for styling',
    placeholder: 'custom-class',
  },
  cache: {
    type: 'duration',
    label: 'Cache Duration',
    description: 'How long to cache the widget data',
    placeholder: '30m',
  },
};

// All widget types supported by Glance with their schemas
export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  // Content widgets
  {
    type: 'rss',
    name: 'RSS Feed',
    description: 'Display items from RSS/Atom feeds',
    icon: Rss,
    category: 'content',
    properties: {
      feeds: {
        type: 'array',
        label: 'Feeds',
        description: 'RSS/Atom feed URLs to display',
        required: true,
        minItems: 1,
        itemType: 'object',
        itemProperties: {
          url: {
            type: 'url',
            label: 'Feed URL',
            required: true,
            placeholder: 'https://example.com/feed.xml',
          },
          title: {
            type: 'string',
            label: 'Feed Title',
            placeholder: 'Feed Name',
          },
          limit: {
            type: 'number',
            label: 'Item Limit',
            min: 1,
            max: 100,
          },
          'hide-categories': {
            type: 'boolean',
            label: 'Hide Categories',
            default: false,
          },
          'hide-description': {
            type: 'boolean',
            label: 'Hide Description',
            default: false,
          },
        },
      },
      style: {
        type: 'select',
        label: 'Display Style',
        options: [
          { value: 'vertical-list', label: 'Vertical List' },
          { value: 'horizontal-cards', label: 'Horizontal Cards' },
          { value: 'horizontal-cards-2', label: 'Horizontal Cards 2' },
          { value: 'detailed-list', label: 'Detailed List' },
        ],
        default: 'vertical-list',
      },
      limit: {
        type: 'number',
        label: 'Total Limit',
        description: 'Maximum items to display',
        min: 1,
        max: 100,
        default: 25,
      },
      'collapse-after': {
        type: 'number',
        label: 'Collapse After',
        description: 'Number of items before collapsing',
        min: 1,
        max: 100,
        default: 5,
      },
      'thumbnail-height': {
        type: 'number',
        label: 'Thumbnail Height',
        description: 'Height of thumbnails in em',
        min: 1,
        max: 20,
        step: 0.5,
      },
      'card-height': {
        type: 'number',
        label: 'Card Height',
        description: 'Height of cards in em',
        min: 1,
        max: 30,
        step: 0.5,
      },
      'single-line-titles': {
        type: 'boolean',
        label: 'Single Line Titles',
        default: false,
      },
      'preserve-order': {
        type: 'boolean',
        label: 'Preserve Feed Order',
        description: 'Keep items in feed order instead of sorting by date',
        default: false,
      },
    },
  },
  {
    type: 'bookmarks',
    name: 'Bookmarks',
    description: 'Display a list of bookmarks',
    icon: Bookmark,
    category: 'content',
    properties: {
      groups: {
        type: 'array',
        label: 'Bookmark Groups',
        required: true,
        minItems: 1,
        itemType: 'object',
        itemProperties: {
          title: {
            type: 'string',
            label: 'Group Title',
            placeholder: 'Links',
          },
          color: {
            type: 'color',
            label: 'Group Color',
          },
          links: {
            type: 'array',
            label: 'Links',
            itemType: 'object',
            itemProperties: {
              title: {
                type: 'string',
                label: 'Link Title',
                required: true,
              },
              url: {
                type: 'url',
                label: 'URL',
                required: true,
              },
              icon: {
                type: 'string',
                label: 'Icon',
                description: 'Icon URL or icon name (si:, di:, mdi:)',
                placeholder: 'si:github',
              },
              'same-tab': {
                type: 'boolean',
                label: 'Open in Same Tab',
                default: false,
              },
              'hide-arrow': {
                type: 'boolean',
                label: 'Hide Arrow',
                default: false,
              },
            },
          },
        },
      },
    },
  },
  {
    type: 'iframe',
    name: 'IFrame',
    description: 'Embed external content in an iframe',
    icon: Frame,
    category: 'content',
    properties: {
      url: {
        type: 'url',
        label: 'URL',
        required: true,
        placeholder: 'https://example.com',
      },
      height: {
        type: 'number',
        label: 'Height',
        description: 'Height in pixels',
        min: 100,
        default: 400,
      },
    },
  },
  {
    type: 'html',
    name: 'HTML',
    description: 'Display custom HTML content',
    icon: FileCode,
    category: 'content',
    properties: {
      source: {
        type: 'text',
        label: 'HTML Source',
        description: 'Raw HTML content to display',
        required: true,
      },
    },
  },

  // Social widgets
  {
    type: 'hacker-news',
    name: 'Hacker News',
    description: 'Display posts from Hacker News',
    icon: Flame,
    category: 'social',
    properties: {
      limit: {
        type: 'number',
        label: 'Limit',
        description: 'Number of posts to display',
        min: 1,
        max: 50,
        default: 15,
      },
      'collapse-after': {
        type: 'number',
        label: 'Collapse After',
        min: 1,
        max: 50,
        default: 5,
      },
      'comments-url-template': {
        type: 'string',
        label: 'Comments URL Template',
        placeholder: 'https://news.ycombinator.com/item?id={id}',
      },
      'sort-by': {
        type: 'select',
        label: 'Sort By',
        options: [
          { value: 'top', label: 'Top' },
          { value: 'new', label: 'New' },
          { value: 'best', label: 'Best' },
        ],
        default: 'top',
      },
      'extra-sort-by': {
        type: 'select',
        label: 'Extra Sort By',
        options: [
          { value: '', label: 'None' },
          { value: 'engagement', label: 'Engagement' },
        ],
      },
    },
  },
  {
    type: 'lobsters',
    name: 'Lobsters',
    description: 'Display posts from Lobsters',
    icon: Bug,
    category: 'social',
    properties: {
      limit: {
        type: 'number',
        label: 'Limit',
        min: 1,
        max: 50,
        default: 15,
      },
      'collapse-after': {
        type: 'number',
        label: 'Collapse After',
        min: 1,
        max: 50,
        default: 5,
      },
      'sort-by': {
        type: 'select',
        label: 'Sort By',
        options: [
          { value: 'hot', label: 'Hot' },
          { value: 'new', label: 'New' },
        ],
        default: 'hot',
      },
      tags: {
        type: 'array',
        label: 'Tags',
        description: 'Filter by tags',
        itemType: 'string',
      },
    },
  },
  {
    type: 'reddit',
    name: 'Reddit',
    description: 'Display posts from Reddit subreddits',
    icon: MessageSquare,
    category: 'social',
    properties: {
      subreddit: {
        type: 'string',
        label: 'Subreddit',
        required: true,
        placeholder: 'programming',
      },
      limit: {
        type: 'number',
        label: 'Limit',
        min: 1,
        max: 50,
        default: 15,
      },
      'collapse-after': {
        type: 'number',
        label: 'Collapse After',
        min: 1,
        max: 50,
        default: 5,
      },
      style: {
        type: 'select',
        label: 'Style',
        options: [
          { value: 'vertical-list', label: 'Vertical List' },
          { value: 'horizontal-cards', label: 'Horizontal Cards' },
          { value: 'vertical-cards', label: 'Vertical Cards' },
        ],
        default: 'vertical-list',
      },
      'sort-by': {
        type: 'select',
        label: 'Sort By',
        options: [
          { value: 'hot', label: 'Hot' },
          { value: 'new', label: 'New' },
          { value: 'top', label: 'Top' },
          { value: 'rising', label: 'Rising' },
        ],
        default: 'hot',
      },
      'top-period': {
        type: 'select',
        label: 'Top Period',
        description: 'Only used when Sort By is "Top"',
        options: [
          { value: 'hour', label: 'Hour' },
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
          { value: 'year', label: 'Year' },
          { value: 'all', label: 'All Time' },
        ],
        default: 'day',
      },
      'show-thumbnails': {
        type: 'boolean',
        label: 'Show Thumbnails',
        default: false,
      },
      'extra-sort-by': {
        type: 'select',
        label: 'Extra Sort By',
        options: [
          { value: '', label: 'None' },
          { value: 'engagement', label: 'Engagement' },
        ],
      },
    },
  },
  {
    type: 'twitch-top-games',
    name: 'Twitch Top Games',
    description: 'Display top games on Twitch',
    icon: Gamepad2,
    category: 'social',
    properties: {
      limit: {
        type: 'number',
        label: 'Limit',
        min: 1,
        max: 50,
        default: 10,
      },
      'collapse-after': {
        type: 'number',
        label: 'Collapse After',
        min: 1,
        max: 50,
        default: 5,
      },
      exclude: {
        type: 'array',
        label: 'Exclude Games',
        description: 'Game names to exclude',
        itemType: 'string',
      },
    },
  },
  {
    type: 'twitch-channels',
    name: 'Twitch Channels',
    description: 'Display specific Twitch channels',
    icon: Tv,
    category: 'social',
    properties: {
      channels: {
        type: 'array',
        label: 'Channels',
        required: true,
        minItems: 1,
        itemType: 'string',
      },
      'collapse-after': {
        type: 'number',
        label: 'Collapse After',
        min: 1,
        max: 50,
        default: 5,
      },
      'sort-by': {
        type: 'select',
        label: 'Sort By',
        options: [
          { value: 'viewers', label: 'Viewers' },
          { value: 'live', label: 'Live Status' },
        ],
        default: 'viewers',
      },
    },
  },

  // Monitoring widgets
  {
    type: 'monitor',
    name: 'Monitor',
    description: 'Monitor service availability',
    icon: Activity,
    category: 'monitoring',
    properties: {
      sites: {
        type: 'array',
        label: 'Sites',
        required: true,
        minItems: 1,
        itemType: 'object',
        itemProperties: {
          title: {
            type: 'string',
            label: 'Title',
            required: true,
          },
          url: {
            type: 'url',
            label: 'URL',
            required: true,
          },
          icon: {
            type: 'string',
            label: 'Icon',
            placeholder: 'si:github',
          },
          'same-tab': {
            type: 'boolean',
            label: 'Open in Same Tab',
            default: false,
          },
          'allow-insecure': {
            type: 'boolean',
            label: 'Allow Insecure',
            description: 'Allow self-signed certificates',
            default: false,
          },
        },
      },
      style: {
        type: 'select',
        label: 'Style',
        options: [
          { value: 'dynamic', label: 'Dynamic' },
          { value: 'basic', label: 'Basic' },
        ],
        default: 'dynamic',
      },
    },
  },
  {
    type: 'server-stats',
    name: 'Server Stats',
    description: 'Display server statistics',
    icon: Server,
    category: 'monitoring',
    properties: {
      url: {
        type: 'url',
        label: 'API URL',
        description: 'URL to the Glance server stats endpoint',
        required: true,
      },
    },
  },
  {
    type: 'docker-containers',
    name: 'Docker Containers',
    description: 'Display Docker container status',
    icon: Container,
    category: 'monitoring',
    properties: {
      'socket-path': {
        type: 'string',
        label: 'Socket Path',
        description: 'Path to Docker socket',
        default: '/var/run/docker.sock',
      },
      'hide-by-default': {
        type: 'boolean',
        label: 'Hide by Default',
        description: 'Hide containers unless labeled',
        default: false,
      },
    },
  },
  {
    type: 'dns-stats',
    name: 'DNS Stats',
    description: 'Display DNS server statistics (Pi-hole/AdGuard)',
    icon: Globe,
    category: 'monitoring',
    properties: {
      service: {
        type: 'select',
        label: 'Service',
        required: true,
        options: [
          { value: 'pihole', label: 'Pi-hole' },
          { value: 'adguard', label: 'AdGuard Home' },
        ],
      },
      url: {
        type: 'url',
        label: 'URL',
        required: true,
        placeholder: 'http://pihole.local/admin',
      },
      token: {
        type: 'string',
        label: 'API Token',
        description: 'API token for authentication',
      },
      username: {
        type: 'string',
        label: 'Username',
        description: 'For AdGuard Home',
      },
      password: {
        type: 'string',
        label: 'Password',
        description: 'For AdGuard Home',
      },
      'allow-insecure': {
        type: 'boolean',
        label: 'Allow Insecure',
        default: false,
      },
      'hide-graph': {
        type: 'boolean',
        label: 'Hide Graph',
        default: false,
      },
      'hide-top-domains': {
        type: 'boolean',
        label: 'Hide Top Domains',
        default: false,
      },
    },
  },
  {
    type: 'change-detection',
    name: 'Change Detection',
    description: 'Monitor websites for changes (changedetection.io)',
    icon: Eye,
    category: 'monitoring',
    properties: {
      'instance-url': {
        type: 'url',
        label: 'Instance URL',
        required: true,
        placeholder: 'https://changedetection.example.com',
      },
      token: {
        type: 'string',
        label: 'API Token',
      },
      limit: {
        type: 'number',
        label: 'Limit',
        min: 1,
        max: 50,
        default: 10,
      },
      'collapse-after': {
        type: 'number',
        label: 'Collapse After',
        min: 1,
        max: 50,
        default: 5,
      },
      watches: {
        type: 'array',
        label: 'Watch IDs',
        description: 'Specific watch UUIDs to display',
        itemType: 'string',
      },
    },
  },

  // Utility widgets
  {
    type: 'clock',
    name: 'Clock',
    description: 'Display current time with timezones',
    icon: Clock,
    category: 'utility',
    properties: {
      'hour-format': {
        type: 'select',
        label: 'Hour Format',
        options: [
          { value: '12h', label: '12 Hour' },
          { value: '24h', label: '24 Hour' },
        ],
        default: '24h',
      },
      timezones: {
        type: 'array',
        label: 'Timezones',
        itemType: 'object',
        itemProperties: {
          timezone: {
            type: 'string',
            label: 'Timezone',
            required: true,
            placeholder: 'America/New_York',
          },
          label: {
            type: 'string',
            label: 'Label',
            placeholder: 'New York',
          },
        },
      },
    },
  },
  {
    type: 'calendar',
    name: 'Calendar',
    description: 'Display calendar with events',
    icon: Calendar,
    category: 'utility',
    properties: {
      calendars: {
        type: 'array',
        label: 'Calendars',
        required: true,
        minItems: 1,
        itemType: 'object',
        itemProperties: {
          url: {
            type: 'url',
            label: 'ICS URL',
            required: true,
          },
          name: {
            type: 'string',
            label: 'Name',
          },
          color: {
            type: 'color',
            label: 'Color',
          },
        },
      },
      'first-day-monday': {
        type: 'boolean',
        label: 'Week Starts Monday',
        default: false,
      },
    },
  },
  {
    type: 'calendar-legacy',
    name: 'Calendar (Legacy)',
    description: 'Legacy calendar widget',
    icon: CalendarDays,
    category: 'utility',
    properties: {
      calendars: {
        type: 'array',
        label: 'Calendars',
        required: true,
        minItems: 1,
        itemType: 'object',
        itemProperties: {
          url: {
            type: 'url',
            label: 'ICS URL',
            required: true,
          },
          name: {
            type: 'string',
            label: 'Name',
          },
        },
      },
    },
  },
  {
    type: 'weather',
    name: 'Weather',
    description: 'Display weather information',
    icon: CloudSun,
    category: 'utility',
    properties: {
      location: {
        type: 'string',
        label: 'Location',
        required: true,
        placeholder: 'New York, NY',
      },
      units: {
        type: 'select',
        label: 'Units',
        options: [
          { value: 'metric', label: 'Metric (Celsius)' },
          { value: 'imperial', label: 'Imperial (Fahrenheit)' },
        ],
        default: 'metric',
      },
      'hide-location': {
        type: 'boolean',
        label: 'Hide Location',
        default: false,
      },
      'show-area-name': {
        type: 'boolean',
        label: 'Show Area Name',
        default: true,
      },
    },
  },
  {
    type: 'search',
    name: 'Search',
    description: 'Search bar with multiple engines',
    icon: Search,
    category: 'utility',
    properties: {
      'search-engine': {
        type: 'select',
        label: 'Search Engine',
        options: [
          { value: 'google', label: 'Google' },
          { value: 'duckduckgo', label: 'DuckDuckGo' },
          { value: 'bing', label: 'Bing' },
          { value: 'custom', label: 'Custom' },
        ],
        default: 'google',
      },
      'custom-search-url': {
        type: 'url',
        label: 'Custom Search URL',
        description: 'Use {QUERY} as placeholder',
        placeholder: 'https://search.example.com/search?q={QUERY}',
      },
      autofocus: {
        type: 'boolean',
        label: 'Autofocus',
        default: false,
      },
      'new-tab': {
        type: 'boolean',
        label: 'Open in New Tab',
        default: false,
      },
      bangs: {
        type: 'array',
        label: 'Search Bangs',
        itemType: 'object',
        itemProperties: {
          title: {
            type: 'string',
            label: 'Title',
            required: true,
          },
          shortcut: {
            type: 'string',
            label: 'Shortcut',
            required: true,
            placeholder: '!g',
          },
          url: {
            type: 'url',
            label: 'URL',
            required: true,
            placeholder: 'https://google.com/search?q={QUERY}',
          },
        },
      },
    },
  },
  {
    type: 'markets',
    name: 'Markets',
    description: 'Display market/stock information',
    icon: TrendingUp,
    category: 'utility',
    properties: {
      markets: {
        type: 'array',
        label: 'Markets',
        required: true,
        minItems: 1,
        itemType: 'object',
        itemProperties: {
          symbol: {
            type: 'string',
            label: 'Symbol',
            required: true,
            placeholder: 'AAPL',
          },
          name: {
            type: 'string',
            label: 'Display Name',
            placeholder: 'Apple Inc.',
          },
        },
      },
      style: {
        type: 'select',
        label: 'Style',
        options: [
          { value: 'dynamic', label: 'Dynamic' },
          { value: 'basic', label: 'Basic' },
        ],
        default: 'dynamic',
      },
      'sort-by': {
        type: 'select',
        label: 'Sort By',
        options: [
          { value: '', label: 'None' },
          { value: 'change', label: 'Change' },
          { value: 'absolute-change', label: 'Absolute Change' },
        ],
      },
    },
  },
  {
    type: 'to-do',
    name: 'To-Do',
    description: 'Display a to-do list',
    icon: ListChecks,
    category: 'utility',
    properties: {
      // To-do widget stores state in config, properties defined dynamically
    },
  },

  // Media widgets
  {
    type: 'videos',
    name: 'Videos',
    description: 'Display YouTube videos',
    icon: Play,
    category: 'media',
    properties: {
      channels: {
        type: 'array',
        label: 'Channels',
        required: true,
        minItems: 1,
        itemType: 'string',
      },
      playlists: {
        type: 'array',
        label: 'Playlists',
        itemType: 'string',
      },
      limit: {
        type: 'number',
        label: 'Limit',
        min: 1,
        max: 50,
        default: 25,
      },
      'collapse-after': {
        type: 'number',
        label: 'Collapse After',
        min: 1,
        max: 50,
        default: 5,
      },
      style: {
        type: 'select',
        label: 'Style',
        options: [
          { value: 'horizontal-cards', label: 'Horizontal Cards' },
          { value: 'grid-cards', label: 'Grid Cards' },
        ],
        default: 'horizontal-cards',
      },
      'video-url-template': {
        type: 'string',
        label: 'Video URL Template',
        placeholder: 'https://www.youtube.com/watch?v={VIDEO-ID}',
      },
      'include-shorts': {
        type: 'boolean',
        label: 'Include Shorts',
        default: false,
      },
    },
  },
  {
    type: 'releases',
    name: 'Releases',
    description: 'Display media releases (movies, music, games)',
    icon: Disc3,
    category: 'media',
    properties: {
      releases: {
        type: 'array',
        label: 'Release Types',
        required: true,
        minItems: 1,
        itemType: 'object',
        itemProperties: {
          type: {
            type: 'select',
            label: 'Type',
            required: true,
            options: [
              { value: 'movie', label: 'Movies' },
              { value: 'music', label: 'Music' },
              { value: 'game', label: 'Games' },
            ],
          },
          limit: {
            type: 'number',
            label: 'Limit',
            min: 1,
            max: 50,
          },
        },
      },
      'collapse-after': {
        type: 'number',
        label: 'Collapse After',
        min: 1,
        max: 50,
        default: 5,
      },
    },
  },

  // Developer widgets
  {
    type: 'repository',
    name: 'Repository',
    description: 'Display GitHub repository information',
    icon: GitBranch,
    category: 'developer',
    properties: {
      repository: {
        type: 'string',
        label: 'Repository',
        required: true,
        placeholder: 'owner/repo',
      },
      token: {
        type: 'string',
        label: 'GitHub Token',
        description: 'For private repos or higher rate limits',
      },
      'pull-requests-limit': {
        type: 'number',
        label: 'Pull Requests Limit',
        min: 0,
        max: 50,
        default: 3,
      },
      'issues-limit': {
        type: 'number',
        label: 'Issues Limit',
        min: 0,
        max: 50,
        default: 3,
      },
      'commits-limit': {
        type: 'number',
        label: 'Commits Limit',
        min: 0,
        max: 50,
      },
    },
  },
  {
    type: 'custom-api',
    name: 'Custom API',
    description: 'Fetch data from custom API endpoints',
    icon: Plug,
    category: 'developer',
    properties: {
      url: {
        type: 'url',
        label: 'API URL',
        required: true,
      },
      method: {
        type: 'select',
        label: 'HTTP Method',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
        ],
        default: 'GET',
      },
      headers: {
        type: 'object',
        label: 'Headers',
        description: 'HTTP headers as key-value pairs',
        properties: {},
      },
      body: {
        type: 'text',
        label: 'Request Body',
        description: 'JSON body for POST requests',
      },
      template: {
        type: 'text',
        label: 'Template',
        description: 'Go template for rendering response',
        required: true,
      },
      frameless: {
        type: 'boolean',
        label: 'Frameless',
        description: 'Render without widget frame',
        default: false,
      },
      'allow-insecure': {
        type: 'boolean',
        label: 'Allow Insecure',
        default: false,
      },
    },
  },
  {
    type: 'extension',
    name: 'Extension',
    description: 'Load external widget extension',
    icon: Puzzle,
    category: 'developer',
    properties: {
      url: {
        type: 'url',
        label: 'Extension URL',
        required: true,
      },
      'allow-potentially-dangerous-html': {
        type: 'boolean',
        label: 'Allow Dangerous HTML',
        description: 'Allow potentially dangerous HTML in response',
        default: false,
      },
      headers: {
        type: 'object',
        label: 'Headers',
        properties: {},
      },
      parameters: {
        type: 'object',
        label: 'Parameters',
        properties: {},
      },
      'allow-insecure': {
        type: 'boolean',
        label: 'Allow Insecure',
        default: false,
      },
    },
  },

  // Container widgets
  {
    type: 'group',
    name: 'Group',
    description: 'Group multiple widgets together',
    icon: FolderOpen,
    category: 'utility',
    properties: {
      widgets: {
        type: 'array',
        label: 'Widgets',
        description: 'Child widgets in this group',
        itemType: 'object',
        itemProperties: {},
      },
    },
  },
  {
    type: 'split-column',
    name: 'Split Column',
    description: 'Split a column into sub-columns',
    icon: Columns,
    category: 'utility',
    properties: {
      widgets: {
        type: 'array',
        label: 'Widgets',
        description: 'Widgets in sub-columns',
        itemType: 'object',
        itemProperties: {},
      },
    },
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
export const WIDGET_CATEGORIES: { id: WidgetDefinition['category']; name: string; icon: LucideIcon }[] = [
  { id: 'content', name: 'Content', icon: Rss },
  { id: 'social', name: 'Social', icon: MessageSquare },
  { id: 'monitoring', name: 'Monitoring', icon: Activity },
  { id: 'utility', name: 'Utility', icon: Clock },
  { id: 'media', name: 'Media', icon: Play },
  { id: 'developer', name: 'Developer', icon: Plug },
];

// Create a default widget config for a given type
export function createDefaultWidget(type: string): WidgetConfig {
  const def = getWidgetDefinition(type);
  const widget: WidgetConfig = { type };

  if (def) {
    widget.title = def.name;

    // Apply default values from property definitions
    for (const [key, prop] of Object.entries(def.properties)) {
      if (prop.default !== undefined) {
        widget[key] = prop.default;
      }
    }
  }

  // Add type-specific defaults
  switch (type) {
    case 'rss':
      if (!widget.feeds) {
        widget.feeds = [{ url: '', title: '' }];
      }
      break;
    case 'bookmarks':
      if (!widget.groups) {
        widget.groups = [{ title: 'Links', links: [] }];
      }
      break;
    case 'monitor':
      if (!widget.sites) {
        widget.sites = [];
      }
      break;
    case 'videos':
      if (!widget.channels) {
        widget.channels = [];
      }
      break;
    case 'markets':
      if (!widget.markets) {
        widget.markets = [];
      }
      break;
  }

  return widget;
}

// Helper to get icon component for a widget type
export function getWidgetIcon(type: string): LucideIcon {
  const def = getWidgetDefinition(type);
  return def?.icon || Package;
}
