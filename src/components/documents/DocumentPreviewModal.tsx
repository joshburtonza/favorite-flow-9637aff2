import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Ship, 
  User, 
  Calendar, 
  DollarSign, 
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  Bot,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  shipmentId?: string | null;
}

interface DocumentData {
  id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  document_type?: string;
  ai_classification?: string;
  ai_confidence?: number;
  lot_number?: string;
  supplier_name?: string;
  client_name?: string;
  summary?: string;
  extracted_data?: any;
  uploaded_at?: string;
  shipment_id?: string;
  status?: string;
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  supplier_invoice: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  client_invoice: 'bg-green-500/20 text-green-400 border-green-500/30',
  telex_release: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  packing_list: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  bill_of_lading: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  clearing_invoice: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  transport_invoice: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  payment_proof: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export function DocumentPreviewModal({ 
  open, 
  onOpenChange, 
  documentId,
  shipmentId 
}: DocumentPreviewModalProps) {
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && documentId) {
      fetchDocument(documentId);
    } else if (!open) {
      setDocument(null);
    }
  }, [open, documentId]);

  const fetchDocument = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDocument(data as DocumentData);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleViewShipment = () => {
    const targetId = document?.shipment_id || shipmentId;
    if (targetId) {
      onOpenChange(false);
      navigate(`/shipments/${targetId}`);
    }
  };

  const handleDownload = async () => {
    if (!document?.file_path) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const extractedData = document?.extracted_data as Record<string, any> | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate">{document?.file_name || 'Document Preview'}</p>
              {document?.ai_classification && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    'mt-1 text-xs capitalize',
                    CLASSIFICATION_COLORS[document.ai_classification] || ''
                  )}
                >
                  {document.ai_classification.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : document ? (
            <div className="p-6 space-y-6">
              {/* AI Confidence */}
              {document.ai_confidence && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Confidence:</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${document.ai_confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round(document.ai_confidence * 100)}%
                  </span>
                </div>
              )}

              {/* Summary */}
              {document.summary && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Summary</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-xl">{document.summary}</p>
                </div>
              )}

              {/* Key Information Grid */}
              <div className="grid grid-cols-2 gap-3">
                {document.lot_number && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Package className="h-3.5 w-3.5" />
                      LOT Number
                    </div>
                    <p className="font-medium">{document.lot_number}</p>
                  </div>
                )}
                {document.supplier_name && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <User className="h-3.5 w-3.5" />
                      Supplier
                    </div>
                    <p className="font-medium">{document.supplier_name}</p>
                  </div>
                )}
                {document.client_name && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <User className="h-3.5 w-3.5" />
                      Client
                    </div>
                    <p className="font-medium">{document.client_name}</p>
                  </div>
                )}
                {document.uploaded_at && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Uploaded
                    </div>
                    <p className="font-medium">
                      {format(new Date(document.uploaded_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {/* Extracted Data */}
              {extractedData && Object.keys(extractedData).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    AI Extracted Data
                  </h4>
                  <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                    {Object.entries(extractedData).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="font-medium text-right max-w-[60%] truncate">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File Details */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">File Details</h4>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium mt-0.5">{document.file_type || 'Unknown'}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium mt-0.5">{formatFileSize(document.file_size)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30 text-center">
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium mt-0.5 capitalize">{document.status || 'new'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Document not found</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t flex gap-2 justify-end">
          {(document?.shipment_id || shipmentId) && (
            <Button variant="outline" onClick={handleViewShipment}>
              <Ship className="h-4 w-4 mr-2" />
              View Shipment
            </Button>
          )}
          <Button variant="outline" onClick={handleDownload} disabled={!document?.file_path}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}