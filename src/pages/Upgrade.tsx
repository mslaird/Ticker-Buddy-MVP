import { useState } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Crown, Zap, Shield } from 'lucide-react';
import { toast } from 'sonner';

const freeFeatures = [
  'Track up to 3 tickers',
  'Overlay widget',
  'Delayed stock & ETF prices (~15 min)',
  'Live crypto prices',
  'Basic price + day % change',
];

const proFeatures = [
  'Track up to 5 tickers',
  'Everything in Free',
  'Advanced metrics for Stocks/ETFs: 52-week high/low, volume, market cap',
  'Advanced metrics for Crypto: range high/low, 24h volume, market cap',
  'Cleaner, more informative asset drawer',
  'Priority for upcoming features (alerts, premium data)',
];

export default function Upgrade() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { profile } = useProfile();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const isPro = profile?.plan === 'pro';

  const handleUpgrade = () => {
    toast.info('Payment integration coming soon! You\'ll be able to upgrade shortly.');
  };

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <SidebarInset className="flex-1">
          <header className="h-16 border-b border-border flex items-center px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground mr-4" />
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">Upgrade</h1>
            </div>
          </header>

          <main className="p-6 max-w-5xl mx-auto">
            <div className="text-center mb-10 animate-fade-in">
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Unlock More with{' '}
                <span className="text-gradient">Pro</span>
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Get more tickers, advanced metrics, and premium features to supercharge your trading workflow.
              </p>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="glass-card p-1 inline-flex gap-1">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    billingPeriod === 'monthly'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                    billingPeriod === 'annual'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Annual
                  <span className="text-xs bg-ticker-positive/20 text-ticker-positive px-1.5 py-0.5 rounded">
                    Save 50%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Free Plan */}
              <div
                className="glass-card p-6 relative animate-fade-in"
                style={{ animationDelay: '0.15s' }}
              >
                <h3 className="text-xl font-semibold text-foreground mb-2">Free</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-foreground">$0</span>
                  <span className="text-muted-foreground text-sm">forever</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Perfect for getting started</p>

                <ul className="space-y-3 mb-6">
                  {freeFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant="outline"
                  className="w-full"
                  disabled
                >
                  {isPro ? 'Downgrade' : 'Current Plan'}
                </Button>
              </div>

              {/* Pro Plan */}
              <div
                className="glass-card p-6 relative animate-fade-in border-primary/50 shadow-glow"
                style={{ animationDelay: '0.2s' }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full text-xs font-medium text-primary-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Best Value
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold text-foreground">Pro</h3>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-foreground">
                    {billingPeriod === 'monthly' ? '$4.99' : '$29.99'}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    / {billingPeriod === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingPeriod === 'annual' && (
                  <p className="text-xs text-ticker-positive mb-4">2 months free with annual</p>
                )}
                {billingPeriod === 'monthly' && (
                  <p className="text-sm text-muted-foreground mb-4">For serious traders</p>
                )}

                <ul className="space-y-3 mb-6">
                  {proFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isPro ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant="electric"
                    className="w-full"
                    onClick={handleUpgrade}
                  >
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </div>

            {/* Reassurance Note */}
            <div className="flex items-center justify-center gap-2 mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Shield className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No credit card required today. Payments coming soon.
              </p>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-4 animate-fade-in" style={{ animationDelay: '0.35s' }}>
              Need more? Contact us for enterprise plans with unlimited tickers.
            </p>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}