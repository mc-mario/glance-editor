/**
 * Brand icons using Simple Icons wrapped to match Lucide icon API.
 * These are used for service widgets that represent specific brands.
 */
import { 
  SiReddit, 
  SiTwitch, 
  SiYcombinator, 
  SiDocker, 
  SiGithub 
} from '@icons-pack/react-simple-icons';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { Bug } from 'lucide-react';

// Create wrapper components that match Lucide's API
// Simple Icons use 'color' and 'size', Lucide uses 'size' (color via CSS currentColor)

type IconWrapperProps = LucideProps;

function createBrandIcon(
  SimpleIcon: React.ComponentType<{ size?: number; color?: string; title?: string }>,
  defaultColor?: string
): LucideIcon {
  const BrandIcon = ({ size = 24, ...props }: IconWrapperProps) => (
    <SimpleIcon 
      size={size} 
      color={defaultColor || 'currentColor'} 
      title=""
      {...props}
    />
  );
  BrandIcon.displayName = SimpleIcon.displayName || 'BrandIcon';
  return BrandIcon as unknown as LucideIcon;
}

// Export brand icons wrapped to match Lucide API
export const RedditIcon = createBrandIcon(SiReddit);
export const TwitchIcon = createBrandIcon(SiTwitch);
export const HackerNewsIcon = createBrandIcon(SiYcombinator); // Y Combinator owns HN
export const DockerIcon = createBrandIcon(SiDocker);
export const GitHubIcon = createBrandIcon(SiGithub);

// Lobsters doesn't have a Simple Icon, keep using Lucide Bug icon
export const LobstersIcon = Bug;
