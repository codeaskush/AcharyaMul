import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contributionApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const EDITABLE_FIELDS = [
  { value: 'first_name', label: 'First Name' },
  { value: 'middle_name', label: 'Middle Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'first_name_devanagari', label: 'First Name (Devanagari)' },
  { value: 'last_name_devanagari', label: 'Last Name (Devanagari)' },
  { value: 'dob', label: 'Date of Birth' },
  { value: 'dod', label: 'Date of Demise' },
  { value: 'place_of_birth', label: 'Place of Birth' },
  { value: 'current_address', label: 'Current Address' },
  { value: 'occupation', label: 'Occupation' },
  { value: 'gender', label: 'Gender' },
  { value: 'is_alive', label: 'Alive/Deceased Status' },
];

export default function FieldCorrectionForm({ person, open, onClose }) {
  const { t } = useTranslation();
  const [field, setField] = useState('');
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await contributionApi.submitFieldEdit({
        person_id: person.id,
        field,
        value: value || null,
        message,
      });
      toast.success(t('messages.request_submitted'));
      setField('');
      setValue('');
      setMessage('');
      onClose();
    } catch (err) {
      toast.error(err.detail || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  const currentValue = person?.[field] || '';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('contribute.correction_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('contribute.which_field')}</Label>
              <Select value={field} onValueChange={setField} required>
                <SelectTrigger><SelectValue placeholder="Select a field..." /></SelectTrigger>
                <SelectContent>
                  {EDITABLE_FIELDS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {field && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-lg">
                Current value: <span className="font-medium">{String(currentValue) || '(empty)'}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('contribute.corrected_value')}</Label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Leave empty if unsure of correct value"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('contribute.message')} *</Label>
              <Textarea
                className="min-h-20"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain what's wrong and why..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !field || !message}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('actions.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
