import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { TrendingUp, ArrowRight, Layers, Bell, Zap, Loader2 } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <div className="relative">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-6 py-24">
          {/* Header */}
          <header className="flex items-center justify-between mb-20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-semibold text-foreground">Ticker Buddy</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Sign in
              </Button>
              <Button variant="electric" onClick={() => navigate('/auth')} className="gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Hero Content */}
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <Zap className="h-4 w-4" />
              Always-on market tracking
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Your markets,<br />
              <span className="text-gradient">always visible</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              A sleek overlay widget that keeps your favorite stocks, crypto, and ETFs 
              in view while you work. Never miss a move.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                variant="electric" 
                size="xl" 
                onClick={() => navigate('/auth')}
                className="gap-2 min-w-[200px]"
              >
                Start Free
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="xl"
                className="min-w-[200px]"
                onClick={() => navigate('/auth')}
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-24">
            {[
              {
                icon: TrendingUp,
                title: 'Real-time Prices',
                description: 'Live updates for stocks, crypto, and ETFs from major exchanges.',
              },
              {
                icon: Layers,
                title: 'Floating Overlay',
                description: 'A minimal widget that stays visible while you work on other tasks.',
              },
              {
                icon: Bell,
                title: 'Price Alerts',
                description: 'Get notified when your tickers hit your target prices. (Pro)',
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="glass-card p-6 animate-fade-in hover:border-primary/30 transition-colors"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 w-fit mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Preview Widget */}
          <div className="max-w-sm mx-auto mt-20 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="glass-card p-4 shadow-glow">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-muted-foreground font-medium">LIVE PREVIEW</span>
              </div>
              
              <div className="space-y-2">
                {[
                  { symbol: 'AAPL', price: '189.45', change: '+2.34%', positive: true },
                  { symbol: 'BTC', price: '43,521', change: '+5.12%', positive: true },
                  { symbol: 'SPY', price: '478.92', change: '-0.45%', positive: false },
                ].map((item) => (
                  <div key={item.symbol} className="ticker-widget flex items-center justify-between">
                    <span className="font-mono font-medium text-foreground text-sm">{item.symbol}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-foreground">${item.price}</span>
                      <span className={`text-xs font-mono ${item.positive ? 'text-ticker-positive' : 'text-ticker-negative'}`}>
                        {item.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingUp className="h-4 w-4" />
            <span>Ticker Buddy</span>
          </div>
          <p className="text-muted-foreground text-sm">© 2024 All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
