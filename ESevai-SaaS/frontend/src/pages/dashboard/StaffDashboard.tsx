import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton';
import { useToast } from '../../app/toastProvider';
import { ClipboardList, FileUp, AlertTriangle, MessageSquare, RefreshCw } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface StaffStats {
  assignedCount: number;
  draftsCount: number;
  awaitingUploads: number;
  activeAlerts: number;
}

interface AssignedApp {
  id: string;
  application_number: string;
  citizen_name: string;
  service_name: string;
  status: string;
  due_date: string;
}

export const StaffDashboard: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StaffStats>({
    assignedCount: 0,
    draftsCount: 0,
    awaitingUploads: 0,
    activeAlerts: 0,
  });
  const [tasks, setTasks] = useState<AssignedApp[]>([]);

  const loadStaffMetrics = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/dashboard/staff');
      const data = response.data.data || {};
      
      setStats({
        assignedCount: data.stats?.assignedCount || 0,
        draftsCount: data.stats?.draftsCount || 0,
        awaitingUploads: data.stats?.awaitingUploads || 0,
        activeAlerts: data.stats?.activeAlerts || 0,
      });

      setTasks(data.assignedApplicationsQueue || []);
    } catch (e: any) {
      toast.error('Failed to load staff operator metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffMetrics();
  }, []);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return 'success';
      case 'pending_payment':
      case 'draft':
        return 'warning';
      case 'rejected':
      case 'failed':
        return 'destructive';
      default:
        return 'primary';
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Operator Dashboard</h2>
          <p className="text-sm text-slate-400">Manage drafts, upload verification documents, and check alerts</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadStaffMetrics} className="flex gap-2 items-center">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Tasks</span>
            <ClipboardList className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.assignedCount}</div>
            <p className="text-xs text-slate-500 mt-1">Applications assigned to me</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Work Drafts</span>
            <AlertTriangle className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.draftsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Draft applications in editing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Uploads</span>
            <FileUp className="w-4 h-4 text-amber-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.awaitingUploads}</div>
            <p className="text-xs text-slate-500 mt-1">Checklists requiring uploads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Alerts</span>
            <MessageSquare className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.activeAlerts}</div>
            <p className="text-xs text-slate-500 mt-1">Unread action updates</p>
          </CardContent>
        </Card>
      </div>

      {/* Task List Grid */}
      <Card>
        <CardHeader>
          <CardTitle>My Action Tasks Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
              No assigned applications. Select services to start a new application draft.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App Number</TableHead>
                  <TableHead>Citizen Name</TableHead>
                  <TableHead>Service Module</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold text-blue-400">{t.application_number}</TableCell>
                    <TableCell className="text-slate-200">{t.citizen_name}</TableCell>
                    <TableCell>{t.service_name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(t.status)} className="capitalize">
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(t.due_date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
