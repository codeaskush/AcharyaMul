import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import NameToRelation from './NameToRelation';
import PathBuilder from './PathBuilder';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calculator as CalcIcon, Route, Users } from 'lucide-react';

export default function CalculatorPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState('name'); // 'name' or 'path'

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.calculator')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find the relationship between any two family members
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'name' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('name')}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Name to Relation
        </Button>
        <Button
          variant={mode === 'path' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('path')}
          className="gap-2"
        >
          <Route className="h-4 w-4" />
          Path Builder
        </Button>
      </div>

      {mode === 'name' ? <NameToRelation /> : <PathBuilder />}
    </div>
  );
}
