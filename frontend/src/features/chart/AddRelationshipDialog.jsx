import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { personApi, relationshipApi, contributionApi } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Search, UserPlus, Heart, Baby, ChevronDown } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Dialog for adding a spouse or child relationship.
 *
 * For "Add Spouse": simple person picker.
 * For "Add Child": shows spouse selector at top (which marriage), then person picker below.
 *   - Child is linked to the specific marriage (marriage_id)
 *   - Line will drop from that marriage's midpoint in the chart
 */
export default function AddRelationshipDialog({ open, onClose, person, type, onSuccess }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [persons, setPersons] = useState([]);
  const [marriages, setMarriages] = useState([]);
  const [selectedMarriage, setSelectedMarriage] = useState(null);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [contribMessage, setContribMessage] = useState('');

  const isSpouse = type === 'marriage';
  const isChild = type === 'parent_child';

  // Load persons + marriages on open
  useEffect(() => {
    if (!open || !person) return;
    setLoading(true);
    setSearch('');
    setSelectedMarriage(null);

    const promises = [
      personApi.getAll('?per_page=500').then(res => res.data.filter(p => p.id !== person.id)),
    ];

    if (isChild) {
      promises.push(
        relationshipApi.getMarriagesFor(person.id).then(res => res.data)
      );
    }

    Promise.all(promises)
      .then(([personData, marriageData]) => {
        setPersons(personData);
        if (marriageData) {
          setMarriages(marriageData);
          // Auto-select if only one marriage
          if (marriageData.length === 1) {
            setSelectedMarriage(marriageData[0]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, person?.id, isChild]);

  // Filter persons on search
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(persons);
    } else {
      const q = search.toLowerCase();
      setFiltered(persons.filter(p =>
        [p.first_name, p.middle_name, p.last_name, p.first_name_devanagari, p.last_name_devanagari]
          .filter(Boolean).some(f => f.toLowerCase().includes(q))
      ));
    }
  }, [search, persons]);

  const handleSelect = async (targetPerson) => {
    setSubmitting(targetPerson.id);
    try {
      const relData = {
        person_a_id: person.id,
        person_b_id: targetPerson.id,
        type: isSpouse ? 'marriage' : 'parent_child',
        marriage_id: isChild ? (selectedMarriage?.marriage_id || null) : undefined,
      };

      if (isAdmin) {
        await relationshipApi.create(relData);
      } else {
        if (!contribMessage.trim()) {
          toast.error('Please add a message explaining this relationship');
          setSubmitting(null);
          return;
        }
        await contributionApi.submitRelationshipAdd({ ...relData, message: contribMessage.trim() });
        toast.success(t('messages.request_submitted'));
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to create relationship:', err);
      toast.error(err.detail || 'Failed to create relationship');
    } finally {
      setSubmitting(null);
    }
  };

  const genderColor = (gender) => {
    if (gender === 'male') return 'border-[var(--color-male)]';
    if (gender === 'female') return 'border-[var(--color-female)]';
    return 'border-[var(--color-other)]';
  };

  const initials = (p) => ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase();
  const fullName = (p) => [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSpouse ? <Heart className="h-5 w-5" /> : <Baby className="h-5 w-5" />}
            {isSpouse ? t('actions.add_spouse') : t('actions.add_child')}
          </DialogTitle>
        </DialogHeader>

        {/* Spouse selector for "Add Child" */}
        {isChild && (
          <>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Child of
              </p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                {/* Primary parent (fixed) */}
                <div className={`w-8 h-8 rounded-full border-2 ${genderColor(person?.gender)} flex items-center justify-center bg-white text-xs font-bold`}>
                  {person ? initials(person) : '?'}
                </div>
                <span className="text-sm font-medium">{person?.first_name}</span>

                <span className="text-muted-foreground mx-1">&</span>

                {/* Spouse selector */}
                {marriages.length === 0 ? (
                  <Badge variant="secondary" className="text-xs">No spouse (single parent)</Badge>
                ) : marriages.length === 1 ? (
                  <>
                    <div className={`w-8 h-8 rounded-full border-2 ${genderColor(marriages[0].spouse_gender)} flex items-center justify-center bg-white text-xs font-bold`}>
                      {marriages[0].spouse_name?.[0] || '?'}
                    </div>
                    <span className="text-sm font-medium">{marriages[0].spouse_name}</span>
                  </>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        {selectedMarriage ? (
                          <>
                            <div className={`w-5 h-5 rounded-full border ${genderColor(selectedMarriage.spouse_gender)} flex items-center justify-center text-[9px] font-bold`}>
                              {selectedMarriage.spouse_name?.[0]}
                            </div>
                            {selectedMarriage.spouse_name}
                          </>
                        ) : (
                          'Select spouse'
                        )}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {marriages.map(m => (
                        <DropdownMenuItem key={m.marriage_id} onClick={() => setSelectedMarriage(m)}>
                          <div className={`w-6 h-6 rounded-full border ${genderColor(m.spouse_gender)} flex items-center justify-center text-[10px] font-bold mr-2`}>
                            {m.spouse_name?.[0]}
                          </div>
                          {m.spouse_name}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem onClick={() => setSelectedMarriage(null)}>
                        No spouse (single parent)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <Separator />
          </>
        )}

        {isSpouse && (
          <p className="text-sm text-muted-foreground">
            Select a spouse for {person?.first_name}
          </p>
        )}

        {isChild && (
          <p className="text-xs text-muted-foreground">
            Select the child to add{selectedMarriage ? ` under ${person?.first_name} & ${selectedMarriage.spouse_name}` : ` as ${person?.first_name}'s child`}
          </p>
        )}

        {/* Contributor message (required for non-admins) */}
        {!isAdmin && (
          <div className="space-y-1.5">
            <Label className="text-xs">{t('contribute.message')} *</Label>
            <Textarea
              className="min-h-14 text-xs"
              placeholder="Why are you adding this relationship?"
              value={contribMessage}
              onChange={(e) => setContribMessage(e.target.value)}
            />
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Person list */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {search ? 'No matching persons found' : 'No other persons available'}
            </div>
          ) : (
            <div className="space-y-0.5 px-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50"
                  onClick={() => handleSelect(p)}
                  disabled={submitting !== null}
                >
                  <div className={`w-9 h-9 rounded-full border-2 ${genderColor(p.gender)} flex items-center justify-center shrink-0 bg-muted text-sm font-semibold text-muted-foreground`}>
                    {initials(p)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{fullName(p)}</div>
                    {p.first_name_devanagari && (
                      <div className="text-xs text-muted-foreground truncate">
                        {[p.first_name_devanagari, p.last_name_devanagari].filter(Boolean).join(' ')}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">Gen {p.generation}</span>
                  {submitting === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
