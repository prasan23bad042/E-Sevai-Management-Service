import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNotificationStore } from '../../store/notificationStore';
import { useToast } from '../../app/toastProvider';
import { Bell, Trash2, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';

export const NotificationsPage: React.FC = () => {
  const toast = useToast();
  const { notifications, loading, fetchNotifications, markAsRead, markAllAsRead, softDelete } = useNotificationStore();
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/15 border-red-500/30 text-red-400';
      case 'high': return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
      case 'medium': return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
      default: return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  const filteredAlerts = notifications.filter(n => {
    const priorityMatch = priorityFilter === 'all' || n.priority === priorityFilter;
    const categoryMatch = categoryFilter === 'all' || n.category === categoryFilter;
    return priorityMatch && categoryMatch;
  });

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    toast.success('All notifications marked as read.');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Notifications Feed</h2>
          <p className="text-sm text-slate-400">View logs of active alerts, assignment notices, and payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchNotifications} className="flex gap-2 items-center">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-blue-400 hover:bg-blue-950/20 flex gap-1 items-center">
            <CheckCircle className="w-4 h-4" /> Read All
          </Button>
        </div>
      </div>

      {/* Filter panel options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 border border-slate-900 rounded-lg">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Priority Level</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-slate-950">All Priorities</option>
            <option value="critical" className="bg-slate-950">Critical</option>
            <option value="high" className="bg-slate-950">High</option>
            <option value="medium" className="bg-slate-950">Medium</option>
            <option value="low" className="bg-slate-950">Low</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category Topic</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-slate-950">All Categories</option>
            <option value="application" className="bg-slate-950">Application</option>
            <option value="document" className="bg-slate-950">Document Checklist</option>
            <option value="payment" className="bg-slate-950">Payment Billings</option>
            <option value="staff" className="bg-slate-950">Staff Directory</option>
            <option value="system" className="bg-slate-950">System Logs</option>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-500" /> Notifications Feed Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-slate-500">Loading notifications feed...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg text-slate-500">
              No notifications matching current search criteria.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredAlerts.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read_at && markAsRead(n.id)}
                  className={cn(
                    'p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all',
                    n.read_at
                      ? 'bg-slate-950/20 border-slate-900 text-slate-400'
                      : 'bg-slate-900/40 border-slate-800 text-slate-100 hover:border-slate-700'
                  )}
                >
                  <div className="flex-1 flex gap-3 items-start">
                    <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border mt-0.5 shrink-0', getPriorityColor(n.priority))}>
                      {n.priority}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{n.message}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="capitalize text-slate-400">Category: {n.category}</span>
                        <span>•</span>
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center justify-end shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-950/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        softDelete(n.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
