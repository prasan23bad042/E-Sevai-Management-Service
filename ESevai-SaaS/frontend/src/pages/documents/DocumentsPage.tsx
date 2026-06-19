import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FormFileUpload } from '../../components/forms/FormFileUpload';
import { useToast } from '../../app/toastProvider';
import { useAuthStore } from '../../store/authStore';
import { FileUp, Eye, FileText, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface DocumentItem {
  id: string;
  application_number: string;
  document_name: string;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  file_url?: string;
  application_id: string;
}

export const DocumentsPage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/documents/pending');
      setDocuments(response.data.data || []);
    } catch (e: any) {
      toast.error('Failed to load pending documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUploadFile = async (docId: string, appId: string, docType: string, file: File) => {
    setActionLoading(docId);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', docType);

      await apiClient.post(`/applications/${appId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded successfully.');
      loadDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to upload document.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (docId: string, status: 'verified' | 'rejected') => {
    setActionLoading(docId);
    try {
      await apiClient.patch(`/documents/${docId}/verify`, {
        status,
        rejectionReason: status === 'rejected' ? 'Submitted file blurry/invalid.' : '',
      });
      toast.success(`Document status updated to ${status}.`);
      setPreviewDoc(null);
      loadDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update document status.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Document Management</h2>
          <p className="text-sm text-slate-400">Upload checklist attachments and verify citizen certificates</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDocuments} className="flex gap-2 items-center">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table List View */}
        <Card className={previewDoc ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-indigo-500" /> Pending Attachments Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-slate-500">Loading document queues...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg text-slate-500">
                All document uploads are processed and verified.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App Number</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Verification Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-semibold text-blue-400">{doc.application_number}</TableCell>
                      <TableCell className="capitalize text-slate-200">{doc.document_name.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Badge variant={doc.status === 'verified' ? 'success' : doc.status === 'rejected' ? 'destructive' : 'primary'}>
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        {/* Operator upload action */}
                        {doc.status === 'pending' && (
                          <FormFileUpload
                            label=""
                            className="inline-block"
                            onFileSelect={(file) => handleUploadFile(doc.id, doc.application_id, doc.document_name, file)}
                          />
                        )}
                        {/* Manager preview action */}
                        {doc.status === 'uploaded' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewDoc(doc)}
                            className="text-blue-400 hover:bg-blue-950/20 animate-pulse"
                          >
                            <Eye className="w-4 h-4 mr-1" /> Review File
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Side Preview & Review Console split pane */}
        {previewDoc && (
          <Card className="lg:col-span-1 border-blue-500/30 bg-slate-950/90 shadow-xl flex flex-col justify-between h-fit animate-fade-in">
            <CardHeader className="border-b border-slate-900">
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-400">Document Reviewer</CardTitle>
              <p className="text-base font-bold text-slate-200 mt-1">{previewDoc.application_number}</p>
              <p className="text-xs text-slate-500 capitalize">{previewDoc.document_name.replace('_', ' ')}</p>
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-6">
              {/* Document representation layout */}
              <div className="border border-slate-800 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-900/40 text-slate-400 min-h-48">
                <FileText className="w-12 h-12 text-blue-500 mb-2.5" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Aadhaar Card Attachment</p>
                <p className="text-[10px] text-slate-500 mt-1">Verified signature encryption loaded</p>
              </div>

              {/* Approval controls */}
              {user?.role !== 'staff' && (
                <div className="flex gap-3 mt-2">
                  <Button
                    variant="primary"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleVerify(previewDoc.id, 'verified')}
                    isLoading={actionLoading === previewDoc.id}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Verify
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleVerify(previewDoc.id, 'rejected')}
                    isLoading={actionLoading === previewDoc.id}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject
                  </Button>
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
