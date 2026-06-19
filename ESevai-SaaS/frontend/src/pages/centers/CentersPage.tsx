import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { FormInput } from '../../components/forms/FormInput';
import { FormTextarea } from '../../components/forms/FormTextarea';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../app/toastProvider';
import { Plus, RefreshCw } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface CenterItem {
  id: string;
  name: string;
  address: string;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
}

const registerCenterSchema = z.object({
  name: z.string().min(3, 'Center Name must be at least 3 characters long'),
  address: z.string().min(10, 'Address must be at least 10 characters long'),
  ownerName: z.string().min(3, 'Owner Name is required'),
  ownerEmail: z.string().email('Please enter a valid email address'),
  licenseNumber: z.string().min(5, 'License Number is required'),
});

type RegisterInputs = z.infer<typeof registerCenterSchema>;

export const CentersPage: React.FC = () => {
  const toast = useToast();
  const [centers, setCenters] = useState<CenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  const methods = useForm<RegisterInputs>({
    defaultValues: {
      name: '',
      address: '',
      ownerName: '',
      ownerEmail: '',
      licenseNumber: '',
    },
  });

  const loadCenters = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/centers');
      setCenters(response.data.data || []);
    } catch (e: any) {
      toast.error('Failed to load centers list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCenters();
  }, []);

  const handleRegister = async (data: RegisterInputs) => {
    setSubmitting(true);
    try {
      const parseResult = registerCenterSchema.safeParse(data);
      if (!parseResult.success) {
        parseResult.error.issues.forEach((err) => {
          methods.setError(err.path[0] as any, { message: err.message });
        });
        setSubmitting(false);
        return;
      }

      await apiClient.post('/centers/register', data);
      toast.success('Center registration request submitted successfully.');
      methods.reset();
      setActiveTab('list');
      loadCenters();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to submit registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success">Active</Badge>;
      case 'suspended': return <Badge variant="destructive">Suspended</Badge>;
      default: return <Badge variant="warning">Pending Approval</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Centers Directory</h2>
          <p className="text-sm text-slate-400">Onboard and manage center workspaces</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadCenters} className="flex gap-2 items-center">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="list" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">All Centers</TabsTrigger>
          <TabsTrigger value="register">Register Center</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Registered Center Workspaces</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-10 text-slate-500">Loading centers list...</div>
              ) : centers.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-slate-500">
                  No center workspaces registered yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Center Name</TableHead>
                      <TableHead>Location Address</TableHead>
                      <TableHead>Onboarding Status</TableHead>
                      <TableHead>Registered On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {centers.map((center) => (
                      <TableRow key={center.id}>
                        <TableCell className="font-semibold text-slate-200">{center.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{center.address}</TableCell>
                        <TableCell>{getStatusBadge(center.status)}</TableCell>
                        <TableCell>{new Date(center.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Onboard New Center Workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(handleRegister)} className="space-y-4 max-w-xl">
                  <FormInput
                    name="name"
                    label="Center Name"
                    placeholder="Salem E-Sevai Hub"
                  />
                  <FormTextarea
                    name="address"
                    label="Full Address"
                    placeholder="12, Cherry Road, Salem, Tamil Nadu - 636001"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      name="ownerName"
                      label="Owner / Contact Person Name"
                      placeholder="Arun Kumar"
                    />
                    <FormInput
                      name="ownerEmail"
                      label="Owner Email Address"
                      placeholder="owner@salemsevacenter.in"
                      type="email"
                    />
                  </div>
                  <FormInput
                    name="licenseNumber"
                    label="Center License Number"
                    placeholder="LIC-TN-SLM-9876"
                  />
                  <Button type="submit" className="flex items-center gap-2" isLoading={submitting}>
                    <Plus className="w-4 h-4" /> Submit Center Registration
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
