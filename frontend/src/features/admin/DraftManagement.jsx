import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { contributionApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, UserPlus, Link2, Pencil, Check, X, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_CONFIG = {
  field_edit: { label: 'Field Correction', icon: Pencil, color: 'bg-blue-100 text-blue-700' },
  person_add: { label: 'Person Addition', icon: UserPlus, color: 'bg-green-100 text-green-700' },
  relationship_add: { label: 'Relationship', icon: Link2, color: 'bg-purple-100 text-purple-700' },
  message: { label: 'Message / Flag', icon: MessageSquare, color: 'bg-amber-100 text-amber-700' },
};

const PERSON_FIELDS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'middle_name', label: 'Middle Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'first_name_devanagari', label: 'First Name (Devanagari)' },
  { key: 'middle_name_devanagari', label: 'Middle Name (Devanagari)' },
  { key: 'last_name_devanagari', label: 'Last Name (Devanagari)' },
  { key: 'gender', label: 'Gender' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'dod', label: 'Date of Demise' },
  { key: 'place_of_birth', label: 'Place of Birth' },
  { key: 'current_address', label: 'Current Address' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'is_alive', label: 'Alive' },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function DraftItem({ contribution, onFinalized }) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState(contribution.admin_comment || '');
  const [editedData, setEditedData] = useState(() => ({ ...(contribution.data || {}) }));
  const [loading, setLoading] = useState(null);

  const typeConf = TYPE_CONFIG[contribution.type] || TYPE_CONFIG.message;
  const Icon = typeConf.icon;

  const handleFinalize = async (action) => {
    if (!comment.trim()) { toast.error('Comment is required'); return; }
    setLoading(action);
    try {
      const payload = { action, comment: comment.trim() };
      if (contribution.type === 'person_add' && action === 'approve') {
        payload.edited_data = editedData;
      }
      await contributionApi.review(contribution.id, payload);
      toast.success(action === 'approve' ? 'Finalized and approved' : 'Rejected');
      onFinalized();
    } catch (err) { toast.error(err.detail || `Failed to ${action}`); }
    finally { setLoading(null); }
  };

  const updateField = (key, value) => setEditedData(prev => ({ ...prev, [key]: value }));

  return (
    <Card className="p-0 overflow-hidden border-amber-200 bg-amber-50/30">
      <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-amber-50/50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeConf.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium">{typeConf.label}</span>
            <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[9px]">Draft</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{getSummary(contribution)}</p>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(contribution.created_at)}</span>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-amber-200 px-4 pb-4 pt-3 space-y-4">
          {/* Contributor message */}
          {contribution.contributor_message && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Contributor Message</p>
              <p className="text-sm">{contribution.contributor_message}</p>
            </div>
          )}

          {/* Previous admin comment */}
          {contribution.admin_comment && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Previous Admin Note</p>
              <p className="text-xs">{contribution.admin_comment}</p>
            </div>
          )}

          {/* Editable fields for person_add */}
          {contribution.type === 'person_add' && (
            <div className="space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Member Details (editable before finalizing)</p>
              <div className="grid grid-cols-2 gap-3">
                {PERSON_FIELDS.map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                    {f.key === 'is_alive' ? (
                      <Select value={String(editedData[f.key] ?? true)} onValueChange={v => updateField(f.key, v === 'true')}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Alive</SelectItem>
                          <SelectItem value="false">Deceased</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : f.key === 'gender' ? (
                      <Select value={editedData[f.key] || 'male'} onValueChange={v => updateField(f.key, v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : f.key === 'dob' || f.key === 'dod' ? (
                      <Input type="date" className="h-8 text-xs" value={editedData[f.key] || ''} onChange={e => updateField(f.key, e.target.value || null)} />
                    ) : (
                      <Input className="h-8 text-xs" value={editedData[f.key] || ''} onChange={e => updateField(f.key, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other type details */}
          {contribution.type === 'field_edit' && contribution.data && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <div className="text-xs"><span className="text-muted-foreground">Field:</span> <span className="font-medium">{contribution.data.field}</span></div>
              <div className="text-xs"><span className="text-muted-foreground">Suggested:</span> <span className="font-medium">{contribution.data.value || '(not provided)'}</span></div>
            </div>
          )}

          {contribution.type === 'relationship_add' && contribution.data && (() => {
            const d = contribution.data;
            const r = contribution.resolved || {};
            const isMarriage = d.type === 'marriage';
            return (
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <div className="text-xs"><span className="text-muted-foreground w-20 inline-block">Type:</span> <span className="font-medium">{isMarriage ? 'Marriage (Spouse)' : 'Parent → Child'}</span></div>
                <div className="text-xs"><span className="text-muted-foreground w-20 inline-block">{isMarriage ? 'Spouse 1:' : 'Parent:'}</span> <span className="font-medium">{r.person_a_id_name || `#${d.person_a_id}`}</span></div>
                <div className="text-xs"><span className="text-muted-foreground w-20 inline-block">{isMarriage ? 'Spouse 2:' : 'Child:'}</span> <span className="font-medium">{r.person_b_id_name || `#${d.person_b_id}`}</span></div>
              </div>
            );
          })()}

          {contribution.type === 'message' && contribution.data && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs">{contribution.data.message}</p>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Admin Comment (update before finalizing) *</Label>
              <Textarea className="min-h-16 text-sm" value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => handleFinalize('approve')} disabled={loading !== null}>
                {loading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Finalize & Approve
              </Button>
              <Button variant="destructive" className="flex-1 gap-1.5" onClick={() => handleFinalize('reject')} disabled={loading !== null}>
                {loading === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function getSummary(c) {
  const d = c.data || {};
  switch (c.type) {
    case 'field_edit': return `${d.field}: "${(c.contributor_message || '').slice(0, 60)}"`;
    case 'person_add': return [d.first_name, d.last_name].filter(Boolean).join(' ');
    case 'relationship_add': return `${d.type === 'marriage' ? 'Marriage' : 'Parent-Child'} link`;
    case 'message': return (d.message || '').slice(0, 80);
    default: return '';
  }
}

export default function DraftManagement() {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      setDrafts((await contributionApi.getDrafts()).data || []);
    } catch { toast.error('Failed to load drafts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDrafts(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t('admin.tab_drafts')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {drafts.length} draft{drafts.length !== 1 ? 's' : ''} awaiting finalization
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : drafts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No drafts</p>
          <p className="text-sm text-muted-foreground mt-1">Drafts saved from the Incoming Requests tab will appear here for peer review and finalization.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {drafts.map(d => <DraftItem key={d.id} contribution={d} onFinalized={fetchDrafts} />)}
        </div>
      )}
    </div>
  );
}
