import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { personApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const EMPTY_FORM = {
  first_name: '', middle_name: '', last_name: '',
  first_name_devanagari: '', middle_name_devanagari: '', last_name_devanagari: '',
  dob: '', dod: '', place_of_birth: '', current_address: '', occupation: '',
  gender: 'male', is_alive: true,
};

export default function PersonForm({ person, onSave, onCancel }) {
  const { t } = useTranslation();
  const isEdit = !!person;

  const [form, setForm] = useState(() => {
    if (person) return { ...EMPTY_FORM, ...person, dob: person.dob?.ad || '', dod: person.dod?.ad || '' };
    return { ...EMPTY_FORM };
  });
  const [comment, setComment] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        dob: form.dob || null, dod: form.dod || null,
        middle_name: form.middle_name || null, last_name: form.last_name || null,
        first_name_devanagari: form.first_name_devanagari || null,
        middle_name_devanagari: form.middle_name_devanagari || null,
        last_name_devanagari: form.last_name_devanagari || null,
        place_of_birth: form.place_of_birth || null,
        current_address: form.current_address || null,
        occupation: form.occupation || null,
      };
      let result;
      if (isEdit) result = await personApi.update(person.id, { ...payload, comment });
      else result = await personApi.create(payload);

      if (photoFile && result.data?.id) {
        const fd = new FormData();
        fd.append('file', photoFile);
        await fetch(`/api/v1/persons/${result.data.id}/photo`, { method: 'POST', credentials: 'include', body: fd });
      }
      onSave?.(result.data);
    } catch (err) {
      setError(err.detail || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="p-8 space-y-6" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold">{isEdit ? t('actions.edit') : t('actions.add_person')}</h3>

      {error && <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Roman Name — stacked on mobile, row on desktop */}
      <fieldset className="border border-border rounded-lg p-4">
        <legend className="text-xs text-muted-foreground px-2">Name (English) *</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('labels.first_name')} *</Label>
            <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('labels.middle_name')}</Label>
            <Input value={form.middle_name} onChange={(e) => set('middle_name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('labels.last_name')}</Label>
            <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </div>
        </div>
      </fieldset>

      {/* Devanagari Name */}
      <fieldset className="border border-border rounded-lg p-4">
        <legend className="text-xs text-muted-foreground px-2">Name (Devanagari)</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">पहिलो नाम</Label>
            <Input value={form.first_name_devanagari} onChange={(e) => set('first_name_devanagari', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">बीचको नाम</Label>
            <Input value={form.middle_name_devanagari} onChange={(e) => set('middle_name_devanagari', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">थर</Label>
            <Input value={form.last_name_devanagari} onChange={(e) => set('last_name_devanagari', e.target.value)} />
          </div>
        </div>
      </fieldset>

      {/* Gender + DOB — two columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('labels.gender')} *</Label>
          <Select value={form.gender} onValueChange={(val) => set('gender', val)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{t('labels.male')}</SelectItem>
              <SelectItem value="female">{t('labels.female')}</SelectItem>
              <SelectItem value="other">{t('labels.other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('labels.dob')} (AD)</Label>
          <Input type="date" className="w-full" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
        </div>
      </div>

      {/* Alive + DOD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <div className="flex items-center gap-2 pt-1">
          <Checkbox id="is_alive" checked={form.is_alive} onCheckedChange={(val) => set('is_alive', val)} />
          <Label htmlFor="is_alive" className="cursor-pointer text-sm">{t('labels.alive')}</Label>
        </div>
        {!form.is_alive && (
          <div className="space-y-2">
            <Label>{t('labels.dod')} (AD)</Label>
            <Input type="date" className="w-full" value={form.dod} onChange={(e) => set('dod', e.target.value)} />
          </div>
        )}
      </div>

      {/* Other fields — full width each */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('labels.place_of_birth')}</Label>
          <Input className="w-full" value={form.place_of_birth} onChange={(e) => set('place_of_birth', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t('labels.current_address')}</Label>
          <Input className="w-full" value={form.current_address} onChange={(e) => set('current_address', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t('labels.occupation')}</Label>
          <Input className="w-full" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} />
        </div>
      </div>

      {/* Photo */}
      <div className="space-y-2">
        <Label>Photo (JPEG/PNG, max 2MB)</Label>
        <Input type="file" accept=".jpg,.jpeg,.png" className="w-full" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
      </div>

      {/* Comment (edit mode) */}
      {isEdit && (
        <div className="space-y-2">
          <Label>Comment *</Label>
          <Textarea className="min-h-20 w-full" placeholder="Describe what you changed and why..." value={comment} onChange={(e) => setComment(e.target.value)} required />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-5 border-t">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>{t('actions.cancel')}</Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('actions.save')}
        </Button>
      </div>
    </form>
  );
}
