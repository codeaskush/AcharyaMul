import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownUp, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FamilyChart from './FamilyChart';
import FamilyChartD3 from './FamilyChartD3';

export default function FamilyChartSwitcher() {
  const [layout, setLayout] = useState('vertical');
  const { t } = useTranslation();

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
    </div>
  );
}
