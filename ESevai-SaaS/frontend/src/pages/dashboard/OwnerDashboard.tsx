import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton';
import { useToast } from '../../app/toastProvider';
import { Users, ClipboardList, Receipt, Landmark, RefreshCw } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface OwnerStats {
  activeStaffCount: number;
  totalAppsCount: number;
  revenueCollected: number;
  pendingPaymentsCount: number;
}

interface RecentApp {
  id: string;
  application_number: string;
  citizen_name: string;
  service_name: string;
  status: string;
  created_at: string;
}

export const OwnerDashboard: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OwnerStats>({
    activeStaffCount: 0,
    totalAppsCount: 0,
    revenueCollected: 0,
    pendingPaymentsCount: 0,
  });
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);

  const loadOwnerMetrics = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/dashboard/owner');
      const data = response.data.data || {};
      
      setStats({
        activeStaffCount: data.stats?.activeStaffCount || 0,
        totalAppsCount: data.stats?.totalAppsCount || 0,
        revenueCollected: data.stats?.revenueCollected || 0,
        pendingPaymentsCount: data.stats?.pendingPaymentsCount || 0,
      });

      setRecentApps(data.recentApplications || []);
    } catch (e: any) {
      toast.error('Failed to load center owner metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwnerMetrics();
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Center Owner Dashboard</h2>
          <p className="text-sm text-slate-400">Overview of center staffing, billing, and queue workloads</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOwnerMetrics} className="flex gap-2 items-center">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Staff</span>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.activeStaffCount}</div>
            <p className="text-xs text-slate-500 mt-1">Onboarded operators & managers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Center Applications</span>
            <ClipboardList className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.totalAppsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Submitted in this tenant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Revenue Box</span>
            <Landmark className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">₹{stats.revenueCollected.toLocaleString('en-IN')}</div>
            <p className="text-xs text-slate-500 mt-1">Reconciled billing collections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Unpaid Balances</span>
            <Receipt className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.pendingPaymentsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Applications awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Center Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentApps.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
              No recent applications recorded.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App Number</TableHead>
                  <TableHead>Citizen Name</TableHead>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submission Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentApps.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-semibold text-blue-400">{a.application_number}</TableCell>
                    <TableCell className="text-slate-200">{a.citizen_name}</TableCell>
                    <TableCell>{a.service_name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(a.status)} className="capitalize">
                        {a.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
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
