import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Calendar, LayoutDashboard, LogOut, Sparkles, ClipboardList, Settings } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { NotificationPermissionBanner } from './NotificationPermissionBanner';
import { ThemeToggle } from './ThemeToggle';
import { VirtusBrand } from './VirtusBrand';
import { ProfileThemeBackground } from '../presentation/components/profile-theme/ProfileThemeBackground';
import { ProfileIndicator } from '../presentation/components/profile-theme/ProfileIndicator';

export default function Layout({ children, ambient = false }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/calendar', label: 'Tareas', icon: Calendar },
    { path: '/character', label: 'Carácter', icon: Sparkles },
    { path: '/profile', label: 'Perfil', icon: ClipboardList },
    { path: '/settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-primary/25 bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <NavLink to="/dashboard">
              <VirtusBrand compact={false} />
            </NavLink>

            <nav className="hidden gap-1 lg:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm ${
                      isActive ? 'bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ProfileIndicator />
            <ThemeToggle />
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-[6px] px-2">
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-24 truncate text-sm">{user?.username || 'Usuario'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-muted-foreground">Cuenta Virtus</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-screen-2xl p-6">
        {ambient && <ProfileThemeBackground />}
        <div className="animate-fade-in">{children}</div>
      </main>

      <NotificationPermissionBanner />
    </div>
  );
}
