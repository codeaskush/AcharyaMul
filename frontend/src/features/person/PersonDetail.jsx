import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar } from './PersonListPage';

function DateDisplay({ dateObj }) {
  if (!dateObj) return <span className="text-muted-foreground/40">-</span>;
  return (
    <span>
      {dateObj.ad}
      {dateObj.bs && <span className="text-muted-foreground text-xs ml-1">({dateObj.bs} BS)</span>}
    </span>
  );
}

function Field({ label, value, children }) {
  return (
    <div className="flex justify-between items-baseline py-3 border-b border-border/40 gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{children || value || <span className="text-muted-foreground/40">-</span>}</span>
    </div>
  );
}

export default function PersonDetail({ person, onClose, onEdit, onContribute }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isContributor = user?.role === 'contributor';

  if (!person) return null;

  const devanagariName = [person.first_name_devanagari, person.middle_name_devanagari, person.last_name_devanagari].filter(Boolean).join(' ');
  const romanName = [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(' ');

  return (
    <Sheet open={!!person} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="overflow-y-auto w-full sm:w-[420px] sm:max-w-[420px] p-0">
        <div className="p-6 pb-0">
          <SheetHeader className="text-center pb-2">
            <Avatar person={person} size="lg" className="mx-auto mb-4 border-3" />
            <SheetTitle className="text-xl">{romanName}</SheetTitle>
            {devanagariName && <p className="text-base text-muted-foreground mt-1">{devanagariName}</p>}
            <div className="flex justify-center gap-2 pt-2">
              <Badge variant="outline">{t('labels.generation')} {person.generation}</Badge>
              <Badge variant={person.is_alive ? 'default' : 'secondary'}>
                {person.is_alive ? t('labels.alive') : t('labels.deceased')}
              </Badge>
            </div>
          </SheetHeader>
        </div>

        <Separator className="my-5" />

        <div className="px-6">
          <Field label={t('labels.gender')} value={t(`labels.${person.gender}`)} />
          <Field label={t('labels.dob')}><DateDisplay dateObj={person.dob} /></Field>
          {!person.is_alive && <Field label={t('labels.dod')}><DateDisplay dateObj={person.dod} /></Field>}
          <Field label={t('labels.place_of_birth')} value={person.place_of_birth} />
          {person.current_address && <Field label={t('labels.current_address')} value={person.current_address} />}
          <Field label={t('labels.occupation')} value={person.occupation} />
        </div>

        <div className="px-6 py-6 flex gap-3">
          {isAdmin && <Button className="flex-1" onClick={() => onEdit?.(person)}>{t('actions.edit')}</Button>}
          {isContributor && <Button variant="secondary" className="flex-1" onClick={() => onContribute?.(person)}>{t('actions.contribute')}</Button>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
