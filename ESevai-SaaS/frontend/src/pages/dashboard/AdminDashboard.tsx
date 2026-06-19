import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton';
import { useToast } from '../../app/toastProvider';
import { Building2, ClipboardList, ShieldAlert, Check, X, RefreshCw } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface DashboardStats {
  totalCenters: number;
  pendingCenters: number;
  totalApplications: number;
  totalServices: number;
}

interface PendingCenter {
  id: string;
  name: string;
  status: string;
  created_at: string;
  owner_email?: string;
}

export const AdminDashboard: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalCenters: 0,
    pendingCenters: 0,
    totalApplications: 0,
    totalServices: 0,
  });
  const [pendingList, setPendingList] = useState<PendingCenter[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/dashboard/admin');
      const data = response.data.data || {};
      
      setStats({
        totalCenters: data.totalCenters || 0,
        pendingCenters: data.pendingCenters || 0,
        totalApplications: data.totalApplications || 0,
        totalServices: data.totalServices || 0,
      });
      
      setPendingList(data.pendingCentersList || []);
    } catch (e: any) {
      toast.error('Failed to load global admin metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleApproveCenter = async (centerId: string) => {
    setActionLoading(centerId);
    try {
      await apiClient.patch(`/centers/${centerId}/approve`);
      toast.success('Center signup request approved.');
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to approve center.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectCenter = async (centerId: string) => {
    setActionLoading(centerId);
    try {
      await apiClient.patch(`/centers/${centerId}/reject`);
      toast.success('Center registration request rejected.');
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to reject center.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Platform Administration</h2>
          <p className="text-sm text-slate-400">Global SaaS overview and pending approvals</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDashboardData} className="flex gap-2 items-center">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Centers</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.totalCenters}</div>
            <p className="text-xs text-slate-500 mt-1">Active onboarding tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Approvals</span>
            <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.pendingCenters}</div>
            <p className="text-xs text-slate-500 mt-1">Centers waiting for review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Global Applications</span>
            <ClipboardList className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.totalApplications}</div>
            <p className="text-xs text-slate-500 mt-1">Total certificates processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Services catalog</span>
            <ShieldAlert className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.totalServices}</div>
            <p className="text-xs text-slate-500 mt-1">Active government modules</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Review Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingList.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
              All onboarding requests have been processed. No pending reviews.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Center Name</TableHead>
                  <TableHead>Onboarding Date</TableHead>
                  <TableHead>Verification Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingList.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold text-slate-200">{c.name}</TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="warning" className="capitalize">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-400 hover:bg-emerald-950/20"
                        onClick={() => handleApproveCenter(c.id)}
                        isLoading={actionLoading === c.id}
                      >
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:bg-red-950/20"
                        onClick={() => handleRejectCenter(c.id)}
                        isLoading={actionLoading === c.id}
                      >
                        <X className="w-4 h-4 mr-1" /> Reject
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
  );
};
