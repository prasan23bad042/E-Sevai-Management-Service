import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/Sheet';
import { useToast } from '../../app/toastProvider';
import { useAuthStore } from '../../store/authStore';
import { ClipboardList, Search, Eye, RefreshCw } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface ApplicationItem {
  id: string;
  application_number: string;
  citizen_name: string;
  citizen_phone: string;
  service_name: string;
  status: string;
  created_at: string;
  sla_due_date: string;
  assigned_staff_name?: string;
  assigned_staff_id?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  performed_by_name: string;
  notes: string;
  created_at: string;
}

interface ChecklistItem {
  id: string;
  document_name: string;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
}

export const ApplicationsPage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuthStore();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Details drawer states
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await apiClient.get('/applications', { params });
      setApplications(response.data.data || []);
    } catch (e: any) {
      toast.error('Failed to load applications ledger.');
    } finally {
      setLoading(false);
    }
  };

  const loadStaffMembers = async () => {
    if (user?.role === 'staff') return;
    try {
      const response = await apiClient.get('/staff');
      // Filter active staff members
      const activeStaff = (response.data.data || [])
        .filter((s: any) => s.status === 'active')
        .map((s: any) => ({ id: s.id, name: s.name }));
      setStaffList(activeStaff);
    } catch (e) {}
  };

  useEffect(() => {
    loadApplications();
    loadStaffMembers();
  }, [statusFilter]);

  const loadApplicationDetails = async (app: ApplicationItem) => {
    setSelectedApp(app);
    setDrawerLoading(true);
    try {
      const response = await apiClient.get(`/applications/${app.id}`);
      const data = response.data.data || {};
      
      setChecklist(data.checklist || []);
      setActivityLogs(data.activityLogs || []);
    } catch (e) {
      toast.error('Failed to load application checklist timeline.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleAssignStaff = async (staffId: string) => {
    if (!selectedApp) return;
    setAssigneeLoading(true);
    try {
      await apiClient.patch(`/applications/${selectedApp.id}/assign`, { staffId });
      toast.success('Staff operator assigned to application.');
      
      // Update selected app status on screen
      const staffName = staffList.find(s => s.id === staffId)?.name || 'Assigned';
      setSelectedApp(prev => prev ? { ...prev, assigned_staff_id: staffId, assigned_staff_name: staffName, status: 'assigned' } : null);
      
      loadApplications();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to assign staff.');
    } finally {
      setAssigneeLoading(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    const term = search.toLowerCase();
    return (
      app.application_number.toLowerCase().includes(term) ||
      app.citizen_name.toLowerCase().includes(term) ||
      app.service_name.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return <Badge variant="success" className="capitalize">{status.replace('_', ' ')}</Badge>;
      case 'pending_payment':
      case 'draft':
      case 'assigned':
        return <Badge variant="warning" className="capitalize">{status.replace('_', ' ')}</Badge>;
      case 'rejected':
      case 'failed':
        return <Badge variant="destructive" className="capitalize">{status.replace('_', ' ')}</Badge>;
      default:
        return <Badge variant="primary" className="capitalize">{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Applications Registry</h2>
          <p className="text-sm text-slate-400">Monitor certificate workflows, update status, and manage queues</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadApplications} className="flex gap-2 items-center">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Filter panel controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950 p-4 border border-slate-900 rounded-lg">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-500" />
          <Input
            placeholder="Search by application number, citizen name, certificate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all" className="bg-slate-950">All Workflow States</option>
            <option value="draft" className="bg-slate-950">Drafts</option>
            <option value="submitted" className="bg-slate-950">Submitted</option>
            <option value="assigned" className="bg-slate-950">Assigned</option>
            <option value="document_verified" className="bg-slate-950">Docs Verified</option>
            <option value="pending_payment" className="bg-slate-950">Awaiting Payment</option>
            <option value="completed" className="bg-slate-950">Completed</option>
            <option value="rejected" className="bg-slate-950">Rejected</option>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" /> Active Application Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-slate-500">Loading applications database...</div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-slate-500">
              No matching applications found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App Number</TableHead>
                  <TableHead>Citizen Name</TableHead>
                  <TableHead>Service Module</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA Due Date</TableHead>
                  <TableHead>Assigned Operator</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-semibold text-blue-400">{app.application_number}</TableCell>
                    <TableCell className="text-slate-200">{app.citizen_name}</TableCell>
                    <TableCell>{app.service_name}</TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell>{new Date(app.sla_due_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {app.assigned_staff_name || <span className="text-slate-600 italic">Unassigned</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadApplicationDetails(app)}
                        className="text-blue-400 hover:bg-blue-950/20"
                      >
                        <Eye className="w-4 h-4 mr-1" /> View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Slide-over details drawer panel */}
      {selectedApp && (
        <Sheet open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
          <SheetContent className="max-w-xl w-full flex flex-col gap-6 overflow-y-auto">
            <SheetHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  {selectedApp.service_name}
                </span>
                {getStatusBadge(selectedApp.status)}
              </div>
              <SheetTitle className="text-xl font-bold tracking-tight text-slate-100">
                {selectedApp.application_number}
              </SheetTitle>
              <SheetDescription>
                Submitted on {new Date(selectedApp.created_at).toLocaleDateString()}
              </SheetDescription>
            </SheetHeader>

            {drawerLoading ? (
              <div className="text-center py-20 text-slate-500">Loading details payload...</div>
            ) : (
              <div className="space-y-6 flex-1 text-sm text-slate-300">
                {/* Citizen Info Section */}
                <div className="space-y-2.5 pb-4 border-b border-slate-900">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Citizen Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500 text-xs">Name</p>
                      <p className="font-semibold text-slate-200">{selectedApp.citizen_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Phone Number</p>
                      <p className="font-semibold text-slate-200">{selectedApp.citizen_phone}</p>
                    </div>
                  </div>
                </div>

                {/* Team Assignment Controls */}
                {user?.role !== 'staff' && (
                  <div className="space-y-2.5 pb-4 border-b border-slate-900">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Task Assignment</h4>
                    <div className="flex gap-4 items-center">
                      <select
                        value={selectedApp.assigned_staff_id || ''}
                        disabled={assigneeLoading}
                        onChange={(e) => handleAssignStaff(e.target.value)}
                        className="flex-1 h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled className="bg-slate-950">Select team member...</option>
                        {staffList.map(s => (
                          <option key={s.id} value={s.id} className="bg-slate-950">{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Documents Checklist verification section */}
                <div className="space-y-2.5 pb-4 border-b border-slate-900">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Required Documents Checklist</h4>
                  {checklist.length === 0 ? (
                    <p className="text-slate-550 italic text-xs">No documents required.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {checklist.map((c) => (
                        <div key={c.id} className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-850">
                          <span className="font-semibold text-slate-200 text-xs capitalize">
                            {c.document_name.replace('_', ' ')}
                          </span>
                          <Badge variant={c.status === 'verified' ? 'success' : c.status === 'rejected' ? 'destructive' : 'primary'}>
                            {c.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timeline History Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Workflow History</h4>
                  {activityLogs.length === 0 ? (
                    <p className="text-slate-550 italic text-xs">No logs recorded.</p>
                  ) : (
                    <div className="flex flex-col gap-3.5 relative pl-4 border-l border-slate-850">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="flex flex-col gap-0.5 relative text-xs">
                          {/* Circle dot marker */}
                          <div className="absolute -left-6.5 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-slate-950"></div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="font-semibold capitalize text-slate-300">{log.action.replace('_', ' ')}</span>
                            <span>{new Date(log.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] text-slate-500">Performed by: {log.performed_by_name}</p>
                          {log.notes && <p className="text-slate-400 mt-1 italic">"{log.notes}"</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};
