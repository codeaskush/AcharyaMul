import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { personApi } from '@/api/client';
import PersonDetail from './PersonDetail';
import PersonForm from './PersonForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';

function Avatar({ person, size = 'md' }) {
  const initials = ((person.first_name?.[0] || '') + (person.last_name?.[0] || '')).toUpperCase();
  const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-20 h-20 text-2xl' };
  const genderColor = { male: 'border-[var(--color-male)]', female: 'border-[var(--color-female)]', other: 'border-[var(--color-other)]' };

  return (
    <div className={`rounded-full border-2 ${genderColor[person.gender] || genderColor.other} flex items-center justify-center shrink-0 bg-muted font-semibold text-muted-foreground overflow-hidden ${sizeClasses[size]}`}>
      {person.photo_url ? <img src={person.photo_url} alt="" className="w-full h-full object-cover" /> : <span>{initials}</span>}
    </div>
  );
}

export { Avatar };

export default function PersonListPage() {
  const { t } = useTranslation();
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editPerson, setEditPerson] = useState(null);

  const fetchPersons = async () => {
    setLoading(true);
    try { setPersons((await personApi.getAll()).data); }
    catch (err) { console.error('Failed to load persons:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPersons(); }, []);

  const handlePersonClick = async (person) => {
    try { setSelectedPerson((await personApi.getById(person.id)).data); setShowForm(false); setEditPerson(null); }
    catch (err) { console.error(err); }
  };

  const handleEdit = (person) => { setEditPerson(person); setShowForm(true); setSelectedPerson(null); };
  const handleSave = () => { setShowForm(false); setEditPerson(null); setSelectedPerson(null); fetchPersons(); };
  const handleCancel = () => { setShowForm(false); setEditPerson(null); };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">{t('nav.members')}</h2>
        <Button onClick={() => { setShowForm(true); setEditPerson(null); }}>+ {t('actions.add_person')}</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : persons.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg mb-2">No family members yet</p>
          <p className="text-muted-foreground/60 text-sm mb-4">Add the first person to start your family tree.</p>
          <Button onClick={() => setShowForm(true)}>+ {t('actions.add_person')}</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {persons.map((person) => (
            <Card key={person.id} className="flex items-center gap-3.5 px-4 py-3 cursor-pointer hover:bg-accent transition-colors" onClick={() => handlePersonClick(person)}>
              <Avatar person={person} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {[person.first_name, person.middle_name, person.last_name].filter(Boolean).join(' ')}
                </div>
                {person.first_name_devanagari && (
                  <div className="text-xs text-muted-foreground truncate">
                    {[person.first_name_devanagari, person.last_name_devanagari].filter(Boolean).join(' ')}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline">Gen {person.generation}</Badge>
                <span className={`w-2 h-2 rounded-full ${person.is_alive ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedPerson && <PersonDetail person={selectedPerson} onClose={() => setSelectedPerson(null)} onEdit={handleEdit} />}

      <Sheet open={showForm} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <SheetContent className="w-[30vw] sm:max-w-[30vw] overflow-y-auto p-0">
          <SheetTitle className="sr-only">{editPerson ? t('actions.edit') : t('actions.add_person')}</SheetTitle>
          <PersonForm person={editPerson} onSave={handleSave} onCancel={handleCancel} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
