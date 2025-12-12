import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { OverlayWidget } from '@/components/overlay/OverlayWidget';
import { OverlayControls } from '@/components/overlay/OverlayControls';
import { useTickers } from '@/hooks/useTickers';
import { useMarketData } from '@/hooks/useMarketData';
import { useOverlaySettings } from '@/hooks/useOverlaySettings';
import { useProfile } from '@/hooks/useProfile';
import { Layers, Loader2 } from 'lucide-react';

export default function Overlay() {
  const { tickers, loading } = useTickers();
  const { settings, updateSettings, loading: settingsLoading } = useOverlaySettings();
  const { profile } = useProfile();
  const { quotes, loading: quotesLoading } = useMarketData(tickers, true, settings.refreshInterval);

  const isPro = profile?.plan === 'pro';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <SidebarInset className="flex-1">
          <header className="h-16 border-b border-border flex items-center px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground mr-4" />
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Overlay</h1>
            </div>
          </header>

          <main className="p-6 max-w-2xl mx-auto">
            <div className="glass-card p-6 mb-6 animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-2">Your Overlay Widget</h2>
              <p className="text-muted-foreground text-sm">
                Customize your floating ticker overlay. The widget will appear in the selected corner of your screen.
              </p>
            </div>

            {loading || settingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <OverlayControls 
                  settings={settings} 
                  onSettingsChange={updateSettings}
                  isPro={isPro}
                />
              </div>
            )}
          </main>
        </SidebarInset>

        {/* Floating Overlay Widget */}
        {!loading && !settingsLoading && (
          <OverlayWidget 
            tickers={tickers} 
            quotes={quotes} 
            isLoading={quotesLoading}
            settings={settings}
            isPro={isPro}
          />
        )}
      </div>
    </SidebarProvider>
  );
}
