import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { personApi } from '@/api/client';
import PersonDetail from './PersonDetail';
import PersonForm from './PersonForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Plus, Search, MoreHorizontal, Eye, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';

function Avatar({ person, size = 'md' }) {
  const initials = ((person.first_name?.[0] || '') + (person.last_name?.[0] || '')).toUpperCase();
  const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-20 h-20 text-2xl' };
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
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editPerson, setEditPerson] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 15;

  const fetchPersons = async () => {
    setLoading(true);
    try { setPersons((await personApi.getAll('?per_page=100')).data); }
    catch (err) { console.error('Failed to load persons:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPersons(); }, []);

  // Filter on search
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(persons);
    } else {
      const q = search.toLowerCase();
      setFiltered(persons.filter(p =>
        [p.first_name, p.middle_name, p.last_name, p.first_name_devanagari, p.last_name_devanagari, p.occupation, p.place_of_birth]
          .filter(Boolean).some(f => f.toLowerCase().includes(q))
      ));
    }
    setPage(1);
  }, [search, persons]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handlePersonClick = async (person) => {
    try { setSelectedPerson((await personApi.getById(person.id)).data); setShowForm(false); setEditPerson(null); }
    catch (err) { console.error(err); }
  };

  const handleEdit = (person) => { setEditPerson(person); setShowForm(true); setSelectedPerson(null); };
  const handleSave = () => { setShowForm(false); setEditPerson(null); setSelectedPerson(null); fetchPersons(); };
  const handleCancel = () => { setShowForm(false); setEditPerson(null); };

  const fullName = (p) => [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
  const devName = (p) => [p.first_name_devanagari, p.last_name_devanagari].filter(Boolean).join(' ');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('nav.members')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {persons.length} family member{persons.length !== 1 ? 's' : ''} in the tree
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditPerson(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          {t('actions.add_person')}
        </Button>
      </div>

      {/* Search & Filters Bar */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, occupation, place..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filtered.length !== persons.length
              ? `${filtered.length} of ${persons.length} results`
              : `${persons.length} total`
            }
          </div>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : persons.length === 0 ? (
        <Card className="p-16 text-center">
          <p className="text-muted-foreground text-lg mb-2">No family members yet</p>
          <p className="text-muted-foreground/60 text-sm mb-6">Add the first person to start building your family tree.</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('actions.add_person')}
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Name</TableHead>
                <TableHead>Generation</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Occupation</TableHead>
                <TableHead>Place of Birth</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((person) => (
                <TableRow
                  key={person.id}
                  className="cursor-pointer"
                  onClick={() => handlePersonClick(person)}
                >
                  {/* Name + Avatar */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar person={person} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{fullName(person)}</div>
                        {person.first_name_devanagari && (
                          <div className="text-xs text-muted-foreground truncate">{devName(person)}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Generation */}
                  <TableCell>
                    <Badge variant="outline">Gen {person.generation}</Badge>
                  </TableCell>

                  {/* Gender */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        person.gender === 'male' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        person.gender === 'female' ? 'bg-pink-50 text-pink-600 border-pink-200' :
                        'bg-purple-50 text-purple-600 border-purple-200'
                      }
                    >
                      {t(`labels.${person.gender}`)}
                    </Badge>
                  </TableCell>

                  {/* Occupation */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{person.occupation || '—'}</span>
                  </TableCell>

                  {/* Place of Birth */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{person.place_of_birth || '—'}</span>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge variant={person.is_alive ? 'default' : 'secondary'}>
                      {person.is_alive ? t('labels.alive') : t('labels.deceased')}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePersonClick(person); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(person); }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Detail Sheet */}
      {selectedPerson && <PersonDetail person={selectedPerson} onClose={() => setSelectedPerson(null)} onEdit={handleEdit} />}

      {/* Add/Edit Sheet */}
      <Sheet open={showForm} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <SheetContent className="w-[30vw] sm:max-w-[30vw] overflow-y-auto p-0">
          <SheetTitle className="sr-only">{editPerson ? t('actions.edit') : t('actions.add_person')}</SheetTitle>
          <PersonForm person={editPerson} onSave={handleSave} onCancel={handleCancel} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
