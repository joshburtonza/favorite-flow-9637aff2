import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, Upload, Loader2, Send, CheckCircle, Database, AlertTriangle, 
  Image, ScanLine, MessageSquare, Bot, User, Sparkles, X, FileSpreadsheet,
  Package, DollarSign, Ship
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';

interface StructuredData {
  documentType: string;
  summary: string;
  extractedData: Record<string, any>;
  bulkData?: Record<string, any>[];
  issues: string[];
  actionItems: string[];
  confidence: string;
  lotNumber?: string;
  supplierName?: string;
  clientName?: string;
  totalAmount?: number;
  currency?: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  details?: any[];
  createdRecords?: {
    shipments?: number;
    costs?: number;
    payments?: number;
    suppliers?: number;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  analysis?: StructuredData;
  importResult?: ImportResult;
}

interface FileUpload {
  file: File;
  name: string;
  content: string;
  type: 'text' | 'csv' | 'image';
  preview?: string;
}

const AIHub = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'upload' | 'chat'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [autoImport, setAutoImport] = useState(true);
  const [sendToTelegram, setSendToTelegram] = useState(false);
  
  // Upload mode state
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<StructuredData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  // Chat mode state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const parseCSV = (text: string): string => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return text;
    
    const headers = lines[0].split(',').map(h => h.trim());
    let formatted = `CSV Data (${lines.length - 1} rows)\n\nColumns: ${headers.join(', ')}\n\n`;
    
    lines.slice(1, 21).forEach((line, idx) => {
      const values = line.split(',').map(v => v.trim());
      formatted += `Row ${idx + 1}: `;
      headers.forEach((header, i) => {
        formatted += `${header}=${values[i] || 'N/A'}, `;
      });
      formatted += '\n';
    });
    
    if (lines.length > 21) {
      formatted += `... and ${lines.length - 21} more rows\n`;
    }
    
