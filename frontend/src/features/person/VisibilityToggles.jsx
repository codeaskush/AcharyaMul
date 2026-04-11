import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { personApi } from '@/api/client';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { EyeOff, Eye } from 'lucide-react';

const FIELDS = [
  { key: 'dob', labelKey: 'labels.dob' },
  { key: 'address', labelKey: 'labels.current_address' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
];

export default function VisibilityToggles({ person, onUpdate }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(
    person.visibility_settings || { dob: true, address: true, phone: true, email: true }
  );
  const [saving, setSaving] = useState(false);

  const toggle = async (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSaving(true);
    try {
      const result = await personApi.updateVisibility(person.id, updated);
      onUpdate?.(result.data);
    } catch (err) {
      // Revert on error
      setSettings(settings);
      console.error('Failed to update visibility:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <EyeOff className="h-4 w-4" />
        <span>Field Visibility (for non-admin users)</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(({ key, labelKey, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Checkbox
              id={`vis-${key}`}
              checked={settings[key]}
              onCheckedChange={() => toggle(key)}
              disabled={saving}
            />
            <Label htmlFor={`vis-${key}`} className="cursor-pointer text-sm flex items-center gap-1.5">
              {settings[key] ? <Eye className="h-3 w-3 text-green-500" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
              {labelKey ? t(labelKey) : label}
            </Label>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Unchecked fields are hidden from contributors and viewers. Admins always see everything.
      </p>
    </div>
  );
}
