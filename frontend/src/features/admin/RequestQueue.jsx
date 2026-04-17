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
import { Loader2, MessageSquare, UserPlus, Link2, Pencil, Check, X, FileText, Inbox, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_CONFIG = {
  field_edit: { label: 'Field Correction', icon: Pencil, color: 'bg-blue-100 text-blue-700', category: 'member' },
  person_add: { label: 'Person Addition', icon: UserPlus, color: 'bg-green-100 text-green-700', category: 'member' },
  relationship_add: { label: 'Relationship', icon: Link2, color: 'bg-purple-100 text-purple-700', category: 'relation' },
  message: { label: 'Message / Flag', icon: MessageSquare, color: 'bg-amber-100 text-amber-700', category: 'general' },
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

function RequestItem({ contribution, onReviewed }) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState('');
  const [editedData, setEditedData] = useState(() => ({ ...(contribution.data || {}) }));
  const [loading, setLoading] = useState(null);

  const typeConf = TYPE_CONFIG[contribution.type] || TYPE_CONFIG.message;
  const Icon = typeConf.icon;
  const categoryLabel = typeConf.category === 'member' ? 'Member Contribution' : typeConf.category === 'relation' ? 'Relation Contribution' : 'General';

  const handleReview = async (action) => {
    if (!comment.trim()) { toast.error('Comment is required'); return; }
    setLoading(action);
    try {
      const payload = { action, comment: comment.trim() };
      // Send edited data for person_add contributions
      if (contribution.type === 'person_add' && action !== 'reject') {
        payload.edited_data = editedData;
      }
      await contributionApi.review(contribution.id, payload);
      const msg = { approve: 'Approved', reject: 'Rejected', draft: 'Saved as draft' }[action];
      toast.success(msg);
      onReviewed();
    } catch (err) { toast.error(err.detail || `Failed to ${action}`); }
    finally { setLoading(null); }
  };

  const updateField = (key, value) => setEditedData(prev => ({ ...prev, [key]: value }));

  return (
    <Card className="p-0 overflow-hidden">
      <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeConf.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium">{typeConf.label}</span>
            <Badge variant="outline" className="text-[9px]">{categoryLabel}</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{getSummary(contribution)}</p>
          {contribution.submitted_by_name && <p className="text-[10px] text-muted-foreground">by {contribution.submitted_by_name}</p>}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(contribution.created_at)}</span>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* Contributor message */}
          {contribution.contributor_message && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Contributor Message</p>
              <p className="text-sm">{contribution.contributor_message}</p>
            </div>
          )}

          {/* Editable fields for person_add */}
          {contribution.type === 'person_add' && (
            <div className="space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Member Details (editable)</p>
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

          {/* Field edit details */}
          {contribution.type === 'field_edit' && contribution.data && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Correction Details</p>
              <div className="text-xs"><span className="text-muted-foreground w-28 inline-block">Field:</span> <span className="font-medium">{contribution.data.field}</span></div>
              <div className="text-xs"><span className="text-muted-foreground w-28 inline-block">Suggested Value:</span> <span className="font-medium">{contribution.data.value || '(not provided)'}</span></div>
            </div>
          )}

          {/* Relationship details */}
          {contribution.type === 'relationship_add' && contribution.data && (() => {
            const d = contribution.data;
            const r = contribution.resolved || {};
            const isMarriage = d.type === 'marriage';
            return (
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Relationship Details</p>
                <div className="text-xs"><span className="text-muted-foreground w-28 inline-block">Type:</span> <span className="font-medium">{isMarriage ? 'Marriage (Spouse)' : 'Parent → Child'}</span></div>
                <div className="text-xs">
                  <span className="text-muted-foreground w-28 inline-block">{isMarriage ? 'Spouse 1:' : 'Parent:'}</span>
                  <span className="font-medium">{r.person_a_id_name || `#${d.person_a_id}`}</span>
                  <span className="text-muted-foreground ml-1">(#{d.person_a_id})</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground w-28 inline-block">{isMarriage ? 'Spouse 2:' : 'Child:'}</span>
                  <span className="font-medium">{r.person_b_id_name || `#${d.person_b_id}`}</span>
                  <span className="text-muted-foreground ml-1">(#{d.person_b_id})</span>
                </div>
              </div>
            );
          })()}

          {/* Message details */}
          {contribution.type === 'message' && contribution.data && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Flagged Message</p>
              <p className="text-xs">{contribution.data.message}</p>
            </div>
          )}

          <Separator />

          {/* Admin review form */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Admin Comment *</Label>
              <Textarea className="min-h-16 text-sm" placeholder="Provide a reason for your decision..." value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1.5" onClick={() => handleReview('draft')} disabled={loading !== null}>
                {loading === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Save as Draft
              </Button>
              <Button className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => handleReview('approve')} disabled={loading !== null}>
                {loading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Approve
              </Button>
              <Button variant="destructive" className="flex-1 gap-1.5" onClick={() => handleReview('reject')} disabled={loading !== null}>
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

export default function RequestQueue() {
  const { t } = useTranslation();
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchPending = async () => {
    setLoading(true);
    try {
      setContributions((await contributionApi.getPending()).data || []);
    } catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPending(); }, []);

  const filtered = categoryFilter === 'all'
    ? contributions
    : contributions.filter(c => {
        const cat = TYPE_CONFIG[c.type]?.category;
        return cat === categoryFilter;
      });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('admin.tab_requests')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{contributions.length} pending request{contributions.length !== 1 ? 's' : ''}</p>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="member">Member Contributions</SelectItem>
            <SelectItem value="relation">Relation Contributions</SelectItem>
            <SelectItem value="general">Messages / Flags</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No pending requests</p>
          <p className="text-sm text-muted-foreground mt-1">All contributions have been reviewed.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => <RequestItem key={c.id} contribution={c} onReviewed={fetchPending} />)}
        </div>
      )}
    </div>
  );
}
