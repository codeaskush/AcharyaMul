import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { personApi } from '@/api/client';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X, User, Briefcase, CalendarDays } from 'lucide-react';

const EMPTY_FORM = {
  first_name: '', middle_name: '', last_name: '',
  first_name_devanagari: '', middle_name_devanagari: '', last_name_devanagari: '',
  dob: '', dod: '', place_of_birth: '', current_address: '', occupation: '',
  gender: 'male', is_alive: true,
};

const LIFE_EVENT_TYPES = [
  { value: 'birth', label: 'Birth', icon: '👶' },
  { value: 'education', label: 'Education', icon: '🎓' },
  { value: 'marriage', label: 'Marriage', icon: '💍' },
  { value: 'child_born', label: 'Child Born', icon: '🍼' },
  { value: 'employment', label: 'Employment', icon: '💼' },
  { value: 'migration', label: 'Migration', icon: '✈️' },
  { value: 'achievement', label: 'Achievement', icon: '🏆' },
  { value: 'retirement', label: 'Retirement', icon: '🌅' },
  { value: 'death', label: 'Death', icon: '🕯️' },
  { value: 'other', label: 'Other', icon: '📌' },
];

export default function PersonFormWide({ person, onSave, onCancel }) {
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

  // Employment entries — each has an `excludeFromTimeline` flag
  // `_saved` flag tracks whether a card has been "pushed down" (i.e. existed before the latest add)
  const [employments, setEmployments] = useState([]);
  // Life events — each has an `excluded` flag
  const [lifeEvents, setLifeEvents] = useState([]);

  // Load existing life events when editing
  useEffect(() => {
    if (!person?.id) return;
    personApi.getLifeEvents(person.id).then(res => {
      const empEvents = [];
      const lifeEvts = [];
      (res.data || []).forEach(evt => {
        if (evt.event_type === 'employment') {
          empEvents.push({
            organization: evt.organization || '',
            role: evt.role || '',
            from: evt.event_date?.ad || '',
            to: evt.end_date?.ad || '',
            current: evt.is_current || false,
            notes: evt.description || '',
            excludeFromTimeline: evt.excluded || false,
            _saved: true,
          });
        } else {
          lifeEvts.push({
            type: evt.event_type,
            date: evt.event_date?.ad || '',
            title: evt.title,
            description: evt.description || '',
            excluded: evt.excluded || false,
            _saved: true,
          });
        }
      });
      if (empEvents.length) setEmployments(empEvents);
      if (lifeEvts.length) setLifeEvents(lifeEvts);
    }).catch(() => {}); // silently fail if no events exist
  }, [person?.id]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // Employment helpers — mark existing cards as _saved when pushing down
  const addEmployment = () => setEmployments(prev => [
    { organization: '', role: '', from: '', to: '', current: false, notes: '', excludeFromTimeline: false, _saved: false },
    ...prev.map(e => ({ ...e, _saved: true })),
  ]);
  const updateEmployment = (i, field, value) => setEmployments(prev =>
    prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e)
  );
  const removeEmployment = (i) => setEmployments(prev => prev.filter((_, idx) => idx !== i));

  // Life event helpers — mark existing cards as _saved when pushing down
  const addLifeEvent = () => setLifeEvents(prev => [
    { type: 'other', date: '', title: '', description: '', excluded: false, _saved: false },
    ...prev.map(e => ({ ...e, _saved: true })),
  ]);
  const updateLifeEvent = (i, field, value) => setLifeEvents(prev =>
    prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e)
  );
  const removeLifeEvent = (i) => setLifeEvents(prev => prev.filter((_, idx) => idx !== i));

  // Auto-generated life events from employment (shown in life events column)
  const autoLifeEvents = useMemo(() => {
    return employments
      .filter(emp => emp.from && (emp.role || emp.organization))
      .map((emp, i) => ({
        _autoIndex: i,
        type: 'employment',
        date: emp.from,
        title: [emp.role, emp.organization].filter(Boolean).join(' at '),
        description: emp.notes || '',
        excluded: emp.excludeFromTimeline,
      }));
  }, [employments]);

  // Build timeline
  const timelineItems = useMemo(
    () => buildTimeline(form, employments, lifeEvents, autoLifeEvents),
    [form, employments, lifeEvents, autoLifeEvents]
  );

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

      const personId = result.data?.id;

      if (photoFile && personId) {
        const fd = new FormData();
        fd.append('file', photoFile);
        await fetch(`/api/v1/persons/${personId}/photo`, { method: 'POST', credentials: 'include', body: fd });
      }

      // Save life events (employment + manual) via bulk API
      if (personId) {
        const allEvents = [];

        // Employment entries → life events with type 'employment'
        employments.forEach((emp, i) => {
          if (emp.role || emp.organization) {
            allEvents.push({
              event_type: 'employment',
              title: [emp.role, emp.organization].filter(Boolean).join(' at '),
              description: emp.notes || null,
              event_date: emp.from || null,
              end_date: emp.to || null,
              organization: emp.organization || null,
              role: emp.role || null,
              is_current: emp.current || false,
              excluded: emp.excludeFromTimeline || false,
              sort_order: i,
            });
          }
        });

        // Manual life events
        lifeEvents.forEach((evt, i) => {
          if (evt.title || evt.date) {
            allEvents.push({
              event_type: evt.type,
              title: evt.title || evt.type,
              description: evt.description || null,
              event_date: evt.date || null,
              end_date: null,
              organization: null,
              role: null,
              is_current: false,
              excluded: evt.excluded || false,
              sort_order: employments.length + i,
            });
          }
        });

        if (allEvents.length > 0) {
          await personApi.bulkSaveLifeEvents(personId, allEvents).catch(() => {});
        }
      }

      onSave?.(result.data);
    } catch (err) {
      setError(err.detail || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30 shrink-0">
        <h2 className="text-lg font-semibold">{isEdit ? t('actions.edit') : t('actions.add_person')}</h2>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>

      {error && <div className="mx-6 mt-3 bg-destructive/10 text-destructive px-4 py-2.5 rounded-lg text-sm shrink-0">{error}</div>}

      {/* 4 columns */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-4 gap-0 min-h-full">

          {/* ===== Column 1: Personal Details ===== */}
          <div className="p-5 border-r space-y-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Personal Details</h3>
            </div>

            <fieldset className="border border-border rounded-lg p-3">
              <legend className="text-[10px] text-muted-foreground px-1.5">Name (English) *</legend>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t('labels.first_name')} *</Label>
                  <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('labels.middle_name')}</Label>
                  <Input value={form.middle_name} onChange={(e) => set('middle_name', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('labels.last_name')}</Label>
                  <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
                </div>
              </div>
            </fieldset>

            <fieldset className="border border-border rounded-lg p-3">
              <legend className="text-[10px] text-muted-foreground px-1.5">नाम (देवनागरी)</legend>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">पहिलो नाम</Label>
                  <Input value={form.first_name_devanagari} onChange={(e) => set('first_name_devanagari', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">बीचको नाम</Label>
                  <Input value={form.middle_name_devanagari} onChange={(e) => set('middle_name_devanagari', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">थर</Label>
                  <Input value={form.last_name_devanagari} onChange={(e) => set('last_name_devanagari', e.target.value)} />
                </div>
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('labels.gender')} *</Label>
              <Select value={form.gender} onValueChange={(val) => set('gender', val)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('labels.male')}</SelectItem>
                  <SelectItem value="female">{t('labels.female')}</SelectItem>
                  <SelectItem value="other">{t('labels.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('labels.dob')} (AD)</Label>
              <Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="is_alive" checked={form.is_alive} onCheckedChange={(val) => set('is_alive', val)} />
                <Label htmlFor="is_alive" className="cursor-pointer text-xs">{t('labels.alive')}</Label>
              </div>
              {!form.is_alive && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('labels.dod')} (AD)</Label>
                  <Input type="date" value={form.dod} onChange={(e) => set('dod', e.target.value)} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('labels.place_of_birth')}</Label>
              <Input value={form.place_of_birth} onChange={(e) => set('place_of_birth', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('labels.current_address')}</Label>
              <Input value={form.current_address} onChange={(e) => set('current_address', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Photo</Label>
              <Input type="file" accept=".jpg,.jpeg,.png" className="text-xs" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          {/* ===== Column 2: Employment & Contributions ===== */}
          <div className="p-5 border-r space-y-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Employment & Contributions</h3>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('labels.occupation')}</Label>
              <Input value={form.occupation} onChange={(e) => set('occupation', e.target.value)} placeholder="Current or primary occupation" />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Employment History</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addEmployment}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>

            {employments.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">No employment records added yet.</p>
            )}

            <div className="space-y-3">
              {employments.map((emp, i) => (
                <div key={i} className={`rounded-lg p-3 space-y-2.5 relative border ${emp._saved ? 'border-green-300 bg-green-50/40' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    {emp._saved && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-medium">
                        <Check className="h-3 w-3" /> Saved
                      </span>
                    )}
                    <span className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeEmployment(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Organization</Label>
                    <Input value={emp.organization} onChange={(e) => updateEmployment(i, 'organization', e.target.value)} placeholder="Company / Institution" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Role / Position</Label>
                    <Input value={emp.role} onChange={(e) => updateEmployment(i, 'role', e.target.value)} placeholder="Job title" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={emp.from} onChange={(e) => updateEmployment(i, 'from', e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={emp.to} onChange={(e) => updateEmployment(i, 'to', e.target.value)} disabled={emp.current} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox id={`emp-current-${i}`} checked={emp.current} onCheckedChange={(val) => updateEmployment(i, 'current', val)} />
                    <Label htmlFor={`emp-current-${i}`} className="text-xs cursor-pointer">Currently working here</Label>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Notes / Contributions</Label>
                    <Textarea className="min-h-16 text-xs" value={emp.notes} onChange={(e) => updateEmployment(i, 'notes', e.target.value)} placeholder="Achievements, contributions..." />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== Column 3: Life Events ===== */}
          <div className="p-5 border-r space-y-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Life Events</h3>
            </div>

            {/* Auto-generated from employment */}
            {autoLifeEvents.length > 0 && (
              <>
                <div>
                  <Label className="text-xs font-semibold">From Employment</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Auto-added from employment records. Uncheck to exclude from timeline.</p>
                </div>
                <div className="space-y-2">
                  {autoLifeEvents.map((auto) => (
                    <div
                      key={`auto-${auto._autoIndex}`}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs ${auto.excluded ? 'opacity-50 bg-muted/30 border-dashed' : 'bg-blue-50/50 border-blue-200'}`}
                    >
                      <Checkbox
                        checked={!auto.excluded}
                        onCheckedChange={(val) => updateEmployment(auto._autoIndex, 'excludeFromTimeline', !val)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span>💼</span>
                          <span className={`font-medium ${auto.excluded ? 'line-through text-muted-foreground' : ''}`}>{auto.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{formatTimelineDate(auto.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
              </>
            )}

            {/* Manual life events */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Custom Events</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addLifeEvent}>
                <Plus className="h-3 w-3" /> Add Event
              </Button>
            </div>

            {lifeEvents.length === 0 && autoLifeEvents.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">No life events added yet. Add birth, education, marriage, and other milestones.</p>
            )}

            <div className="space-y-3">
              {lifeEvents.map((evt, i) => (
                <div key={i} className={`rounded-lg p-3 space-y-2.5 relative border ${evt.excluded ? 'opacity-50 border-dashed bg-muted/30' : evt._saved ? 'border-green-300 bg-green-50/40' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={!evt.excluded}
                        onCheckedChange={(val) => updateLifeEvent(i, 'excluded', !val)}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {evt.excluded ? 'Excluded from timeline' : 'Included in timeline'}
                      </span>
                      {evt._saved && !evt.excluded && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-medium">
                          <Check className="h-3 w-3" /> Saved
                        </span>
                      )}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLifeEvent(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Event Type</Label>
                    <Select value={evt.type} onValueChange={(val) => updateLifeEvent(i, 'type', val)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LIFE_EVENT_TYPES.map(evtType => (
                          <SelectItem key={evtType.value} value={evtType.value}>{evtType.icon} {evtType.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={evt.date} onChange={(e) => updateLifeEvent(i, 'date', e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={evt.title} onChange={(e) => updateLifeEvent(i, 'title', e.target.value)} placeholder="e.g. Graduated from TU" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea className="min-h-14 text-xs" value={evt.description} onChange={(e) => updateLifeEvent(i, 'description', e.target.value)} placeholder="Details..." />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== Column 4: Live Timeline Preview ===== */}
          <div className="p-5 bg-muted/20 overflow-y-auto">
            <h3 className="text-sm font-semibold mb-4">Timeline Preview</h3>

            {timelineItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-xs text-muted-foreground">Timeline will appear here as you add dates, employment, and life events.</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

                <div className="space-y-5">
                  {timelineItems.map((item, i) => (
                    <div key={i} className="relative pl-9">
                      <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 ${item.color}`} />

                      <div className="text-[10px] text-muted-foreground mb-0.5">{item.dateLabel}</div>
                      <div className="flex items-center gap-1.5">
                        {item.icon && <span className="text-sm">{item.icon}</span>}
                        <span className="text-xs font-medium">{item.title}</span>
                      </div>
                      {item.subtitle && <div className="text-[10px] text-muted-foreground mt-0.5">{item.subtitle}</div>}
                      {item.badge && <Badge variant="outline" className="text-[9px] mt-1 h-4">{item.badge}</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comment (edit mode) */}
      {isEdit && (
        <div className="px-6 py-3 border-t shrink-0">
          <Label className="text-xs">Comment *</Label>
          <Textarea className="min-h-16 mt-1.5 text-xs" placeholder="Describe what you changed and why..." value={comment} onChange={(e) => setComment(e.target.value)} required />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-3 border-t bg-muted/30 shrink-0">
        <Button type="button" variant="outline" onClick={onCancel}>{t('actions.cancel')}</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('actions.save')}
        </Button>
      </div>
    </form>
  );
}

// Build sorted timeline — excludes items flagged as excluded
function buildTimeline(form, employments, lifeEvents, autoLifeEvents) {
  const items = [];

  // Birth
  if (form.dob) {
    items.push({
      date: form.dob,
      dateLabel: formatTimelineDate(form.dob),
      icon: '👶',
      title: 'Born',
      subtitle: form.place_of_birth || null,
      color: 'border-green-500 bg-green-100',
    });
  }

  // Death
  if (!form.is_alive && form.dod) {
    items.push({
      date: form.dod,
      dateLabel: formatTimelineDate(form.dod),
      icon: '🕯️',
      title: 'Passed Away',
      color: 'border-stone-500 bg-stone-100',
    });
  }

  // Employment → auto life events (only non-excluded)
  (autoLifeEvents || []).forEach(auto => {
    if (auto.excluded) return;
    items.push({
      date: auto.date,
      dateLabel: formatTimelineDate(auto.date),
      icon: '💼',
      title: auto.title,
      subtitle: auto.description || null,
      badge: employments[auto._autoIndex]?.current ? 'Current' : null,
      color: 'border-blue-500 bg-blue-100',
    });
  });

  // Manual life events (only non-excluded)
  lifeEvents.forEach(evt => {
    if (evt.excluded) return;
    const typeInfo = LIFE_EVENT_TYPES.find(t => t.value === evt.type) || LIFE_EVENT_TYPES[LIFE_EVENT_TYPES.length - 1];
    if (evt.date || evt.title) {
      items.push({
        date: evt.date || '9999-12-31',
        dateLabel: evt.date ? formatTimelineDate(evt.date) : 'Date not set',
        icon: typeInfo.icon,
        title: evt.title || typeInfo.label,
        subtitle: evt.description || null,
        color: getEventColor(evt.type),
      });
    }
  });

  items.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return items;
}

function formatTimelineDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getEventColor(type) {
  const colors = {
    birth: 'border-green-500 bg-green-100',
    education: 'border-violet-500 bg-violet-100',
    marriage: 'border-pink-500 bg-pink-100',
    child_born: 'border-amber-500 bg-amber-100',
    employment: 'border-blue-500 bg-blue-100',
    migration: 'border-cyan-500 bg-cyan-100',
    achievement: 'border-yellow-500 bg-yellow-100',
    retirement: 'border-orange-500 bg-orange-100',
    death: 'border-stone-500 bg-stone-100',
    other: 'border-gray-500 bg-gray-100',
  };
  return colors[type] || colors.other;
}
