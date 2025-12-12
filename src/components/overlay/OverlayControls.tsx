import { Settings, Crown, Move, Eye, Maximize2, List, RefreshCw, Pin } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface OverlaySettings {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  size: 'small' | 'medium' | 'large';
  compactMode: boolean;
  refreshInterval: number;
  pinned: boolean;
}

interface OverlayControlsProps {
  settings: OverlaySettings;
  onSettingsChange: (settings: OverlaySettings) => void;
  isPro: boolean;
}

export function OverlayControls({ settings, onSettingsChange, isPro }: OverlayControlsProps) {
  const navigate = useNavigate();

  const updateSetting = <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Pro Upsell Card */}
      {!isPro && (
        <div className="glass-card p-4 border border-primary/30 bg-primary/5 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Upgrade to Pro</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Track up to 5 tickers and get access to premium themes (coming soon).
              </p>
              <Button 
                variant="electric" 
                size="sm"
                onClick={() => navigate('/upgrade')}
              >
                Upgrade Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="glass-card p-6 rounded-xl space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-border">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Overlay Settings</h2>
        </div>

        {/* Position */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Move className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Position</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
              <Button
                key={pos}
                variant={settings.position === pos ? 'default' : 'outline'}
                size="sm"
                className="capitalize"
                onClick={() => updateSetting('position', pos)}
              >
                {pos.replace('-', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Opacity</Label>
            </div>
            <span className="text-sm text-muted-foreground">{settings.opacity}%</span>
          </div>
          <Slider
            value={[settings.opacity]}
            onValueChange={([value]) => updateSetting('opacity', value)}
            min={60}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* Size */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Size</Label>
          </div>
          <Select
            value={settings.size}
            onValueChange={(value: 'small' | 'medium' | 'large') => updateSetting('size', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Compact Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Compact Mode</Label>
          </div>
          <Switch
            checked={settings.compactMode}
            onCheckedChange={(checked) => updateSetting('compactMode', checked)}
          />
        </div>

        {/* Refresh Interval */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Refresh Interval</Label>
          </div>
          <Select
            value={String(settings.refreshInterval)}
            onValueChange={(value) => updateSetting('refreshInterval', Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 seconds</SelectItem>
              <SelectItem value="15">15 seconds</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pin Overlay */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Pin Overlay</Label>
          </div>
          <Switch
            checked={settings.pinned}
            onCheckedChange={(checked) => updateSetting('pinned', checked)}
          />
        </div>
      </div>
    </div>
  );
}
