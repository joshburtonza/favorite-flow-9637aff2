import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, FilePlus, Upload, X, FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface DuplicateMatch {
  type: 'exact_filename' | 'similar_filename' | 'invoice_number_match' | 'data_match' | 'file_hash_match';
  confidence: number;
  document: {
    id: string;
    file_name: string;
    uploaded_at: string;
    uploaded_by: string | null;
    ai_extracted_data: Record<string, unknown> | null;
    folder_id: string | null;
  };
  reason: string;
}

interface DuplicateDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: DuplicateMatch[];
  newFile: File;
  newFileData?: Record<string, unknown>;
  onReplace: (existingDocId: string) => void;
  onUploadAsVersion: (existingDocId: string) => void;
  onUploadAnyway: () => void;
  loading?: boolean;
}

export function DuplicateDetectionModal({
  isOpen,
  onClose,
  duplicates,
  newFile,
  newFileData,
  onReplace,
  onUploadAsVersion,
  onUploadAnyway,
  loading = false,
}: DuplicateDetectionModalProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.95) return 'destructive';
    if (confidence >= 0.8) return 'default';
    return 'secondary';
  };

  const getTypeLabel = (type: DuplicateMatch['type']) => {
    const labels: Record<DuplicateMatch['type'], string> = {
      exact_filename: 'Exact Filename',
      similar_filename: 'Similar Filename',
      invoice_number_match: 'Invoice Number Match',
      data_match: 'Data Match',
      file_hash_match: 'Identical File',
    };
    return labels[type];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Potential Duplicate Detected
          </DialogTitle>
          <DialogDescription>
            This file appears to be similar to {duplicates.length} existing document{duplicates.length > 1 ? 's' : ''}.
            Please choose how to proceed.
          </DialogDescription>
        </DialogHeader>

        {/* New File Info */}
        <Card className="bg-muted/50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">New File: </span>
              <span>{newFile.name}</span>
              <Badge variant="outline">{(newFile.size / 1024).toFixed(1)} KB</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Duplicate Matches */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Matching Documents:</h4>
          
          {duplicates.map((dup, index) => (
            <Card 
              key={dup.document.id}
              className={`cursor-pointer transition-colors ${
                selectedAction === dup.document.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedAction(dup.document.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{dup.document.file_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Uploaded {format(new Date(dup.document.uploaded_at), 'PPp')}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={getConfidenceColor(dup.confidence)}>
                      {(dup.confidence * 100).toFixed(0)}% match
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(dup.type)}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">{dup.reason}</p>
                
                {/* Comparison Grid */}
                {dup.document.ai_extracted_data && newFileData && (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="font-medium mb-1">Existing Document</p>
                      {Object.entries(dup.document.ai_extracted_data).slice(0, 4).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground">{key}: </span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="font-medium mb-1">New Upload</p>
                      {Object.entries(newFileData).slice(0, 4).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground">{key}: </span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Actions for this duplicate */}
                {selectedAction === dup.document.id && (
                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => onReplace(dup.document.id)}
                      disabled={loading}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Replace Existing
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => onUploadAsVersion(dup.document.id)}
                      disabled={loading}
                    >
                      <FilePlus className="h-4 w-4 mr-1" />
                      Upload as New Version
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onUploadAnyway}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Anyway (Ignore Warning)
          </Button>
          <Button 
            variant="ghost" 
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
