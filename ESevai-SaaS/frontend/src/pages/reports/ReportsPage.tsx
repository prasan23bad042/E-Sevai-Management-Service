import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../app/toastProvider';
import { Download, RefreshCw, BarChart2 } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface ReportRow {
  center_name: string;
  total_applications: number;
  revenue_collected: number;
  sla_breaches: number;
}

export const ReportsPage: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filters states
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [centerFilter, setCenterFilter] = useState('all');

  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);

  const loadFilterOptions = async () => {
    try {
      const response = await apiClient.get('/centers');
      setCenters((response.data.data || []).map((c: any) => ({ id: c.id, name: c.name })));
    } catch (e) {}
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const params: any = { startDate, endDate };
      if (centerFilter !== 'all') params.centerId = centerFilter;

      const response = await apiClient.get('/reports/revenue', { params });
      setReportRows(response.data.data || []);
    } catch (e: any) {
      toast.error('Failed to query aggregated reports data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [startDate, endDate, centerFilter]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params: any = { startDate, endDate, format: 'csv' };
      if (centerFilter !== 'all') params.centerId = centerFilter;

      // Request stream from backend
      const response = await apiClient.get('/reports/revenue', {
        params,
        responseType: 'blob', // receive stream binary
      });

      // Create download anchor mapping the stream
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `e_sevai_revenue_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Excel-compatible revenue report downloaded.');
    } catch (error: any) {
      toast.error('Export generation failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Revenue & SLA Analytics</h2>
          <p className="text-sm text-slate-400">Generate aggregated financial statements and operational reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadReportData} className="flex gap-2 items-center">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button
            onClick={handleExportCSV}
            isLoading={exporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex gap-2 items-center"
          >
            <Download className="w-4.5 h-4.5" /> Export CSV (Excel)
          </Button>
        </div>
      </div>

      {/* Filter panel options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 border border-slate-900 rounded-lg">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Center Filter</label>
          <select
            value={centerFilter}
            onChange={(e) => setCenterFilter(e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-slate-950">All Centers</option>
            {centers.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-950">{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table report preview list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-500" /> Aggregate Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-slate-500">Querying analytics database...</div>
          ) : reportRows.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg text-slate-500">
              No revenue records captured for the selected date range.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Center Name</TableHead>
                  <TableHead>Total Applications</TableHead>
                  <TableHead>Revenue Collected</TableHead>
                  <TableHead>SLA Breaches</TableHead>
                  <TableHead className="text-right">Performance Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-semibold text-slate-200">{row.center_name}</TableCell>
                    <TableCell>{row.total_applications}</TableCell>
                    <TableCell className="font-semibold">₹{row.revenue_collected.toLocaleString('en-IN')}</TableCell>
                    <TableCell className={row.sla_breaches > 0 ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                      {row.sla_breaches}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.sla_breaches === 0 ? (
                        <Badge variant="success">Excellent</Badge>
                      ) : row.sla_breaches < 3 ? (
                        <Badge variant="warning">Awaiting Action</Badge>
                      ) : (
                        <Badge variant="destructive">Critical Breach</Badge>
                      )}
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
