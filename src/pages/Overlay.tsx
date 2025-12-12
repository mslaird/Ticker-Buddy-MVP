import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { OverlayPreview } from '@/components/dashboard/OverlayPreview';
import { useTickers } from '@/hooks/useTickers';
import { useMarketData } from '@/hooks/useMarketData';
import { Layers, Monitor, Smartphone, Tablet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Overlay() {
  const { tickers, loading } = useTickers();
  const { quotes, loading: quotesLoading } = useMarketData(tickers, true);

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

          <main className="p-6 max-w-4xl mx-auto">
            <div className="glass-card p-6 mb-6 animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-2">Your Overlay Widget</h2>
              <p className="text-muted-foreground text-sm">
                This is how your ticker overlay will appear on your screen.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <Button variant="outline" className="gap-2 h-auto py-4 flex-col">
                <Monitor className="h-6 w-6" />
                <span>Desktop</span>
              </Button>
              <Button variant="outline" className="gap-2 h-auto py-4 flex-col opacity-50 cursor-not-allowed" disabled>
                <Tablet className="h-6 w-6" />
                <span>Tablet (Soon)</span>
              </Button>
              <Button variant="outline" className="gap-2 h-auto py-4 flex-col opacity-50 cursor-not-allowed" disabled>
                <Smartphone className="h-6 w-6" />
                <span>Mobile (Soon)</span>
              </Button>
            </div>

            <div className="glass-card p-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="text-center mb-6">
                <h3 className="text-foreground font-medium mb-2">Live Preview</h3>
                <p className="text-sm text-muted-foreground">
                  This preview shows your tickers as they'll appear in the overlay
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="max-w-sm mx-auto">
                  <div className="bg-background border border-border rounded-xl p-4 shadow-glow">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-muted-foreground font-medium">TICKER BUDDY</span>
                    </div>
                    <OverlayPreview tickers={tickers} quotes={quotes} isLoading={quotesLoading} />
                  </div>
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground mt-6">
                Desktop app coming soon — download to enable the floating overlay
              </p>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
