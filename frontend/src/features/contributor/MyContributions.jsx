import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { contributionApi } from '@/api/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, MessageSquare, UserPlus, Link2, Pencil, ChevronDown, ChevronRight } from 'lucide-react';

const TYPE_CONFIG = {
  field_edit: { label: 'Field Correction', icon: Pencil, color: 'bg-blue-100 text-blue-700' },
  person_add: { label: 'Person Addition', icon: UserPlus, color: 'bg-green-100 text-green-700' },
  relationship_add: { label: 'Relationship', icon: Link2, color: 'bg-purple-100 text-purple-700' },
  message: { label: 'Message', icon: MessageSquare, color: 'bg-amber-100 text-amber-700' },
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'secondary' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-300' },
  approved_with_changes: { label: 'Approved with Changes', className: 'bg-amber-100 text-amber-700 border-amber-300' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-300' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function ContributionItem({ contribution }) {
  const [expanded, setExpanded] = useState(false);
  const typeConf = TYPE_CONFIG[contribution.type] || TYPE_CONFIG.message;
  const statusConf = STATUS_CONFIG[contribution.status] || STATUS_CONFIG.pending;
  const Icon = typeConf.icon;

  const summary = getSummary(contribution);

  return (
    <div className="border rounded-lg p-4">
      <button
        className="w-full flex items-start gap-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeConf.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium">{typeConf.label}</span>
            <Badge variant={statusConf.variant} className={statusConf.className}>
              {statusConf.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{summary}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{formatDate(contribution.created_at)}</p>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-2">
          {contribution.type === 'field_edit' && contribution.data && (
            <>
              <div className="text-xs"><span className="text-muted-foreground">Field:</span> <span className="font-medium">{contribution.data.field}</span></div>
              {contribution.data.value && <div className="text-xs"><span className="text-muted-foreground">Suggested value:</span> <span className="font-medium">{contribution.data.value}</span></div>}
              <div className="text-xs"><span className="text-muted-foreground">Message:</span> {contribution.data.message}</div>
            </>
          )}
          {contribution.type === 'person_add' && contribution.data && (
            <div className="text-xs"><span className="text-muted-foreground">Person:</span> <span className="font-medium">{[contribution.data.first_name, contribution.data.last_name].filter(Boolean).join(' ')}</span></div>
          )}
          {contribution.type === 'relationship_add' && contribution.data && (
            <div className="text-xs"><span className="text-muted-foreground">Type:</span> <span className="font-medium">{contribution.data.type === 'marriage' ? 'Marriage' : 'Parent-Child'}</span></div>
          )}
          {contribution.type === 'message' && contribution.data && (
            <div className="text-xs"><span className="text-muted-foreground">Message:</span> {contribution.data.message}</div>
          )}

          {contribution.admin_comment && (
            <div className="bg-muted/50 rounded-lg p-3 mt-2">
              <p className="text-[10px] text-muted-foreground font-medium mb-1">Admin Comment</p>
              <p className="text-xs">{contribution.admin_comment}</p>
              {contribution.reviewed_at && (
                <p className="text-[10px] text-muted-foreground mt-1">Reviewed: {formatDate(contribution.reviewed_at)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getSummary(contribution) {
  const data = contribution.data || {};
  switch (contribution.type) {
    case 'field_edit':
      return `${data.field}: "${data.message?.slice(0, 60) || ''}"`;
    case 'person_add':
      return `${[data.first_name, data.last_name].filter(Boolean).join(' ')}`;
    case 'relationship_add':
      return `${data.type === 'marriage' ? 'Marriage' : 'Parent-Child'} link`;
    case 'message':
      return data.message?.slice(0, 80) || '';
    default:
      return '';
  }
}

export default function MyContributions() {
  const { t } = useTranslation();
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contributionApi.getMyContributions()
      .then(res => setContributions(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pending = contributions.filter(c => c.status === 'pending');
  const reviewed = contributions.filter(c => c.status !== 'pending');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.my_contributions')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {contributions.length} submission{contributions.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : contributions.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No contributions yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Use the "See something wrong?" button on any person to submit a correction.
          </p>
        </Card>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Pending ({pending.length})
              </h2>
              {pending.map(c => <ContributionItem key={c.id} contribution={c} />)}
            </div>
          )}

          {reviewed.length > 0 && (
            <div className="space-y-3">
              {pending.length > 0 && <Separator />}
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Reviewed ({reviewed.length})
              </h2>
              {reviewed.map(c => <ContributionItem key={c.id} contribution={c} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
