import { useState } from 'react';
import { platformApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Database, RefreshCw, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';

function ActionCard({ icon: Icon, title, description, buttonLabel, buttonVariant, color, confirmText, onAction }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const needsConfirm = !!confirmText;

  const handleClick = async () => {
    if (needsConfirm && !confirmOpen) {
      setConfirmOpen(true);
      return;
    }
    if (needsConfirm && confirmInput !== confirmText) {
      toast.error(`Type "${confirmText}" to confirm`);
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await onAction();
      setResult(res.data);
      toast.success(res.data.message || 'Done');
      setConfirmOpen(false);
      setConfirmInput('');
    } catch (err) {
      toast.error(err.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={confirmOpen ? 'border-red-200' : ''}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {confirmOpen && (
          <div className="border border-red-200 bg-red-50/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-xs font-semibold">Are you sure? This action cannot be undone.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-red-600">Type <span className="font-mono font-bold">{confirmText}</span> to confirm</Label>
              <Input
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder={confirmText}
                className="border-red-200 text-sm"
              />
            </div>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
            {result.persons !== undefined && <p className="text-xs text-green-700">Persons: {result.persons}</p>}
            {result.relationships !== undefined && <p className="text-xs text-green-700">Relationships: {result.relationships}</p>}
            {result.life_events !== undefined && <p className="text-xs text-green-700">Life Events: {result.life_events}</p>}
          </div>
        )}

        <div className="flex gap-2">
          {confirmOpen && (
            <Button variant="outline" size="sm" onClick={() => { setConfirmOpen(false); setConfirmInput(''); }}>
              Cancel
            </Button>
          )}
          <Button
            variant={buttonVariant || 'outline'}
            size="sm"
            className={confirmOpen ? 'flex-1' : ''}
            disabled={loading || (confirmOpen && confirmInput !== confirmText)}
            onClick={handleClick}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmOpen ? 'Confirm' : buttonLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlatformSettings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Platform Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Database management tools for development and UAT testing.
        </p>
        <Badge variant="outline" className="mt-2 text-amber-600 border-amber-300">Development Mode Only</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActionCard
          icon={Trash2}
          title="Clear Database"
          description="Remove all family members, relationships, life events, contributions, and logs. User accounts are preserved."
          buttonLabel="Clear All Family Data"
          buttonVariant="destructive"
          color="bg-red-100 text-red-600"
          confirmText="CLEAR ALL"
          onAction={platformApi.clearDatabase}
        />

        <ActionCard
          icon={Database}
          title="Load Mock Family"
          description="Load the seed family data (from seed_data.json) into the database. This will clear existing family data first and replace it with the mock dataset."
          buttonLabel="Load Seed Data"
          buttonVariant="default"
          color="bg-blue-100 text-blue-600"
          confirmText="LOAD SEED"
          onAction={platformApi.loadSeed}
        />

        <ActionCard
          icon={RefreshCw}
          title="Sync to Seed File"
          description="Export the current approved family tree data to seed_data.json. Use this to save the current state as the new baseline for UAT testing."
          buttonLabel="Sync Current Data"
          color="bg-green-100 text-green-600"
          onAction={platformApi.syncSeed}
        />
      </div>

      <Separator />

      {/* Export Section */}
      <div>
        <h3 className="text-lg font-semibold">Data Export</h3>
        <p className="text-sm text-muted-foreground mt-1">Download family data as CSV files.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-600">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Export Members</CardTitle>
                <CardDescription className="mt-1">Download all approved family members with names (Roman + Devanagari), dates (AD + BS), gender, occupation, address, and status.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/v1/backup/export/members" download>Download Members CSV</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-600">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Export Relationships</CardTitle>
                <CardDescription className="mt-1">Download all relationships (marriages and parent-child links) with person names, marriage status, dates, and locations.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/v1/backup/export/relationships" download>Download Relationships CSV</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