    return formatted;
  };

  const parseExcel = (buffer: ArrayBuffer, fileName: string): string => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
    
    if (jsonData.length === 0) return '';
    
    const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
    let formatted = `Excel Data from ${fileName} (${jsonData.length - 1} rows)\n\nColumns: ${headers.join(', ')}\n\n`;
    
    jsonData.slice(1, 21).forEach((row, idx) => {
      formatted += `Row ${idx + 1}: `;
      headers.forEach((header, i) => {
        formatted += `${header}=${(row as string[])[i] || 'N/A'}, `;
      });
      formatted += '\n';
    });
    
    if (jsonData.length > 21) {
      formatted += `... and ${jsonData.length - 21} more rows\n`;
    }
    
    return formatted;
  };

  const performOCR = async (file: File): Promise<string> => {
    setIsOcrProcessing(true);
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      return result.data.text;
    } finally {
      setIsOcrProcessing(false);
      setOcrProgress(0);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newUploads: FileUpload[] = [];

    for (const file of Array.from(files).slice(0, 10)) {
      const isImage = file.type.startsWith('image/');
      const isCSV = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      if (isImage) {
        const preview = URL.createObjectURL(file);
        toast({ title: 'Processing image...', description: 'Extracting text with OCR' });
        
        try {
          const content = await performOCR(file);
          newUploads.push({ file, name: file.name, content, type: 'image', preview });
        } catch (error) {
          toast({ title: 'OCR Error', description: `Failed to process ${file.name}`, variant: 'destructive' });
        }
      } else if (isExcel) {
        const buffer = await file.arrayBuffer();
        const content = parseExcel(buffer, file.name);
        newUploads.push({ file, name: file.name, content, type: 'csv' });
      } else {
        const text = await file.text();
        const content = isCSV ? parseCSV(text) : text;
        newUploads.push({ file, name: file.name, content, type: isCSV ? 'csv' : 'text' });
      }
    }

    setUploadedFiles(prev => [...prev, ...newUploads].slice(0, 10));
    toast({ title: 'Files loaded', description: `${newUploads.length} file(s) ready for analysis` });
    
    // Reset input
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeUploads = async () => {
    if (uploadedFiles.length === 0) {
      toast({ title: 'No files', description: 'Please upload files to analyze', variant: 'destructive' });
      return;
    }

    setIsAnalyzing(true);
    setCurrentAnalysis(null);
    setImportResult(null);

    try {
      const combinedContent = uploadedFiles
        .map(f => `=== ${f.name} ===\n${f.content}`)
        .join('\n\n');

      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: {
          documentContent: combinedContent,
          documentName: uploadedFiles.map(f => f.name).join(', '),
          sendToTelegram,
          autoImport,
        },
      });

      if (error) throw error;

      if (data.success) {
        setCurrentAnalysis(data.structuredData);
        setImportResult(data.importResult);
        
        toast({
          title: 'Analysis complete',
          description: data.importResult?.success 
            ? `Created: ${formatCreatedRecords(data.importResult.createdRecords)}`
            : 'Document analyzed successfully',
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCreatedRecords = (records?: ImportResult['createdRecords']) => {
    if (!records) return 'No records created';
    const parts = [];
    if (records.shipments) parts.push(`${records.shipments} shipment(s)`);
    if (records.costs) parts.push(`${records.costs} cost record(s)`);
    if (records.payments) parts.push(`${records.payments} payment(s)`);
    if (records.suppliers) parts.push(`${records.suppliers} supplier(s)`);
    return parts.length > 0 ? parts.join(', ') : 'Processing complete';
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: {
          documentContent: chatInput,
          documentName: 'Chat input',
          sendToTelegram: false,
          autoImport,
          isChatMode: true,
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.analysis || data.structuredData?.summary || 'I analyzed your input.',
        timestamp: new Date(),
        analysis: data.structuredData,
        importResult: data.importResult,
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      if (data.importResult?.success) {
        toast({
          title: 'Records created',
          description: formatCreatedRecords(data.importResult.createdRecords),
        });
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-success/20 text-success">High Confidence</Badge>;
      case 'medium':
        return <Badge className="bg-warning/20 text-warning">Medium Confidence</Badge>;
      default:
        return <Badge className="bg-destructive/20 text-destructive">Low Confidence</Badge>;
    }
  };

  const getDocTypeBadge = (type: string) => {
    const icons: Record<string, any> = {
      'supplier-invoice': DollarSign,
      'freight-invoice': Ship,
      'bol': FileText,
      'client-invoice': DollarSign,
      'csv': FileSpreadsheet,
    };
    const Icon = icons[type] || FileText;
    return (
      <Badge variant="outline" className="capitalize flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {type.replace('-', ' ')}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Data Entry</h1>
            <p className="text-muted-foreground">
              Upload documents or describe data — AI extracts and creates records automatically
            </p>
          </div>
        </div>

        {/* Auto-Import Toggle - Always visible */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Auto-Create Records</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically create shipments, costs, and payments from analyzed data
                  </p>
                </div>
              </div>
              <Switch checked={autoImport} onCheckedChange={setAutoImport} />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'chat')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Documents
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat Entry
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Upload Area */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Files
                  </CardTitle>
                  <CardDescription>
                    Drop invoices, BOLs, CSVs, Excel files, or images (up to 10)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept=".txt,.csv,.json,.xml,.md,.xlsx,.xls,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      multiple
                      disabled={isOcrProcessing || isAnalyzing}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {isOcrProcessing ? (
                        <div className="space-y-2">
                          <ScanLine className="h-10 w-10 text-primary mx-auto animate-pulse" />
                          <p className="font-medium">Extracting text... {ocrProgress}%</p>
                          <Progress value={ocrProgress} className="h-2 max-w-xs mx-auto" />
                        </div>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                          <p className="font-medium">Click to upload or drag files</p>
                          <p className="text-sm text-muted-foreground">
                            CSV, Excel, images, text files
                          </p>
                        </>
                      )}
                    </label>
                  </div>

                  {/* File List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label>Uploaded Files ({uploadedFiles.length}/10)</Label>
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {uploadedFiles.map((f, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                          >
                            {f.type === 'image' && f.preview ? (
                              <img src={f.preview} alt="" className="h-8 w-8 object-cover rounded" />
                            ) : f.type === 'csv' ? (
                              <FileSpreadsheet className="h-5 w-5 text-primary" />
                            ) : (
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className="flex-1 truncate">{f.name}</span>
                            <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-destructive">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={analyzeUploads}
                    disabled={isAnalyzing || uploadedFiles.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing & Creating Records...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analyze & {autoImport ? 'Auto-Import' : 'Review'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Results Area */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentAnalysis ? (
                    <div className="space-y-4">
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2">
                        {getConfidenceBadge(currentAnalysis.confidence)}
                        {getDocTypeBadge(currentAnalysis.documentType)}
                        {importResult?.success && (
                          <Badge className="bg-success/10 text-success flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {importResult.message}
                          </Badge>
                        )}
                      </div>

                      {/* Extracted Key Data */}
                      <div className="grid grid-cols-2 gap-3">
                        {currentAnalysis.lotNumber && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">LOT Number</p>
                            <p className="font-medium">{currentAnalysis.lotNumber}</p>
                          </div>
                        )}
                        {currentAnalysis.supplierName && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Supplier</p>
                            <p className="font-medium">{currentAnalysis.supplierName}</p>
                          </div>
                        )}
                        {currentAnalysis.totalAmount && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Amount</p>
                            <p className="font-medium">
                              {currentAnalysis.currency} {currentAnalysis.totalAmount.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {currentAnalysis.clientName && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Client</p>
                            <p className="font-medium">{currentAnalysis.clientName}</p>
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-sm">{currentAnalysis.summary}</p>
                      </div>

                      {/* Issues */}
                      {currentAnalysis.issues?.length > 0 && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning">
                          <AlertTriangle className="h-4 w-4 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium">Issues Found:</p>
                            <ul className="list-disc list-inside">
                              {currentAnalysis.issues.map((issue, i) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Created Records Summary */}
                      {importResult?.createdRecords && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 text-success">
                          <Package className="h-4 w-4 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium">Records Created:</p>
                            <p>{formatCreatedRecords(importResult.createdRecords)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Upload documents to see AI analysis</p>
                        <p className="text-sm">Records will be created automatically</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Chat with AI
                </CardTitle>
                <CardDescription>
                  Describe shipments, costs, or paste invoice data — AI will extract and create records
                </CardDescription>
              </CardHeader>
              
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="font-medium">Start a conversation</p>
                      <p className="text-sm mt-2">Try: "New shipment LOT 900 from WINTEX to MJ, ETA Jan 15"</p>
                      <p className="text-sm">Or paste invoice details directly</p>
                    </div>
                  )}
                  
                  {chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                        <div 
                          className={`rounded-lg p-3 ${
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        
                        {msg.analysis && (
                          <div className="flex flex-wrap gap-1">
                            {getDocTypeBadge(msg.analysis.documentType)}
                            {msg.analysis.lotNumber && (
                              <Badge variant="outline">LOT: {msg.analysis.lotNumber}</Badge>
                            )}
                          </div>
                        )}
                        
                        {msg.importResult?.success && (
                          <Badge className="bg-success/10 text-success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {formatCreatedRecords(msg.importResult.createdRecords)}
                          </Badge>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isAnalyzing && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-sm text-muted-foreground">Analyzing and creating records...</p>
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Describe a shipment, paste invoice data, or ask about costs..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage();
                      }
                    }}
                    className="min-h-[60px] resize-none"
                    disabled={isAnalyzing}
                  />
                  <Button 
                    onClick={sendChatMessage} 
                    disabled={isAnalyzing || !chatInput.trim()}
                    size="icon"
                    className="h-auto"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AIHub;
