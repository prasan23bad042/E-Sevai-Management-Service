import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { DashboardSkeleton } from '../../components/ui/DashboardSkeleton';
import { useToast } from '../../app/toastProvider';
import { Users, ClipboardList, AlertCircle, CheckSquare, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import apiClient from '../../services/apiClient';

interface ManagerStats {
  staffCount: number;
  unassignedApps: number;
  pendingReviewsCount: number;
  slaBreachCount: number;
}

interface ReviewApp {
  id: string;
  application_number: string;
  citizen_name: string;
  service_name: string;
  sla_days_remaining: number;
  status: string;
}

export const ManagerDashboard: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ManagerStats>({
    staffCount: 0,
    unassignedApps: 0,
    pendingReviewsCount: 0,
    slaBreachCount: 0,
  });
  const [reviewList, setReviewList] = useState<ReviewApp[]>([]);

  const loadManagerData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/dashboard/manager');
      const data = response.data.data || {};
      
      setStats({
        staffCount: data.stats?.staffCount || 0,
        unassignedApps: data.stats?.unassignedApps || 0,
        pendingReviewsCount: data.stats?.pendingReviewsCount || 0,
        slaBreachCount: data.stats?.slaBreachCount || 0,
      });

      setReviewList(data.pendingReviewsList || []);
    } catch (e: any) {
      toast.error('Failed to load manager operations metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagerData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Operations Management</h2>
          <p className="text-sm text-slate-400">Distribute tasks, verify documentation checklists, and track SLAs</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadManagerData} className="flex gap-2 items-center">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Team Staff</span>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.staffCount}</div>
            <p className="text-xs text-slate-500 mt-1">Assigned operators in center</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Unassigned Queue</span>
            <CheckSquare className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.unassignedApps}</div>
            <p className="text-xs text-slate-500 mt-1">Applications awaiting staff match</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Reviews</span>
            <ClipboardList className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.pendingReviewsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Uploaded document reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">SLA Warnings</span>
            <AlertCircle className={cn('w-4 h-4 text-slate-500', stats.slaBreachCount > 0 && 'text-red-500 animate-bounce')} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats.slaBreachCount}</div>
            <p className="text-xs text-slate-500 mt-1">Applications exceeding thresholds</p>
          </CardContent>
        </Card>
      </div>

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents Verification Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewList.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-slate-500 text-sm">
              All applications checklists are verified. Clear queue.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App Number</TableHead>
                  <TableHead>Citizen</TableHead>
                  <TableHead>Service Name</TableHead>
                  <TableHead>SLA Timer</TableHead>
                  <TableHead>Verification Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewList.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold text-blue-400">{r.application_number}</TableCell>
                    <TableCell className="text-slate-200">{r.citizen_name}</TableCell>
                    <TableCell>{r.service_name}</TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded',
                        r.sla_days_remaining <= 2 ? 'bg-red-950/40 text-red-400 border border-red-800/20' : 'bg-slate-900 text-slate-400'
                      )}>
                        {r.sla_days_remaining} Days Left
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="primary" className="capitalize">{r.status}</Badge>
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
