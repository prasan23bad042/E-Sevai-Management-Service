import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { FormInput } from '../../components/forms/FormInput';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '../../app/toastProvider';
import { ShieldAlert, Edit2, RefreshCw } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface ServiceItem {
  id: string;
  name: string;
  government_fee: number;
  service_charge: number;
  sla_days: number;
  required_documents: string[];
}

const serviceConfigSchema = z.object({
  government_fee: z.coerce.number(),
  service_charge: z.coerce.number(),
  sla_days: z.coerce.number().int(),
});

type ConfigInputs = z.infer<typeof serviceConfigSchema>;

export const ServicesPage: React.FC = () => {
  const toast = useToast();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editService, setEditService] = useState<ServiceItem | null>(null);
  const [updating, setUpdating] = useState(false);

  const methods = useForm<ConfigInputs>();

  const loadServices = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/services');
      setServices(response.data.data || []);
    } catch (e: any) {
      toast.error('Failed to load services catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const startEditing = (service: ServiceItem) => {
    setEditService(service);
    methods.reset({
      government_fee: service.government_fee,
      service_charge: service.service_charge,
      sla_days: service.sla_days,
    });
  };

  const handleUpdateConfig = async (data: ConfigInputs) => {
    if (!editService) return;
    setUpdating(true);
    try {
      await apiClient.patch(`/services/${editService.id}`, data);
      toast.success('Service catalog configuration updated.');
      setEditService(null);
      loadServices();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update configuration.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Services Catalog</h2>
          <p className="text-sm text-slate-400">Configure global SLAs, government fees, and center charges</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadServices} className="flex gap-2 items-center">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-500" /> Active Government Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-slate-500">Loading catalog items...</div>
          ) : services.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-slate-500">
              No services registered in system catalog.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Government Fee</TableHead>
                  <TableHead>Service Charge</TableHead>
                  <TableHead>SLA Limit (Days)</TableHead>
                  <TableHead>Required Documents</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((srv) => (
                  <TableRow key={srv.id}>
                    <TableCell className="font-semibold text-slate-200">{srv.name}</TableCell>
                    <TableCell>₹{srv.government_fee}</TableCell>
                    <TableCell>₹{srv.service_charge}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-blue-400">{srv.sla_days} Days</span>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {srv.required_documents?.map((doc, idx) => (
                          <Badge key={idx} variant="secondary" className="capitalize text-[10px]">
                            {doc.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(srv)}
                        className="text-blue-400 hover:bg-blue-950/20"
                      >
                        <Edit2 className="w-4 h-4 mr-1" /> Configure
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Editing Dialog Modal overlay */}
      {editService && (
        <Dialog open={!!editService} onOpenChange={(open) => !open && setEditService(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Service: {editService.name}</DialogTitle>
            </DialogHeader>
            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(handleUpdateConfig)} className="space-y-4 mt-4">
                <FormInput
                  name="government_fee"
                  label="Government Fee (₹)"
                  placeholder="100"
                  type="number"
                />
                <FormInput
                  name="service_charge"
                  label="Service Center Charge (₹)"
                  placeholder="50"
                  type="number"
                />
                <FormInput
                  name="sla_days"
                  label="SLA Processing Threshold (Days)"
                  placeholder="15"
                  type="number"
                />
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setEditService(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={updating}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </FormProvider>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
