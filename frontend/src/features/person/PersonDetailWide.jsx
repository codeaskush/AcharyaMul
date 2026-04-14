import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { personApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar } from './PersonListPage';
import VisibilityToggles from './VisibilityToggles';
import { EyeOff, CalendarDays, X, Loader2 } from 'lucide-react';

function DateDisplay({ dateObj }) {
  if (!dateObj) return <span className="text-muted-foreground/40">-</span>;
  return (
    <span>
      {dateObj.ad}
      {dateObj.bs && <span className="text-muted-foreground text-xs ml-1">({dateObj.bs} BS)</span>}
    </span>
  );
}

function Field({ label, value, children, hidden }) {
  return (
    <div className="flex justify-between items-baseline py-3 border-b border-border/40 gap-4">
      <span className="text-sm text-muted-foreground shrink-0 flex items-center gap-1.5">
        {label}
        {hidden && <EyeOff className="h-3 w-3 text-muted-foreground/50" />}
      </span>
      <span className="text-sm font-medium text-right">{children || value || <span className="text-muted-foreground/40">-</span>}</span>
    </div>
  );
}

const EVENT_ICONS = {
  birth: '👶', education: '🎓', marriage: '💍', child_born: '🍼',
  employment: '💼', migration: '✈️', achievement: '🏆',
  retirement: '🌅', death: '🕯️', other: '📌',
};

const EVENT_COLORS = {
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

function formatTimelineDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildTimeline(person, lifeEvents) {
  const items = [];

  // Birth from person data
  if (person.dob?.ad) {
    items.push({
      date: person.dob.ad,
      dateLabel: formatTimelineDate(person.dob.ad),
      icon: '👶',
      title: 'Born',
      subtitle: person.place_of_birth || null,
      color: EVENT_COLORS.birth,
    });
  }

  // Life events from API
  lifeEvents.forEach(evt => {
    if (evt.excluded) return;
    const dateStr = evt.event_date?.ad || '';
    const endDateStr = evt.end_date?.ad || '';
    let dateLabel = dateStr ? formatTimelineDate(dateStr) : '';
    if (endDateStr) dateLabel += ` — ${formatTimelineDate(endDateStr)}`;
    else if (evt.is_current) dateLabel += ' — Present';

    items.push({
      date: dateStr || '9999-12-31',
      dateLabel,
      icon: EVENT_ICONS[evt.event_type] || '📌',
      title: evt.title,
      subtitle: evt.event_type === 'employment' && evt.organization
        ? evt.organization
        : evt.description || null,
      badge: evt.is_current ? 'Current' : null,
      color: EVENT_COLORS[evt.event_type] || EVENT_COLORS.other,
    });
  });

  // Death from person data
  if (!person.is_alive && person.dod?.ad) {
    items.push({
      date: person.dod.ad,
      dateLabel: formatTimelineDate(person.dod.ad),
      icon: '🕯️',
      title: 'Passed Away',
      color: EVENT_COLORS.death,
    });
  }

  items.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return items;
}

export default function PersonDetailWide({ person, onClose, onEdit, onContribute, onUpdate }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isContributor = user?.role === 'contributor';

  const [lifeEvents, setLifeEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    if (!person?.id) return;
    setEventsLoading(true);
    personApi.getLifeEvents(person.id)
      .then(res => setLifeEvents(res.data || []))
      .catch(() => setLifeEvents([]))
      .finally(() => setEventsLoading(false));
  }, [person?.id]);

  if (!person) return null;

  const vis = person.visibility_settings || { dob: true, address: true, phone: true, email: true };
  const devanagariName = [person.first_name_devanagari, person.middle_name_devanagari, person.last_name_devanagari].filter(Boolean).join(' ');
  const romanName = [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(' ');

  const showDob = isAdmin || vis.dob;
  const showAddress = isAdmin || vis.address;

  const timelineItems = buildTimeline(person, lifeEvents);

  return (
    <Dialog open={!!person} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="!max-w-[95vw] !w-[95vw] !h-[85vh] !p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30 shrink-0">
          <h2 className="text-lg font-semibold">{romanName}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* 30/70 split */}
        <div className="flex-1 overflow-hidden grid grid-cols-10">
          {/* Left: Person details — 30% */}
          <div className="col-span-3 border-r overflow-y-auto p-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <Avatar person={person} size="lg" />
              </div>
              <h3 className="text-xl font-semibold">{romanName}</h3>
              {devanagariName && <p className="text-base text-muted-foreground mt-1">{devanagariName}</p>}
              <div className="flex justify-center gap-2 mt-3">
                <Badge variant="outline">{t('labels.generation')} {person.generation}</Badge>
                <Badge variant={person.is_alive ? 'default' : 'secondary'}>
                  {person.is_alive ? t('labels.alive') : t('labels.deceased')}
                </Badge>
              </div>
            </div>

            <Separator className="mb-4" />

            <div>
              <Field label={t('labels.gender')} value={t(`labels.${person.gender}`)} />
              {showDob && (
                <Field label={t('labels.dob')} hidden={isAdmin && !vis.dob}>
                  <DateDisplay dateObj={person.dob} />
                </Field>
              )}
              {!person.is_alive && showDob && (
                <Field label={t('labels.dod')} hidden={isAdmin && !vis.dob}>
                  <DateDisplay dateObj={person.dod} />
                </Field>
              )}
              <Field label={t('labels.place_of_birth')} value={person.place_of_birth} />
              {showAddress && person.current_address && (
                <Field label={t('labels.current_address')} value={person.current_address} hidden={isAdmin && !vis.address} />
              )}
              <Field label={t('labels.occupation')} value={person.occupation} />
            </div>

            {isAdmin && (
              <>
                <Separator className="my-5" />
                <VisibilityToggles person={person} onUpdate={onUpdate} />
              </>
            )}

            <div className="flex gap-3 mt-6">
              {isAdmin && <Button className="flex-1" onClick={() => onEdit?.(person)}>{t('actions.edit')}</Button>}
              {isContributor && <Button variant="secondary" className="flex-1" onClick={() => onContribute?.(person)}>{t('actions.contribute')}</Button>}
            </div>
          </div>

          {/* Right: Timeline — 70% */}
          <div className="col-span-7 overflow-y-auto p-6 bg-muted/20">
            <div className="flex items-center gap-2 mb-6">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Life Timeline</h3>
            </div>

            {eventsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : timelineItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <CalendarDays className="h-12 w-12 text-muted-foreground/15 mb-4" />
                <p className="text-sm text-muted-foreground">No timeline events available yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Life events, employment history, and milestones will appear here.</p>
              </div>
            ) : (
              <div className="relative max-w-2xl">
                <div className="absolute left-4 top-3 bottom-3 w-px bg-border" />

                <div className="space-y-6">
                  {timelineItems.map((item, i) => (
                    <div key={i} className="relative pl-12">
                      <div className={`absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${item.color}`} />

                      {item.dateLabel && (
                        <div className="text-xs text-muted-foreground mb-1">{item.dateLabel}</div>
                      )}
                      <div className="flex items-center gap-2">
                        {item.icon && <span className="text-base">{item.icon}</span>}
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                      {item.subtitle && <div className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</div>}
                      {item.badge && <Badge variant="outline" className="text-[9px] mt-1 h-4">{item.badge}</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
