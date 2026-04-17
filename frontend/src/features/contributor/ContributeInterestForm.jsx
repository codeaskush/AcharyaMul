import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { contributionRequestApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, HandHeart } from 'lucide-react';
import { toast } from 'sonner';

const CONTRIBUTION_AREAS = [
  { id: 'members', label: 'Adding / maintaining family members', icon: '👥' },
  { id: 'events', label: 'Adding family events', icon: '📅' },
  { id: 'news', label: 'Adding family news & updates', icon: '📰' },
  { id: 'articles', label: 'Adding historical articles', icon: '📖' },
  { id: 'literature', label: 'Adding literature & writings', icon: '✍️' },
];

export default function ContributeInterestForm({ open, onClose }) {
  const { t } = useTranslation();
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!open) return;
    setChecking(true);
    contributionRequestApi.getMine()
      .then(res => setExistingRequest(res.data))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [open]);

  const toggleArea = (areaId) => {
    setSelectedAreas(prev =>
      prev.includes(areaId) ? prev.filter(a => a !== areaId) : [...prev, areaId]
    );
  };

  const handleSubmit = async () => {
    if (selectedAreas.length === 0) {
      toast.error('Please select at least one contribution area');
      return;
    }
    setLoading(true);
    try {
      await contributionRequestApi.submit({
        areas: selectedAreas,
        message: message.trim() || null,
      });
      toast.success('Your contribution interest has been submitted! An admin will review it.');
      onClose();
    } catch (err) {
      toast.error(err.detail || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        {checking ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : existingRequest?.status === 'pending' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HandHeart className="h-5 w-5 text-amber-500" />
                Request Pending
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                You already have a pending contribution request. An admin will review it soon.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Areas requested:</p>
                <div className="flex flex-wrap gap-1.5">
                  {existingRequest.areas.map(a => {
                    const area = CONTRIBUTION_AREAS.find(ca => ca.id === a);
                    return <span key={a} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{area?.icon} {area?.label || a}</span>;
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HandHeart className="h-5 w-5 text-green-500" />
                Want to Contribute?
              </DialogTitle>
              <DialogDescription>
                Show your interest in contributing to the family tree. Select the areas you'd like to help with.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-4">
              {/* Contribution areas */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Contribution Areas (select at least one) *</Label>
                <div className="space-y-2">
                  {CONTRIBUTION_AREAS.map(area => (
                    <div
                      key={area.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectedAreas.includes(area.id)
                          ? 'border-green-300 bg-green-50/50'
                          : 'border-border hover:bg-muted/30'
                      }`}
                      onClick={() => toggleArea(area.id)}
                    >
                      <Checkbox checked={selectedAreas.includes(area.id)} onCheckedChange={() => toggleArea(area.id)} />
                      <span className="text-base">{area.icon}</span>
                      <span className="text-sm">{area.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label className="text-xs">Message to admin (optional)</Label>
                <Textarea
                  className="min-h-16 text-sm"
                  placeholder="Tell us why you'd like to contribute or any relevant experience..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading || selectedAreas.length === 0} className="gap-1.5">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Interest
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
