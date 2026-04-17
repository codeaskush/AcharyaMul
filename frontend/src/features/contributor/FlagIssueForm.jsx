import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contributionApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FlagIssueForm({ entityType, entityId, open, onClose }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await contributionApi.submitMessage({
        entity_type: entityType,
        entity_id: entityId,
        message,
      });
      toast.success(t('contribute.message_sent'));
      setMessage('');
      onClose();
    } catch (err) {
      toast.error(err.detail || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('contribute.flag_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{t('contribute.flag_description')}</p>
            <div className="space-y-2">
              <Label>{t('contribute.message')} *</Label>
              <Textarea
                className="min-h-24"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. This relationship seems incorrect because..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !message}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('contribute.send_flag')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
