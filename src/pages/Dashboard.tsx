import { useState } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TickerCard } from '@/components/dashboard/TickerCard';
import { AddTickerModal } from '@/components/dashboard/AddTickerModal';
import { OverlayPreview } from '@/components/dashboard/OverlayPreview';
import { useTickers, Ticker } from '@/hooks/useTickers';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, TrendingUp, Layers, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicker, setEditingTicker] = useState<Ticker | null>(null);
  const { tickers, loading, addTicker, updateTicker, deleteTicker } = useTickers();
  const { profile, getTickerLimit } = useProfile();
  const navigate = useNavigate();

  const tickerLimit = getTickerLimit();
  const canAddMore = tickers.length < tickerLimit;

  const handleEdit = (ticker: Ticker) => {
    setEditingTicker(ticker);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteTicker(id);
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setEditingTicker(null);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="h-16 border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{tickers.length}/{tickerLimit}</span>
              <span>tickers</span>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-6 max-w-6xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Ticker Buddy</h2>
              </div>
              <p className="text-muted-foreground">Your always-on market overlay.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* My Tickers Card */}
              <div className="lg:col-span-2 glass-card p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">My Tickers</h3>
                  
                  {canAddMore ? (
                    <Button 
                      onClick={() => setModalOpen(true)}
                      variant="electric"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Ticker
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => navigate('/upgrade')}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <Sparkles className="h-4 w-4" />
                      Upgrade for More
                    </Button>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : tickers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-4">
                      <TrendingUp className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h4 className="text-foreground font-medium mb-2">No tickers yet</h4>
                    <p className="text-muted-foreground text-sm mb-4">
                      Add your first ticker to start tracking
                    </p>
                    <Button 
                      onClick={() => setModalOpen(true)}
                      variant="electric"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Your First Ticker
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickers.map((ticker) => (
                      <TickerCard
                        key={ticker.id}
                        ticker={ticker}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}

                {!canAddMore && tickers.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-foreground font-medium">
                          You've reached your {profile?.plan === 'free' ? 'free' : 'pro'} plan limit
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {profile?.plan === 'free' 
                            ? 'Upgrade to Pro for up to 5 tickers' 
                            : 'Contact us for enterprise plans'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Overlay Preview Card */}
              <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-4 w-4 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Overlay Preview</h3>
                </div>
                
                <div className="bg-background/50 rounded-lg p-4 border border-border/50 min-h-[200px]">
                  <OverlayPreview tickers={tickers} />
                </div>

                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Preview of your floating overlay widget
                </p>
              </div>
            </div>
          </main>
        </SidebarInset>

        <AddTickerModal
          open={modalOpen}
          onOpenChange={handleModalClose}
          onSubmit={addTicker}
          editingTicker={editingTicker}
          onUpdate={updateTicker}
        />
      </div>
    </SidebarProvider>
  );
}
