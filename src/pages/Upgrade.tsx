import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Crown, Zap } from 'lucide-react';
import { toast } from 'sonner';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Up to 3 tickers',
      'Overlay widget',
      'Real-time updates',
      'Basic support',
    ],
    current: true,
    buttonText: 'Current Plan',
    buttonVariant: 'outline' as const,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    description: 'For serious traders',
    features: [
      'Up to 5 tickers',
      'Overlay widget',
      'Real-time updates',
      'Price alerts',
      'Priority support',
      'Custom themes',
    ],
    popular: true,
    buttonText: 'Upgrade to Pro',
    buttonVariant: 'electric' as const,
  },
];

export default function Upgrade() {
  const { profile } = useProfile();

  const handleUpgrade = () => {
    toast.info('Payment integration coming soon! For now, contact support to upgrade.');
  };

  return (
    <SidebarProvider>
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

          <main className="p-6 max-w-4xl mx-auto">
            <div className="text-center mb-10 animate-fade-in">
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Unlock More with{' '}
                <span className="text-gradient">Pro</span>
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Get more tickers, price alerts, and premium features to supercharge your trading workflow.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {plans.map((plan, index) => {
                const isCurrent = profile?.plan === plan.name.toLowerCase();
                
                return (
                  <div
                    key={plan.name}
                    className={`glass-card p-6 relative animate-fade-in ${
                      plan.popular ? 'border-primary/50 shadow-glow' : ''
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full text-xs font-medium text-primary-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Most Popular
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      {plan.name === 'Pro' && <Crown className="h-5 w-5 text-primary" />}
                      <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                    </div>

                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={isCurrent ? 'outline' : plan.buttonVariant}
                      className="w-full"
                      disabled={isCurrent}
                      onClick={plan.name === 'Pro' && !isCurrent ? handleUpgrade : undefined}
                    >
                      {isCurrent ? 'Current Plan' : plan.buttonText}
                    </Button>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              Need more? Contact us for enterprise plans with unlimited tickers.
            </p>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
