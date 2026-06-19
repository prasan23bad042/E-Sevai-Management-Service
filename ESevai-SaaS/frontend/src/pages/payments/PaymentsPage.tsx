import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { FormInput } from '../../components/forms/FormInput';
import { FormSelect } from '../../components/forms/FormSelect';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../app/toastProvider';
import { Landmark, Receipt, PlusCircle, CheckCircle, RefreshCw, Printer } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface PaymentItem {
  id: string;
  application_number: string;
  citizen_name: string;
  amount: number;
  payment_method: 'cash' | 'upi';
  collected_by_name: string;
  created_at: string;
}

const collectPaymentSchema = z.object({
  applicationNumber: z.string().min(5, 'Valid Application Number is required'),
  paymentMethod: z.enum(['cash', 'upi']),
  cashReceived: z.string().optional(),
});

type CollectInputs = z.infer<typeof collectPaymentSchema>;

export const PaymentsPage: React.FC = () => {
  const toast = useToast();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [cashReturn, setCashReturn] = useState<number | null>(null);

  // Summary Metrics states
  const [summary, setSummary] = useState({
    totalCollected: 0,
    cashCount: 0,
    upiCount: 0,
  });

  const methods = useForm<CollectInputs>({
    defaultValues: {
      applicationNumber: '',
      paymentMethod: 'cash',
      cashReceived: '0',
    },
  });

  const watchPaymentMethod = methods.watch('paymentMethod');
  const watchCashReceived = methods.watch('cashReceived');

  const loadPayments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/payments');
      const list: PaymentItem[] = response.data.data || [];
      setPayments(list);

      // Compute statistics summary
      const total = list.reduce((acc, curr) => acc + curr.amount, 0);
      const cash = list.filter(p => p.payment_method === 'cash').length;
      const upi = list.filter(p => p.payment_method === 'upi').length;
      setSummary({ totalCollected: total, cashCount: cash, upiCount: upi });
    } catch (e: any) {
      toast.error('Failed to load transaction ledgers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // Recalculate cash drawers balance refunds
  useEffect(() => {
    if (watchPaymentMethod === 'cash' && watchCashReceived) {
      const received = parseFloat(watchCashReceived) || 0;
      // Fixed invoice total of ₹150 for template calculations
      const diff = received - 150;
      setCashReturn(diff >= 0 ? diff : 0);
    } else {
      setCashReturn(null);
    }
  }, [watchCashReceived, watchPaymentMethod]);

  const handleCollect = async (data: CollectInputs) => {
    setSubmitting(true);
    try {
      const payload: any = {
        applicationNumber: data.applicationNumber,
        paymentMethod: data.paymentMethod,
        amount: 150, // standard income certificate fee
      };

      if (data.paymentMethod === 'cash') {
        payload.cashReceived = parseFloat(data.cashReceived || '0');
        payload.balanceReturned = cashReturn || 0;
      }

      await apiClient.post('/payments/collect', payload);
      toast.success('Billing collections processed successfully.');
      methods.reset();
      setActiveTab('list');
      loadPayments();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to process payments billing.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReceipt = (paymentId: string) => {
    // Print/trigger invoice PDF streams link
    const receiptUrl = `${apiClient.defaults.baseURL}/payments/${paymentId}/receipt`;
    window.open(receiptUrl, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Revenue Management</h2>
          <p className="text-sm text-slate-400">Collect citizen service fees, print receipts, and reconcile cash boxes</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPayments} className="flex gap-2 items-center">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Summary Widget Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Reconciled Cash Box</span>
            <Landmark className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">₹{summary.totalCollected.toLocaleString('en-IN')}</div>
            <p className="text-xs text-slate-500 mt-1">Aggregated center revenue collections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cash Collections</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{summary.cashCount}</div>
            <p className="text-xs text-slate-500 mt-1">Transactions recorded in cash ledger</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">UPI Transactions</span>
            <CheckCircle className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{summary.upiCount}</div>
            <p className="text-xs text-slate-500 mt-1">Simulated online UPI registrations</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Revenue Ledger</TabsTrigger>
          <TabsTrigger value="collect">Collect Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Transactions Registry History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-10 text-slate-500">Loading ledger data...</div>
              ) : payments.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-slate-500">
                  No transaction payments captured yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>App Number</TableHead>
                      <TableHead>Citizen Name</TableHead>
                      <TableHead>Amount Collected</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Collected By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-semibold text-blue-400">{p.application_number}</TableCell>
                        <TableCell className="text-slate-200">{p.citizen_name}</TableCell>
                        <TableCell className="font-semibold">₹{p.amount}</TableCell>
                        <TableCell>
                          <Badge variant={p.payment_method === 'cash' ? 'primary' : 'success'} className="uppercase">
                            {p.payment_method}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.collected_by_name}</TableCell>
                        <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadReceipt(p.id)}
                            className="text-emerald-400 hover:bg-emerald-950/20"
                          >
                            <Printer className="w-4 h-4 mr-1" /> Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collect">
          <Card>
            <CardHeader>
              <CardTitle>Record Billing Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(handleCollect)} className="space-y-4 max-w-lg">
                  <FormInput
                    name="applicationNumber"
                    label="Target Application Number"
                    placeholder="APP-2026-000001"
                  />
                  
                  {/* Fixed Fee display context */}
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-lg flex flex-col gap-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Service Fee Breakdowns</p>
                    <div className="flex justify-between text-xs">
                      <span>Government Fee:</span>
                      <span className="font-semibold">₹100.00</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Service Center Fee:</span>
                      <span className="font-semibold">₹50.00</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-slate-800 pt-2 font-bold text-slate-200">
                      <span>Total Amount Due:</span>
                      <span>₹150.00</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormSelect
                      name="paymentMethod"
                      label="Payment Method"
                      options={[
                        { value: 'cash', label: 'Cash Collection (Offline)' },
                        { value: 'upi', label: 'UPI QR Transaction' },
                      ]}
                    />
                    
                    {watchPaymentMethod === 'cash' && (
                      <FormInput
                        name="cashReceived"
                        label="Received Cash Drawer Amount (₹)"
                        placeholder="200"
                        type="number"
                      />
                    )}
                  </div>

                  {watchPaymentMethod === 'cash' && cashReturn !== null && (
                    <div className="bg-amber-950/20 border border-amber-800/20 p-3.5 rounded-lg flex justify-between items-center">
                      <span className="text-xs font-semibold text-amber-300">Balance to Return to Citizen:</span>
                      <span className="text-base font-bold text-amber-400">₹{cashReturn.toFixed(2)}</span>
                    </div>
                  )}

                  <Button type="submit" className="flex items-center gap-2" isLoading={submitting}>
                    <PlusCircle className="w-4 h-4" /> Finalize Collection Transactions
                  </Button>
                </form>
              </FormProvider>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
