import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Settings as SettingsIcon, User, Crown, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <SidebarInset className="flex-1">
          <header className="h-16 border-b border-border flex items-center px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground mr-4" />
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Settings</h1>
            </div>
          </header>

          <main className="p-6 max-w-2xl mx-auto space-y-6">
            {/* Account Section */}
            <div className="glass-card p-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-6">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Account</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email</span>
                  </div>
                  <span className="text-foreground font-mono text-sm">{user?.email}</span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Crown className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Plan</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {profile?.plan === 'pro' ? (
                      <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium flex items-center gap-1.5">
                        <Crown className="h-3.5 w-3.5" />
                        Pro
                      </span>
                    ) : (
                      <>
                        <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                          Free
                        </span>
                        <Button 
                          variant="electric" 
                          size="sm"
                          onClick={() => navigate('/upgrade')}
                        >
                          Upgrade
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Details */}
            <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h3 className="font-semibold text-foreground mb-4">Plan Features</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ticker limit</span>
                  <span className="text-foreground font-mono">{profile?.plan === 'pro' ? '5' : '3'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overlay widget</span>
                  <span className="text-foreground">✓</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price alerts</span>
                  <span className={profile?.plan === 'pro' ? 'text-foreground' : 'text-muted-foreground'}>
                    {profile?.plan === 'pro' ? '✓' : 'Pro only'}
                  </span>
                </div>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
