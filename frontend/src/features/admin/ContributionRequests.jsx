import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { contributionRequestApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, HandHeart, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const AREA_CONFIG = {
  members: { label: 'Family Members', icon: '👥' },
  events: { label: 'Events', icon: '📅' },
  news: { label: 'News & Updates', icon: '📰' },
  articles: { label: 'Historical Articles', icon: '📖' },
  literature: { label: 'Literature & Writings', icon: '✍️' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function RequestCard({ request, onReviewed }) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(null);

  const handleReview = async (action) => {
    if (!comment.trim()) { toast.error('Comment is required'); return; }
    setLoading(action);
    try {
      await contributionRequestApi.review(request.id, { action, comment: comment.trim() });
      toast.success(action === 'approve' ? 'Approved — user promoted to Contributor' : 'Request rejected');
      onReviewed();
    } catch (err) { toast.error(err.detail || 'Failed'); }
    finally { setLoading(null); }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
          <HandHeart className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{request.user_name || request.user_email}</p>
          <p className="text-xs text-muted-foreground">{request.user_email}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(request.created_at)}</p>
        </div>
        <Badge variant="secondary" className="text-[9px]">Pending</Badge>
      </div>

      {/* Areas */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Wants to contribute to:</p>
        <div className="flex flex-wrap gap-1.5">
          {request.areas.map(a => {
            const conf = AREA_CONFIG[a] || { label: a, icon: '📌' };
            return (
              <span key={a} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full">
                {conf.icon} {conf.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Message */}
      {request.message && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1">Message</p>
          <p className="text-xs">{request.message}</p>
        </div>
      )}

      {/* Admin review */}
      <div className="space-y-2 pt-1">
        <div className="space-y-1">
          <Label className="text-xs">Admin Comment *</Label>
          <Textarea className="min-h-14 text-sm" placeholder="Comment for the user..." value={comment} onChange={e => setComment(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700" disabled={loading !== null} onClick={() => handleReview('approve')}>
            {loading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Approve (Promote to Contributor)
          </Button>
          <Button variant="destructive" className="flex-1 gap-1.5" disabled={loading !== null} onClick={() => handleReview('reject')}>
            {loading === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Reject
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function ContributionRequests() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      setRequests((await contributionRequestApi.getPending()).data || []);
    } catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t('admin.tab_eoi')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {requests.length} pending request{requests.length !== 1 ? 's' : ''} from viewers wanting to become contributors
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center">
          <HandHeart className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground">No pending contribution requests</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map(r => <RequestCard key={r.id} request={r} onReviewed={fetchRequests} />)}
        </div>
      )}
    </div>
  );
}
