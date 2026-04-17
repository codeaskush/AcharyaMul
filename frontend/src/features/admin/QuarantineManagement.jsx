import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { personApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, ShieldAlert, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function QuarantineManagement() {
  const { t } = useTranslation();
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null); // person id being deleted
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      setPersons((await personApi.getQuarantined()).data || []);
    } catch { toast.error('Failed to load quarantined persons'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleRestore = async (person) => {
    try {
      await personApi.restore(person.id);
      toast.success(`${person.first_name} restored`);
      fetch();
    } catch (err) { toast.error(err.detail || 'Failed to restore'); }
  };

  const handleDelete = async () => {
    if (!deleteReason.trim()) { toast.error('Reason is required'); return; }
    setDeleteLoading(true);
    try {
      await personApi.softDelete(deleteTarget, { reason: deleteReason.trim() });
      toast.success('Person permanently removed');
      setDeleteTarget(null);
      setDeleteReason('');
      fetch();
    } catch (err) { toast.error(err.detail || 'Failed to delete'); }
    finally { setDeleteLoading(false); }
  };

  const fullName = (p) => [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t('admin.tab_quarantine')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Quarantined persons are hidden from the tree and members list. Restore or permanently delete them.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : persons.length === 0 ? (
        <Card className="p-12 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No quarantined persons</p>
          <p className="text-sm text-muted-foreground mt-1">Persons flagged for review will appear here.</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Name</TableHead>
                <TableHead>Generation</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Occupation</TableHead>
                <TableHead className="w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {persons.map(person => (
                <TableRow key={person.id} className="bg-amber-50/30">
                  <TableCell>
                    <div>
                      <span className="text-sm font-medium">{fullName(person)}</span>
                      <Badge variant="outline" className="ml-2 text-[9px] text-amber-600 border-amber-300">Quarantined</Badge>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">Gen {person.generation}</Badge></TableCell>
                  <TableCell><span className="text-sm text-muted-foreground capitalize">{person.gender}</span></TableCell>
                  <TableCell><span className="text-sm text-muted-foreground">{person.occupation || '—'}</span></TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => handleRestore(person)}
                      >
                        <RotateCcw className="h-3 w-3" /> Restore
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => { setDeleteTarget(person.id); setDeleteReason(''); }}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete confirmation inline */}
      {deleteTarget && (
        <Card className="border-red-300 bg-red-50/30 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-700">Permanently delete this person?</p>
          <p className="text-xs text-red-600">This will remove the person, all their relationships, and life events. This action cannot be undone.</p>
          <div className="space-y-1.5">
            <Label className="text-xs text-red-700">Reason *</Label>
            <Textarea
              className="min-h-16 text-xs border-red-300"
              placeholder="Why is this person being permanently removed?"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!deleteReason.trim() || deleteLoading}
              onClick={handleDelete}
            >
              {deleteLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              Confirm Permanent Delete
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
