import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Layers, 
  Bell, 
  Settings, 
  Sparkles,
  TrendingUp,
  LogOut,
  Crown
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard', disabled: false },
  { title: 'Overlay', icon: Layers, url: '/overlay', disabled: false },
  { title: 'Alerts', icon: Bell, url: '/alerts', disabled: true, badge: 'Soon' },
  { title: 'Settings', icon: Settings, url: '/settings', disabled: false },
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const handleNavigation = (url: string, disabled: boolean) => {
    if (!disabled) {
      navigate(url);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Ticker Buddy</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {profile?.plan === 'pro' ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Pro
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  Free
                </span>
              )}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.url, item.disabled)}
                      className={`
                        w-full justify-start gap-3 px-3 py-2.5 rounded-lg transition-all
                        ${isActive 
                          ? 'bg-primary/10 text-primary border border-primary/20' 
                          : item.disabled 
                            ? 'text-muted-foreground/50 cursor-not-allowed' 
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }
                      `}
                      disabled={item.disabled}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{item.title}</span>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {item.badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        {profile?.plan !== 'pro' && (
          <Button 
            variant="electric" 
            className="w-full justify-center gap-2"
            onClick={() => navigate('/upgrade')}
          >
            <Sparkles className="h-4 w-4" />
            Upgrade to Pro
          </Button>
        )}
        
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
