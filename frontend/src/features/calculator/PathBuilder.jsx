import { useState, useEffect } from 'react';
import { personApi, calculatorApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, ArrowDown, Plus, X, Loader2 } from 'lucide-react';

const RELATION_OPTIONS = [
  { value: 'father', label: 'Father', labelNe: 'बुवा' },
  { value: 'mother', label: 'Mother', labelNe: 'आमा' },
  { value: 'son', label: 'Son', labelNe: 'छोरा' },
  { value: 'daughter', label: 'Daughter', labelNe: 'छोरी' },
  { value: 'spouse', label: 'Spouse', labelNe: 'श्रीमान/श्रीमती' },
  { value: 'brother', label: 'Brother', labelNe: 'दाइ/भाइ' },
  { value: 'sister', label: 'Sister', labelNe: 'दिदी/बहिनी' },
];

export default function PathBuilder() {
  const [persons, setPersons] = useState([]);
  const [startPerson, setStartPerson] = useState(null);
  const [startSearch, setStartSearch] = useState('');
  const [pickingStart, setPickingStart] = useState(false);
  const [steps, setSteps] = useState([]); // [{relation, person, options}]
  const [result, setResult] = useState(null);
  const [loadingStep, setLoadingStep] = useState(false);

  useEffect(() => {
    personApi.getAll('?per_page=500').then(res => setPersons(res.data)).catch(console.error);
  }, []);

  const filteredPersons = (search) => {
    if (!search.trim()) return persons.slice(0, 10);
    const q = search.toLowerCase();
    return persons.filter(p =>
      [p.first_name, p.middle_name, p.last_name, p.first_name_devanagari, p.last_name_devanagari]
        .filter(Boolean).some(f => f.toLowerCase().includes(q))
    ).slice(0, 10);
  };

  const fullName = (p) => [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
  const genderColor = (g) => g === 'male' ? 'border-[var(--color-male)]' : g === 'female' ? 'border-[var(--color-female)]' : 'border-[var(--color-other)]';
  const initials = (p) => ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase();

  const addStep = async (relation) => {
    const fromId = steps.length > 0
      ? (steps[steps.length - 1].person?.id || steps[steps.length - 1].options?.[0]?.id)
      : startPerson?.id;

    if (!fromId) return;
    setLoadingStep(true);

    try {
      const res = await calculatorApi.getStep(fromId, relation);
      const options = res.data;

      setSteps(prev => [...prev, {
        relation,
        person: options.length === 1 ? options[0] : null,
        options,
      }]);

      // Calculate result after adding step
      if (options.length > 0) {
        const targetId = options.length === 1 ? options[0].id : options[0].id;
        const calcRes = await calculatorApi.findPath(startPerson.id, targetId);
        setResult(calcRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStep(false);
    }
  };

  const selectStepPerson = async (stepIndex, person) => {
    const newSteps = [...steps];
    newSteps[stepIndex] = { ...newSteps[stepIndex], person };
    setSteps(newSteps);

    // Recalculate result
    try {
      const calcRes = await calculatorApi.findPath(startPerson.id, person.id);
      setResult(calcRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const reset = () => {
    setSteps([]);
    setResult(null);
  };

  const removeLastStep = () => {
    if (steps.length === 0) return;
    const newSteps = steps.slice(0, -1);
    setSteps(newSteps);
    if (newSteps.length === 0) {
      setResult(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Start person */}
      <Card className="p-5 space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Start from (You)</Label>
        {startPerson && !pickingStart ? (
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPickingStart(true)}>
            <div className={`w-9 h-9 rounded-full border-2 ${genderColor(startPerson.gender)} flex items-center justify-center bg-muted text-sm font-semibold text-muted-foreground`}>
              {initials(startPerson)}
            </div>
            <span className="text-sm font-medium">{fullName(startPerson)}</span>
            <Badge variant="outline">Gen {startPerson.generation}</Badge>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search yourself..."
                value={startSearch}
                onChange={(e) => { setStartSearch(e.target.value); setPickingStart(true); }}
                onFocus={() => setPickingStart(true)}
                className="pl-9"
                autoFocus
              />
            </div>
            {pickingStart && (
              <Card className="max-h-48 overflow-y-auto">
                {filteredPersons(startSearch).map(p => (
                  <button
                    key={p.id}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent text-left text-sm"
                    onClick={() => { setStartPerson(p); setPickingStart(false); setStartSearch(''); setSteps([]); setResult(null); }}
                  >
                    <div className={`w-7 h-7 rounded-full border ${genderColor(p.gender)} flex items-center justify-center bg-muted text-xs font-semibold text-muted-foreground`}>
                      {initials(p)}
                    </div>
                    <span className="truncate">{fullName(p)}</span>
                  </button>
                ))}
              </Card>
            )}
          </div>
        )}
      </Card>

      {/* Steps */}
      {startPerson && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Relationship Path</Label>
            {steps.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={reset}>
                <X className="h-3 w-3" /> Reset
              </Button>
            )}
          </div>

          {/* Built path */}
          <div className="space-y-2">
            <Badge variant="outline" className="text-sm">{fullName(startPerson)} (You)</Badge>

            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-muted-foreground ml-4" />
                <Badge variant="secondary">{step.relation}</Badge>
                {step.person ? (
                  <Badge variant="outline">{fullName(step.person)}</Badge>
                ) : step.options.length > 1 ? (
                  <div className="flex gap-1 flex-wrap">
                    {step.options.map(opt => (
                      <Button key={opt.id} variant="outline" size="sm" className="h-7 text-xs"
                        onClick={() => selectStepPerson(i, opt)}>
                        {fullName(opt)}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No match found</span>
                )}
              </div>
            ))}
          </div>

          {/* Add next step */}
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Add next relation:</p>
            <div className="flex flex-wrap gap-1.5">
              {RELATION_OPTIONS.map(opt => (
                <Button
                  key={opt.value}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={loadingStep}
                  onClick={() => addStep(opt.value)}
                >
                  {opt.label}
                  <span className="text-muted-foreground">{opt.labelNe}</span>
                </Button>
              ))}
            </div>
          </div>

          {steps.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={removeLastStep}>
              Remove last step
            </Button>
          )}
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className="p-5 space-y-3">
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Relationship</p>
            <h2 className="text-2xl font-bold">{result.english}</h2>
            {result.nepali !== result.english && (
              <p className="text-xl text-muted-foreground">{result.nepali}</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
