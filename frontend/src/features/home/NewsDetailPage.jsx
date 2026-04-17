import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { NEWS_ITEMS } from './homeData';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NewsDetailPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const article = NEWS_ITEMS.find(n => n.slug === slug);

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">{t('home.article_not_found')}</p>
        <Button asChild variant="outline"><Link to="/">{t('home.back_home')}</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Button asChild variant="ghost" size="sm" className="mb-4 gap-1.5">
        <Link to="/"><ArrowLeft className="h-3.5 w-3.5" /> {t('home.back_home')}</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary">{article.tag}</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(article.date)}</span>
          </div>
          <CardTitle className="text-xl">{article.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-line">
            {article.body.split('\n\n').map((para, i) => {
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
