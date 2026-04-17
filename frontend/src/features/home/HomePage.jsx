import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Newspaper,
  CalendarClock,
  BookOpen,
  Feather,
  Image,
  Clock,
  ChevronRight,
  TreePine,
} from 'lucide-react';
import { NEWS_ITEMS, EVENTS, HISTORY_ARTICLES, LITERATURE, GALLERY_IMAGES } from './homeData';

// --- Helpers ---

function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// --- Sections ---

function HeroBanner() {
  const { t } = useTranslation();
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 text-white p-8 md:p-12">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
      </div>
      <div className="relative z-10 max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <TreePine className="h-5 w-5 text-amber-400" />
          <span className="text-amber-400 text-sm font-medium tracking-wide uppercase">{t('home.hero_family')}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          {t('home.hero_title')}
        </h1>
        <p className="text-stone-300 text-base md:text-lg leading-relaxed mb-6">
          {t('home.hero_description')}
        </p>
        <div className="flex gap-3">
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold">
            <Link to="/chart">{t('home.explore_tree')}</Link>
          </Button>
          <Button asChild className="bg-white hover:bg-stone-100 text-stone-900 font-semibold">
            <Link to="/members">{t('home.view_members')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewsSection() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-muted-foreground" />
          <CardTitle>{t('home.news_title')}</CardTitle>
        </div>
        <CardDescription>{t('home.news_subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {NEWS_ITEMS.map((item, i) => (
          <div key={item.id}>
            {i > 0 && <Separator className="mb-4" />}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-sm">{item.title}</h3>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{item.tag}</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
                <Link to={`/news/${item.slug}`} className="text-xs text-primary font-medium mt-2 inline-flex items-center gap-1 hover:underline no-underline">
                  {t('home.read_more')} <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">{formatDate(item.date)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EventsCountdown() {
  const { t } = useTranslation();
  const upcomingEvents = EVENTS
    .map(e => ({ ...e, daysLeft: daysUntil(e.date) }))
    .filter(e => e.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <CardTitle>{t('home.events_title')}</CardTitle>
        </div>
        <CardDescription>{t('home.events_subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingEvents.map(event => (
          <Link key={event.id} to={`/events/${event.slug}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors no-underline">
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-primary/10 shrink-0">
              <span className="text-lg font-bold leading-none">{event.daysLeft}</span>
              <span className="text-[9px] text-muted-foreground mt-0.5">{t('home.events_days')}</span>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-foreground">{event.title}</p>
              <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
              <p className="text-xs text-muted-foreground">{event.location}</p>
            </div>
          </Link>
        ))}
        {upcomingEvents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">{t('home.events_none')}</p>
        )}
      </CardContent>
    </Card>
  );
}

function HistorySection() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <CardTitle>{t('home.history_title')}</CardTitle>
        </div>
        <CardDescription>{t('home.history_subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {HISTORY_ARTICLES.map((article, i) => (
          <div key={article.id}>
            {i > 0 && <Separator className="mb-4" />}
            <h3 className="font-medium text-sm mb-1">{article.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{article.excerpt}</p>
            <Link to={`/history/${article.slug}`} className="text-xs text-primary font-medium mt-2 inline-flex items-center gap-1 hover:underline no-underline">
              {t('home.read_more')} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LiteratureSection() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Feather className="h-4 w-4 text-muted-foreground" />
          <CardTitle>{t('home.literature_title')}</CardTitle>
        </div>
        <CardDescription>{t('home.literature_subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {LITERATURE.map((item, i) => (
          <div key={item.id}>
            {i > 0 && <Separator className="mb-4" />}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm">{item.title}</h3>
              <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.excerpt}</p>
            <Link to={`/literature/${item.slug}`} className="text-xs text-primary font-medium mt-2 inline-flex items-center gap-1 hover:underline no-underline">
              {t('home.read_more')} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function GallerySection() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" />
          <CardTitle>{t('home.gallery_title')}</CardTitle>
        </div>
        <CardDescription>{t('home.gallery_subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {GALLERY_IMAGES.map(img => (
            <div key={img.id} className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-muted border cursor-pointer">
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-[10px] text-white font-medium">{img.label}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          {t('home.gallery_cta')}
        </p>
      </CardContent>
    </Card>
  );
}

// --- Main ---

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <HeroBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <NewsSection />
          <HistorySection />
          <LiteratureSection />
        </div>

        <div className="space-y-6">
          <EventsCountdown />
          <GallerySection />
        </div>
      </div>
    </div>
  );
}
