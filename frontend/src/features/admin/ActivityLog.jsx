import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminLogApi } from '@/api/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, FileText, Shield, UserPlus, UserMinus, AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_CONFIG = {
  contribution_approve: { label: 'Approved Contribution', icon: Check, color: 'text-green-600 bg-green-100' },
  contribution_reject: { label: 'Rejected Contribution', icon: X, color: 'text-red-600 bg-red-100' },
  contribution_draft: { label: 'Saved as Draft', icon: FileText, color: 'text-amber-600 bg-amber-100' },
  person_quarantined: { label: 'Person Quarantined', icon: AlertTriangle, color: 'text-amber-600 bg-amber-100' },
  person_restored: { label: 'Person Restored', icon: RotateCcw, color: 'text-green-600 bg-green-100' },
  person_deleted: { label: 'Person Deleted', icon: Trash2, color: 'text-red-600 bg-red-100' },
  role_changed: { label: 'Role Changed', icon: Shield, color: 'text-blue-600 bg-blue-100' },
  user_invited: { label: 'User Invited', icon: UserPlus, color: 'text-purple-600 bg-purple-100' },
  user_revoked: { label: 'User Revoked', icon: UserMinus, color: 'text-red-600 bg-red-100' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function LogEntry({ entry }) {
  const conf = ACTION_CONFIG[entry.action] || { label: entry.action, icon: FileText, color: 'text-gray-600 bg-gray-100' };
  const Icon = conf.icon;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${conf.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-medium">{conf.label}</span>
          {entry.target_name && (
            <Badge variant="outline" className="text-[9px]">
              {entry.target_name}
            </Badge>
          )}
          {!entry.target_name && entry.target_type && (
            <Badge variant="outline" className="text-[9px]">
              {entry.target_type} #{entry.target_id}
            </Badge>
          )}
        </div>
        {entry.comment && <p className="text-xs text-muted-foreground">{entry.comment}</p>}
        {entry.details && (
          <div className="mt-1 space-y-0.5">
            {entry.details.email && <p className="text-[10px] text-muted-foreground">Email: {entry.details.email}</p>}
            {entry.details.old_role && <p className="text-[10px] text-muted-foreground">{entry.details.old_role} → {entry.details.new_role}</p>}
            {entry.details.contribution_type && !entry.target_name && <p className="text-[10px] text-muted-foreground">Type: {entry.details.contribution_type}</p>}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">{entry.admin_name || `Admin #${entry.admin_id}`}</span>
          <span className="text-[10px] text-muted-foreground">{formatDate(entry.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

export default function ActivityLog() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminLogApi.getAll(200)
      .then(res => setLogs(res.data || []))
      .catch(() => toast.error('Failed to load activity log'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t('admin.tab_activity')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          All admin actions for audit and reference
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No admin actions logged yet.</p>
        </Card>
      ) : (
        <Card className="p-4">
          {logs.map(entry => <LogEntry key={entry.id} entry={entry} />)}
        </Card>
      )}
    </div>
  );
}
