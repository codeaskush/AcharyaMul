import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { HISTORY_ARTICLES } from './homeData';

export default function HistoryDetailPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const article = HISTORY_ARTICLES.find(a => a.slug === slug);

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
          <CardTitle className="text-xl">{article.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-sm leading-relaxed">
            {article.body.split('\n\n').map((para, i) => {
              if (para.startsWith('## ')) {
                return <h2 key={i} className="text-lg font-bold mt-2 mb-3">{para.replace('## ', '')}</h2>;
              }
              if (para.startsWith('### ')) {
                return <h3 key={i} className="text-base font-semibold mt-5 mb-2">{para.replace('### ', '')}</h3>;
              }
              return <p key={i} className="text-muted-foreground mb-3">{para}</p>;
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
