import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useDuplicateDetection } from '@/hooks/useDuplicateDetection';
import { DuplicateDetectionModal } from './DuplicateDetectionModal';
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2, 
  Link2, Package, AlertTriangle, Trash2, FolderUp,
  Sparkles, Brain, Zap, ArrowRight, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'checking_duplicates' | 'uploading' | 'classifying' | 'linking' | 'completed' | 'failed' | 'skipped';
  progress: number;
  error?: string;
  classification?: {
    document_type: string;
    confidence: number;
    lot_number?: string;
    supplier_name?: string;
    client_name?: string;
  };
  linkedShipment?: {
    id: string;
    lot_number: string;
  };
  documentId?: string;
  duplicateInfo?: {
    count: number;
    highestConfidence: number;
  };
}

interface BulkDocumentUploadProps {
  onComplete?: (results: UploadFile[]) => void;
  folderId?: string;
}

export function BulkDocumentUpload({ onComplete, folderId }: BulkDocumentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoLink, setAutoLink] = useState(true);
  const [autoClassify, setAutoClassify] = useState(true);
  const [checkDuplicates, setCheckDuplicates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Duplicate detection state
  const { checkForDuplicates, duplicates, clearDuplicates, loading: duplicateLoading, replaceExisting, uploadAsNewVersion } = useDuplicateDetection();
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [currentDuplicateFile, setCurrentDuplicateFile] = useState<UploadFile | null>(null);

  const updateFile = useCallback((id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  // Handle file selection
  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const uploadFiles: UploadFile[] = fileArray.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending',
      progress: 0
    }));
    setFiles(prev => [...prev, ...uploadFiles]);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Remove file from queue
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Clear all files
  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  // Read file content for AI classification
  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        // For images, just pass the filename for classification
        if (file.type.startsWith('image/')) {
          resolve(`[Image file: ${file.name}]`);
        } else {
          resolve(content);
        }
      };
      reader.onerror = reject;
      
      if (file.type.startsWith('image/')) {
        // For images, we'll rely on filename for classification
        resolve(`[Image file: ${file.name}]`);
      } else {
        reader.readAsText(file);
      }
    });
  };

  // Process a single file
  const processFile = async (uploadFile: UploadFile): Promise<UploadFile> => {
    const { id, file } = uploadFile;
    
    try {
      // Step 0: Check for duplicates
      if (checkDuplicates) {
        updateFile(id, { status: 'checking_duplicates', progress: 5 });
        
        const foundDuplicates = await checkForDuplicates(file);
        
        if (foundDuplicates.length > 0) {
          const highestConfidence = Math.max(...foundDuplicates.map(d => d.confidence));
          
          // If exact match (100% confidence), skip automatically
          if (highestConfidence === 1.0) {
            updateFile(id, { 
              status: 'skipped', 
              progress: 0, 
              error: `Duplicate detected: ${foundDuplicates[0].reason}`,
              duplicateInfo: { count: foundDuplicates.length, highestConfidence }
            });
            toast.warning(`Skipped ${file.name}: Duplicate file detected`);
            return { ...uploadFile, status: 'skipped', error: 'Duplicate file' };
          }
          
          // For lower confidence matches, flag but continue
          updateFile(id, { 
            duplicateInfo: { count: foundDuplicates.length, highestConfidence } 
          });
        }
      }
      
      // Step 1: Upload to storage
      updateFile(id, { status: 'uploading', progress: 10 });
      
      const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      updateFile(id, { progress: 30 });
      
      // Step 2: Create document record
      const { data: docData, error: docError } = await supabase
        .from('uploaded_documents')
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          folder_id: folderId || null,
          status: 'new'
        })
        .select()
        .single();
      
      if (docError) throw docError;
      updateFile(id, { documentId: docData.id, progress: 50 });
      
      let classification: UploadFile['classification'] = undefined;
      let linkedShipment: UploadFile['linkedShipment'] = undefined;
      
      // Step 3: AI Classification
      if (autoClassify) {
        updateFile(id, { status: 'classifying', progress: 60 });
        
        try {
          const content = await readFileContent(file);
          
          const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-intelligence', {
            body: {
              action: 'classify_document',
              documentContent: content,
              documentId: docData.id,
              documentName: file.name
            }
          });
          
          if (!aiError && aiResult?.success) {
            classification = {
              document_type: aiResult.result.document_type,
              confidence: aiResult.result.confidence,
              lot_number: aiResult.result.extracted_data?.lot_number,
              supplier_name: aiResult.result.extracted_data?.supplier_name,
              client_name: aiResult.result.extracted_data?.client_name
            };
            
            if (aiResult.result.linked_shipment) {
              linkedShipment = aiResult.result.linked_shipment;
            }
            
            updateFile(id, { classification, progress: 80 });
          }
        } catch (aiErr) {
          console.error('AI classification error:', aiErr);
          // Continue without classification
        }
      }
      
      // Step 4: Manual linking attempt if no auto-link happened
      if (autoLink && !linkedShipment && classification?.lot_number) {
        updateFile(id, { status: 'linking', progress: 90 });
        
        const { data: shipment } = await supabase
          .from('shipments')
          .select('id, lot_number')
          .or(`lot_number.ilike.%${classification.lot_number}%,lot_number.eq.${classification.lot_number}`)
          .limit(1)
          .single();
        
        if (shipment) {
          await supabase
            .from('uploaded_documents')
            .update({ 
              shipment_id: shipment.id, 
              auto_linked: true 
            })
            .eq('id', docData.id);
          
          linkedShipment = shipment;
        }
      }
      
      updateFile(id, { 
        status: 'completed', 
        progress: 100, 
        classification,
        linkedShipment 
      });
      
      return { ...uploadFile, status: 'completed', classification, linkedShipment };
      
    } catch (error: any) {
      console.error('File processing error:', error);
      updateFile(id, { 
        status: 'failed', 
        progress: 0, 
        error: error.message || 'Upload failed' 
      });
      return { ...uploadFile, status: 'failed', error: error.message };
    }
  };

  // Process all files
  const processAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;
    
    setIsProcessing(true);
    
    // Process files in batches of 3 for better performance
    const batchSize = 3;
    const results: UploadFile[] = [];
    
    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batch = pendingFiles.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processFile));
      results.push(...batchResults);
    }
    
    setIsProcessing(false);
    
    // Invalidate queries to refresh document lists
    queryClient.invalidateQueries({ queryKey: ['uploaded-documents'] });
    queryClient.invalidateQueries({ queryKey: ['ai-events'] });
    
    const successCount = results.filter(r => r.status === 'completed').length;
    const linkedCount = results.filter(r => r.linkedShipment).length;
    
    toast.success(
      `Processed ${successCount}/${results.length} documents${linkedCount > 0 ? `, ${linkedCount} auto-linked` : ''}`,
      { duration: 5000 }
    );
    
    onComplete?.(results);
  };

  // Get status icon
  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending': return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'checking_duplicates': return <Copy className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'uploading': return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'classifying': return <Brain className="h-4 w-4 text-accent animate-pulse" />;
      case 'linking': return <Link2 className="h-4 w-4 text-primary animate-pulse" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'skipped': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Get status label
  const getStatusLabel = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'checking_duplicates': return 'Checking duplicates...';
      case 'uploading': return 'Uploading...';
      case 'classifying': return 'AI Classifying...';
      case 'linking': return 'Linking to Shipment...';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'skipped': return 'Skipped (Duplicate)';
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const failedCount = files.filter(f => f.status === 'failed').length;
  const skippedCount = files.filter(f => f.status === 'skipped').length;
  const linkedCount = files.filter(f => f.linkedShipment).length;

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300",
          isDragging 
            ? "border-primary bg-primary/10 scale-[1.02]" 
            : "border-border/50 hover:border-primary/50 hover:bg-primary/5",
          isProcessing && "pointer-events-none opacity-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "h-16 w-16 rounded-2xl flex items-center justify-center transition-all",
            isDragging 
              ? "bg-primary/20 scale-110" 
              : "bg-gradient-to-br from-primary/20 to-accent/20"
          )}>
            <FolderUp className={cn(
              "h-8 w-8 transition-all",
              isDragging ? "text-primary" : "text-primary/70"
            )} />
          </div>
          
          <div>
            <p className="font-semibold text-lg">
              {isDragging ? "Drop files here" : "Drag & drop documents"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse • PDF, Excel, CSV, Images supported
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-accent" />
            <span>AI will automatically classify and link to shipments</span>
          </div>
        </div>
      </div>

      {/* Options */}
      {files.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-glass-surface border border-glass-border">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-classify"
                checked={autoClassify}
                onCheckedChange={setAutoClassify}
                disabled={isProcessing}
              />
              <Label htmlFor="auto-classify" className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-accent" />
                AI Classification
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="auto-link"
                checked={autoLink}
                onCheckedChange={setAutoLink}
                disabled={isProcessing}
              />
              <Label htmlFor="auto-link" className="text-sm flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                Auto-link Shipments
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="check-duplicates"
                checked={checkDuplicates}
                onCheckedChange={setCheckDuplicates}
                disabled={isProcessing}
              />
              <Label htmlFor="check-duplicates" className="text-sm flex items-center gap-2">
                <Copy className="h-4 w-4 text-yellow-500" />
                Block Duplicates
              </Label>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
            
            <Button
              onClick={processAllFiles}
              disabled={isProcessing || pendingCount === 0}
              className="bg-gradient-to-r from-primary to-accent"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Process {pendingCount} File{pendingCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-glass-surface border border-glass-border">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{files.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="text-xs text-green-400">Completed</div>
            <div className="text-2xl font-bold text-green-400">{completedCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <div className="text-xs text-primary">Linked</div>
            <div className="text-2xl font-bold text-primary">{linkedCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="text-xs text-destructive">Failed</div>
            <div className="text-2xl font-bold text-destructive">{failedCount}</div>
          </div>
          {skippedCount > 0 && (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="text-xs text-yellow-500">Skipped</div>
              <div className="text-2xl font-bold text-yellow-500">{skippedCount}</div>
            </div>
          )}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  uploadFile.status === 'completed' 
                    ? "bg-green-500/5 border-green-500/20" 
                    : uploadFile.status === 'failed'
                    ? "bg-destructive/5 border-destructive/20"
                    : uploadFile.status === 'skipped'
                    ? "bg-yellow-500/5 border-yellow-500/20"
                    : "bg-glass-surface border-glass-border"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {getStatusIcon(uploadFile.status)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{uploadFile.file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(uploadFile.file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      {['checking_duplicates', 'uploading', 'classifying', 'linking'].includes(uploadFile.status) && (
                        <div className="mt-2">
                          <Progress value={uploadFile.progress} className="h-1" />
                          <span className="text-xs text-muted-foreground mt-1">
                            {getStatusLabel(uploadFile.status)}
                          </span>
                        </div>
                      )}
                      
                      {/* Classification result */}
                      {uploadFile.classification && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30">
                            {uploadFile.classification.document_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(uploadFile.classification.confidence * 100)}% confidence
                          </span>
                          
                          {uploadFile.classification.lot_number && (
                            <Badge variant="outline" className="text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              LOT {uploadFile.classification.lot_number}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Linked shipment */}
                      {uploadFile.linkedShipment && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-green-400">
                          <Link2 className="h-4 w-4" />
                          <span>Linked to LOT {uploadFile.linkedShipment.lot_number}</span>
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      )}
                      
                      {/* Error message */}
                      {uploadFile.error && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <span>{uploadFile.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Remove button for pending files */}
                  {uploadFile.status === 'pending' && !isProcessing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(uploadFile.id)}
                      className="h-8 w-8"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
