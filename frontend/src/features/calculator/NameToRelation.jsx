import { useState, useEffect } from 'react';
import { personApi, calculatorApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, ArrowRight, Loader2 } from 'lucide-react';

export default function NameToRelation() {
  const [persons, setPersons] = useState([]);
  const [personA, setPersonA] = useState(null);
  const [personB, setPersonB] = useState(null);
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [picking, setPicking] = useState(null); // 'a' | 'b' | null
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const selectPerson = (person, side) => {
    if (side === 'a') { setPersonA(person); setSearchA(''); }
    else { setPersonB(person); setSearchB(''); }
    setPicking(null);
  };

  const calculate = async () => {
    if (!personA || !personB) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await calculatorApi.findPath(personA.id, personB.id);
      setResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fullName = (p) => [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
  const devName = (p) => [p.first_name_devanagari, p.last_name_devanagari].filter(Boolean).join(' ');

  const genderColor = (g) => g === 'male' ? 'border-[var(--color-male)]' : g === 'female' ? 'border-[var(--color-female)]' : 'border-[var(--color-other)]';
  const initials = (p) => ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase();

  const PersonPicker = ({ side, selected, search, setSearch }) => (
    <div className="flex-1 space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {side === 'a' ? 'Person A (From)' : 'Person B (To)'}
      </Label>
      {selected && picking !== side ? (
        <Card className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent" onClick={() => setPicking(side)}>
          <div className={`w-9 h-9 rounded-full border-2 ${genderColor(selected.gender)} flex items-center justify-center bg-muted text-sm font-semibold text-muted-foreground`}>
            {initials(selected)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{fullName(selected)}</div>
            {selected.first_name_devanagari && <div className="text-xs text-muted-foreground">{devName(selected)}</div>}
          </div>
          <Badge variant="outline">Gen {selected.generation}</Badge>
        </Card>
      ) : (
        <div className="space-y-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPicking(side); }}
              onFocus={() => setPicking(side)}
              className="pl-9"
              autoFocus={picking === side}
            />
          </div>
          {picking === side && (
            <Card className="max-h-48 overflow-y-auto">
              {filteredPersons(search).map(p => (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent text-left text-sm"
                  onClick={() => selectPerson(p, side)}
                >
                  <div className={`w-7 h-7 rounded-full border ${genderColor(p.gender)} flex items-center justify-center bg-muted text-xs font-semibold text-muted-foreground`}>
                    {initials(p)}
                  </div>
                  <span className="truncate">{fullName(p)}</span>
                  <span className="text-xs text-muted-foreground ml-auto">Gen {p.generation}</span>
                </button>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <PersonPicker side="a" selected={personA} search={searchA} setSearch={setSearchA} />
          <div className="pt-8">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
          <PersonPicker side="b" selected={personB} search={searchB} setSearch={setSearchB} />
        </div>

        <div className="mt-4">
          <Button onClick={calculate} disabled={!personA || !personB || loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Find Relationship
          </Button>
        </div>
      </Card>

      {/* Result */}
      {result && (
        <Card className="p-5 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Relationship</p>
            <h2 className="text-2xl font-bold">{result.english}</h2>
            {result.nepali !== result.english && (
              <p className="text-xl text-muted-foreground">{result.nepali}</p>
            )}
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Relationship Chain</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {result.path && result.path.length > 0 ? (
                <>
                  <Badge variant="outline">{fullName(personA)}</Badge>
                  {result.path.map((step, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="secondary" className="text-xs">{step.step}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline">{step.person_name}</Badge>
                    </span>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{result.chain || 'No path found'}</p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
