import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FormInput } from '../../components/forms/FormInput';
import { FormSelect } from '../../components/forms/FormSelect';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../app/toastProvider';
import { Users, UserPlus, Trash2, RefreshCw } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface StaffItem {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'staff';
  status: 'active' | 'pending';
  invitation_id?: string;
}

const inviteStaffSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['manager', 'staff']),
});

type InviteInputs = z.infer<typeof inviteStaffSchema>;

export const StaffPage: React.FC = () => {
  const toast = useToast();
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const methods = useForm<InviteInputs>({
    defaultValues: {
      email: '',
      role: 'staff',
    },
  });

  const loadStaff = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/staff');
      setStaffList(response.data.data || []);
    } catch (e: any) {
      toast.error('Failed to load staff directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleInvite = async (data: InviteInputs) => {
    setInviting(true);
    try {
      const parseResult = inviteStaffSchema.safeParse(data);
      if (!parseResult.success) {
        parseResult.error.issues.forEach((err) => {
          methods.setError(err.path[0] as any, { message: err.message });
        });
        setInviting(false);
        return;
      }

      await apiClient.post('/staff/invite', data);
      toast.success('Invitation sent to staff email.');
      methods.reset();
      loadStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (memberId: string, invitationId?: string) => {
    const idToRevoke = invitationId || memberId;
    if (!idToRevoke) return;

    setActionLoading(memberId);
    try {
      if (invitationId) {
        await apiClient.delete(`/staff/invitations/${invitationId}`);
        toast.success('Pending invitation revoked.');
      } else {
        await apiClient.delete(`/staff/members/${memberId}`);
        toast.success('Staff credentials suspended.');
      }
      loadStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to revoke permissions.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Staff Management</h2>
          <p className="text-sm text-slate-400">Onboard operators, managers, and monitor permissions logs</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadStaff} className="flex gap-2 items-center">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invitation Panel */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" /> Onboard Staff Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(handleInvite)} className="space-y-4">
                <FormInput
                  name="email"
                  label="Email Address"
                  placeholder="operator@sevacenter.in"
                  type="email"
                />
                <FormSelect
                  name="role"
                  label="Center Authorization Role"
                  options={[
                    { value: 'staff', label: 'Staff Operator' },
                    { value: 'manager', label: 'Operations Manager' },
                  ]}
                />
                <Button type="submit" className="w-full mt-2" isLoading={inviting}>
                  Send Invitation Code
                </Button>
              </form>
            </FormProvider>
          </CardContent>
        </Card>

        {/* Directory Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" /> Center Staff Directory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-slate-500">Loading directory roster...</div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-slate-500">
                No staff members registered or invited yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-semibold text-slate-200">
                        {member.name || <span className="text-slate-550 italic">Awaiting Acceptance</span>}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <span className="capitalize">{member.role}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'active' ? 'success' : 'warning'}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:bg-red-950/20"
                          onClick={() => handleRevoke(member.id, member.invitation_id)}
                          isLoading={actionLoading === member.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
