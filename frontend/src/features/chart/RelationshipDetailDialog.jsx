import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { relationshipApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Heart, Baby, MapPin, CalendarDays, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RelationshipDetailDialog({ relationshipId, open, onClose, onUpdated }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [rel, setRel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // relationship_id to delete
  const [deleteComment, setDeleteComment] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Marriage fields
  const [marriageStatus, setMarriageStatus] = useState('active');
  const [marriageDate, setMarriageDate] = useState('');
  const [marriageLocation, setMarriageLocation] = useState('');

  // Parent-child fields
  const [marriageId, setMarriageId] = useState(null);
  const [availableMarriages, setAvailableMarriages] = useState([]);
  const [allParents, setAllParents] = useState([]); // all parent-child rels for this child

  useEffect(() => {
    if (!open || !relationshipId) return;
    setLoading(true);
    relationshipApi.getById(relationshipId)
      .then(res => {
        const data = res.data;
        setRel(data);
        setMarriageStatus(data.marriage_status || 'active');
        setMarriageDate(data.marriage_date?.ad || '');
        setMarriageLocation(data.marriage_location || '');
        setMarriageId(data.marriage_id);

        if (data.type === 'parent_child') {
          // Load all parents for this child + available marriages for the parent
          Promise.all([
            relationshipApi.getParentsFor(data.person_b_id).then(r => r.data || []),
            relationshipApi.getMarriagesFor(data.person_a_id).then(r => r.data || []),
          ]).then(([parents, marriages]) => {
            setAllParents(parents);
            setAvailableMarriages(marriages);
          }).catch(() => {});
        }
      })
      .catch(() => { toast.error('Failed to load relationship'); onClose(); })
      .finally(() => setLoading(false));
  }, [open, relationshipId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { comment: 'Updated relationship details' };
      if (rel.type === 'marriage') {
        payload.marriage_status = marriageStatus;
        payload.marriage_date = marriageDate || null;
        payload.marriage_location = marriageLocation || null;
      } else {
        payload.marriage_id = marriageId;
      }
      await relationshipApi.update(relationshipId, payload);
      toast.success('Relationship updated');
      onUpdated?.();
      onClose();
    } catch (err) {
      toast.error(err.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const isMarriage = rel?.type === 'marriage';
  const isParentChild = rel?.type === 'parent_child';

  const statusColor = {
    active: 'bg-green-100 text-green-700 border-green-300',
    divorced: 'bg-red-100 text-red-700 border-red-300',
    separated: 'bg-amber-100 text-amber-700 border-amber-300',
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !rel ? null : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isMarriage ? <Heart className="h-5 w-5 text-pink-500" /> : <Baby className="h-5 w-5 text-blue-500" />}
                {isMarriage ? 'Marriage Details' : 'Parent-Child Details'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* People involved — header card */}
              {isMarriage && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <div className="flex-1 text-center">
                    <p className="text-sm font-medium">{rel.person_a_id_name || `#${rel.person_a_id}`}</p>
                    <p className="text-[10px] text-muted-foreground">Spouse</p>
                  </div>
                  <div className="text-muted-foreground text-lg">💍</div>
                  <div className="flex-1 text-center">
                    <p className="text-sm font-medium">{rel.person_b_id_name || `#${rel.person_b_id}`}</p>
                    <p className="text-[10px] text-muted-foreground">Spouse</p>
                  </div>
                </div>
              )}

              {/* Parent-child: show child prominently */}
              {isParentChild && (
                <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
                  <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide mb-1">Child</p>
                  <p className="text-base font-semibold">{rel.person_b_id_name || `#${rel.person_b_id}`}</p>
                </div>
              )}

              {/* Marriage fields */}
              {isMarriage && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      {isAdmin ? (
                        <Select value={marriageStatus} onValueChange={setMarriageStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="separated">Separated</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={statusColor[rel.marriage_status] || ''}>{rel.marriage_status || 'Active'}</Badge>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5"><CalendarDays className="h-3 w-3" /> Marriage Date</Label>
                      {isAdmin ? (
                        <Input type="date" value={marriageDate} onChange={e => setMarriageDate(e.target.value)} />
                      ) : (
                        <p className="text-sm">{rel.marriage_date?.ad || '—'}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Marriage Location</Label>
                      {isAdmin ? (
                        <Input value={marriageLocation} onChange={e => setMarriageLocation(e.target.value)} placeholder="Where was the marriage held?" />
                      ) : (
                        <p className="text-sm">{rel.marriage_location || '—'}</p>
                      )}
                    </div>

                    {/* Delete marriage */}
                    {isAdmin && !deleteTarget && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-red-500 border-red-200 hover:bg-red-50 gap-1.5 mt-2"
                        onClick={() => { setDeleteTarget(rel.id); setDeleteComment(''); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove Marriage
                      </Button>
                    )}
                    {isAdmin && deleteTarget === rel.id && (
                      <div className="border border-red-200 bg-red-50/50 rounded-lg p-3 space-y-2 mt-2">
                        <p className="text-xs text-red-700 font-medium">Remove this marriage?</p>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-red-600">Reason *</Label>
                          <Textarea className="min-h-14 text-xs border-red-200" placeholder="Why is this marriage being removed?" value={deleteComment} onChange={e => setDeleteComment(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="text-xs" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                          <Button variant="destructive" size="sm" className="text-xs" disabled={!deleteComment.trim() || deleting} onClick={async () => {
                            setDeleting(true);
                            try {
                              await relationshipApi.deleteRelationship(rel.id, { comment: deleteComment.trim() });
                              toast.success('Marriage removed');
                              onUpdated?.();
                              onClose();
                            } catch (err) { toast.error(err.detail || 'Failed'); }
                            finally { setDeleting(false); }
                          }}>
                            {deleting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Confirm Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Parent-child: show ALL parents of this child */}
              {isParentChild && (
                <>
                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-xs font-semibold">Parents of {rel.person_b_id_name || 'this child'}</Label>
                    </div>

                    {allParents.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No parent records found.</p>
                    ) : (
                      <div className="space-y-2">
                        {allParents.map(p => {
                          const isCurrent = p.relationship_id === rel.id;
                          const isDelTarget = deleteTarget === p.relationship_id;
                          const genderIcon = p.parent_gender === 'male' ? '👨' : p.parent_gender === 'female' ? '👩' : '🧑';
                          const spouseIcon = p.spouse?.gender === 'male' ? '👨' : p.spouse?.gender === 'female' ? '👩' : '🧑';
                          const mInfo = p.marriage_info;
                          const statusLabel = { active: 'Married', divorced: 'Divorced', separated: 'Separated' };

                          return (
                            <div key={p.relationship_id}>
                              <div className={`rounded-lg border p-3 space-y-2 ${isDelTarget ? 'border-red-300 bg-red-50/30' : isCurrent ? 'border-blue-300 bg-blue-50/50' : 'border-border'}`}>
                                {/* Parent + Spouse row */}
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{genderIcon}</span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">{p.parent_name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {p.parent_gender === 'male' ? 'Father' : p.parent_gender === 'female' ? 'Mother' : 'Parent'}
                                    </p>
                                  </div>

                                  {p.spouse && (
                                    <>
                                      <div className="text-muted-foreground text-xs px-1">
                                        {mInfo ? '💍' : '&'}
                                      </div>
                                      <span className="text-base">{spouseIcon}</span>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium">{p.spouse.name}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                          {p.spouse.gender === 'male' ? 'Father' : p.spouse.gender === 'female' ? 'Mother' : 'Parent'}
                                          {!p.spouse.is_also_parent && <span className="text-amber-600"> (not linked as parent)</span>}
                                        </p>
                                      </div>
                                    </>
                                  )}

                                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                    {isCurrent && !isDelTarget && <Badge variant="outline" className="text-[9px] border-blue-300 text-blue-600">This link</Badge>}
                                    {isAdmin && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => { setDeleteTarget(isDelTarget ? null : p.relationship_id); setDeleteComment(''); }}
                                        title="Remove this parent link"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Marriage info */}
                                {mInfo && (
                                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-7">
                                    <span className={mInfo.status === 'active' ? 'text-green-600' : mInfo.status === 'divorced' ? 'text-red-500' : 'text-amber-600'}>
                                      {statusLabel[mInfo.status] || mInfo.status}
                                    </span>
                                    {mInfo.date && <span>· {mInfo.date}</span>}
                                    {mInfo.location && <span>· {mInfo.location}</span>}
                                  </div>
                                )}
                                )}
                              </div>

                              {/* Inline delete confirmation */}
                              {isDelTarget && (
                                <div className="mt-1.5 border border-red-200 bg-red-50/50 rounded-lg p-3 space-y-2">
                                  <p className="text-xs text-red-700 font-medium">Remove this parent link?</p>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-red-600">Reason *</Label>
                                    <Textarea
                                      className="min-h-14 text-xs border-red-200"
                                      placeholder="Why is this link being removed?"
                                      value={deleteComment}
                                      onChange={e => setDeleteComment(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="text-xs"
                                      disabled={!deleteComment.trim() || deleting}
                                      onClick={async () => {
                                        setDeleting(true);
                                        try {
                                          await relationshipApi.deleteRelationship(p.relationship_id, { comment: deleteComment.trim() });
                                          toast.success('Parent link removed');
                                          setDeleteTarget(null);
                                          setDeleteComment('');
                                          // If we deleted the current relationship, close the dialog
                                          if (isCurrent) {
                                            onUpdated?.();
                                            onClose();
                                          } else {
                                            // Refresh parent list
                                            const res = await relationshipApi.getParentsFor(rel.person_b_id);
                                            setAllParents(res.data || []);
                                            onUpdated?.();
                                          }
                                        } catch (err) { toast.error(err.detail || 'Failed to delete'); }
                                        finally { setDeleting(false); }
                                      }}
                                    >
                                      {deleting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {allParents.length === 1 && (
                      <p className="text-[10px] text-muted-foreground">
                        This child has only one parent linked. To add another parent, use "Add Child" from the other parent's node in the chart.
                      </p>
                    )}
                  </div>

                  {/* Marriage assignment for this specific link */}
                  {isAdmin && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <Label className="text-xs">Link this relationship to a marriage</Label>
                        <Select value={String(marriageId || 'none')} onValueChange={v => setMarriageId(v === 'none' ? null : parseInt(v))}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Single parent (no marriage link)</SelectItem>
                            {availableMarriages.map(m => (
                              <SelectItem key={m.marriage_id} value={String(m.marriage_id)}>
                                {rel.person_a_id_name} & {m.spouse_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                          Linking to a marriage means this child's line drops from that couple in the chart.
                          "Single parent" means only {rel.person_a_id_name} is shown as the parent.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {isAdmin && (
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
