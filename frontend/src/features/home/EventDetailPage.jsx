import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarClock, MapPin } from 'lucide-react';
import { EVENTS } from './homeData';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export default function EventDetailPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const event = EVENTS.find(e => e.slug === slug);

  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">{t('home.event_not_found')}</p>
        <Button asChild variant="outline"><Link to="/">{t('home.back_home')}</Link></Button>
      </div>
    );
  }

  const days = daysUntil(event.date);
  const isPast = days < 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Button asChild variant="ghost" size="sm" className="mb-4 gap-1.5">
        <Link to="/"><ArrowLeft className="h-3.5 w-3.5" /> {t('home.back_home')}</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{event.title}</CardTitle>
          <CardDescription className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isPast && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border mb-6">
              <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-primary/10 shrink-0">
                <span className="text-2xl font-bold leading-none">{days}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">{t('home.days_to_go')}</span>
              </div>
              <div>
                <p className="font-medium text-sm">{t('home.countdown')}</p>
                <p className="text-xs text-muted-foreground">
                  {days === 0 ? t('home.today') : t(days === 1 ? 'home.days_until' : 'home.days_until_plural', { count: days })}
                </p>
              </div>
            </div>
          )}
          {isPast && (
            <div className="p-3 rounded-lg bg-muted/50 border mb-6">
              <Badge variant="secondary">{t('home.past_event')}</Badge>
            </div>
          )}

          <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-line">
            {event.description.split('\n\n').map((para, i) => {
              if (para.startsWith('**') && para.endsWith('**')) {
                return <h3 key={i} className="font-semibold text-sm mt-4 mb-2">{para.replace(/\*\*/g, '')}</h3>;
              }
              if (para.startsWith('- ')) {
                return (
                  <ul key={i} className="list-disc list-inside space-y-1 my-2 text-muted-foreground">
                    {para.split('\n').map((line, j) => (
                      <li key={j}>{line.replace(/^- /, '').replace(/\*\*/g, '')}</li>
                    ))}
                  </ul>
                );
              }
              return <p key={i} className="text-muted-foreground mb-3">{para.replace(/\*\*/g, '')}</p>;
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
