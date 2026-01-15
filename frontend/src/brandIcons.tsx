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
import type { LucideIcon } from 'lucide-react';
import { Bug } from 'lucide-react';
import { forwardRef } from 'react';
import type { SVGProps } from 'react';

// Simple Icons component type
type SimpleIconComponent = typeof SiReddit;

// Props that match Lucide's expected interface
interface BrandIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

function createBrandIcon(SimpleIcon: SimpleIconComponent): LucideIcon {
  const BrandIcon = forwardRef<SVGSVGElement, BrandIconProps>(
    ({ size = 24, color = 'currentColor', ...props }, ref) => (
      <SimpleIcon 
        ref={ref}
        size={size} 
        color={color}
        title=""
        {...props}
      />
    )
  );
  BrandIcon.displayName = `BrandIcon(${SimpleIcon.displayName || 'Unknown'})`;
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
