import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { userApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, UserPlus, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      setUsers((await userApi.getAll()).data || []);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      await userApi.invite({ email: inviteEmail.trim(), role: inviteRole });
      toast.success(`Invited ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('viewer');
      setInviteOpen(false);
      fetchUsers();
    } catch (err) { toast.error(err.detail || 'Failed to invite user'); }
    finally { setInviteLoading(false); }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await userApi.update(userId, { role: newRole });
      toast.success('Role updated');
      fetchUsers();
    } catch (err) { toast.error(err.detail || 'Failed to update role'); }
  };

  const handleRevoke = async (user) => {
    if (!confirm(`Remove access for ${user.email}? This cannot be undone.`)) return;
    try {
      await userApi.remove(user.id);
      toast.success(`Access revoked for ${user.email}`);
      fetchUsers();
    } catch (err) { toast.error(err.detail || 'Failed to revoke access'); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('admin.tab_access')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.subtitle')}</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          {t('admin.invite')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">{t('admin.email')}</TableHead>
                <TableHead>{t('admin.name')}</TableHead>
                <TableHead>{t('admin.role')}</TableHead>
                <TableHead>{t('admin.status')}</TableHead>
                <TableHead>{t('admin.last_login')}</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell><span className="text-sm font-medium">{user.email}</span></TableCell>
                  <TableCell><span className="text-sm text-muted-foreground">{user.display_name || '—'}</span></TableCell>
                  <TableCell>
                    <Select value={user.role} onValueChange={(val) => handleRoleChange(user.id, val)}>
                      <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin"><span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> Admin</span></SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.invite_status === 'accepted' ? 'default' : 'secondary'}>
                      {user.invite_status === 'accepted' ? t('admin.accepted') : t('admin.pending')}
                    </Badge>
                  </TableCell>
                  <TableCell><span className="text-xs text-muted-foreground">{formatDate(user.last_login)}</span></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRevoke(user)} title="Revoke access">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users yet. Invite the first family member.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <form onSubmit={handleInvite}>
            <DialogHeader><DialogTitle>{t('admin.invite_title')}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('admin.email')}</Label>
                <Input type="email" placeholder="family.member@gmail.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.role')}</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="contributor">Contributor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={inviteLoading} className="gap-1.5">
                {inviteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('admin.send_invite')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
