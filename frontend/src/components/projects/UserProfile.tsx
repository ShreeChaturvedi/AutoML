/**
 * UserProfile - User profile component at the bottom of sidebar
 *
 * Features:
 * - Placeholder avatar (will be integrated with auth later)
 * - User name and email
 * - Simple static display (no dropdown or interactions)
 *
 * TODO: Integrate with authentication system when backend is ready
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut } from 'lucide-react';

// Placeholder user data
// TODO: Replace with actual user data from auth context/store
const placeholderUser = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: undefined // No image for now, will show initials
};

export function UserProfile() {
  // Get user initials for avatar fallback
  const initials = placeholderUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={placeholderUser.avatar} alt={placeholderUser.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium truncate">{placeholderUser.name}</p>
            <p className="text-xs text-muted-foreground truncate">{placeholderUser.email}</p>
          </div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem>
          <User className="h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:bg-destructive/15 focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}