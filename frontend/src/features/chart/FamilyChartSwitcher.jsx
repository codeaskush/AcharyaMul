import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowDownUp, ArrowRightLeft, X, HandHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FamilyChart from './FamilyChart';
import FamilyChartD3 from './FamilyChartD3';
import ContributeInterestForm from '@/features/contributor/ContributeInterestForm';

export default function FamilyChartSwitcher() {
  const [layout, setLayout] = useState('vertical');
  const { t } = useTranslation();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const [toastDismissed, setToastDismissed] = useState(() => sessionStorage.getItem('contribute_toast_dismissed') === '1');
  const [interestOpen, setInterestOpen] = useState(false);

  const dismissToast = () => {
    setToastDismissed(true);
    sessionStorage.setItem('contribute_toast_dismissed', '1');
  };

  return (
    <div className="relative h-[calc(100vh-3.5rem)] w-full">
      {layout === 'vertical' ? <FamilyChart /> : <FamilyChartD3 />}

      <div className="absolute top-3 right-3 z-50">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 bg-white/90 backdrop-blur shadow-sm"
          onClick={() => setLayout(l => l === 'vertical' ? 'horizontal' : 'vertical')}
        >
          {layout === 'vertical' ? (
            <>
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span className="text-xs">{t('chart.horizontal')}</span>
            </>
          ) : (
            <>
              <ArrowDownUp className="h-3.5 w-3.5" />
              <span className="text-xs">{t('chart.vertical')}</span>
            </>
          )}
        </Button>
      </div>

      {/* Floating toast for viewers */}
      {isViewer && !toastDismissed && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="bg-white border border-green-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <HandHeart className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Interested in contributing?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Help grow the family tree by adding members, events, news, and more.</p>
              <Button
                size="sm"
                className="mt-2 gap-1.5 bg-green-600 hover:bg-green-700 text-xs h-7"
                onClick={() => { setInterestOpen(true); dismissToast(); }}
              >
                Show Interest
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={dismissToast}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <ContributeInterestForm open={interestOpen} onClose={() => setInterestOpen(false)} />
    </div>
  );
}
