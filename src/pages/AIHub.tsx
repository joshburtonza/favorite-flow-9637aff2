import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, Upload, Loader2, Send, CheckCircle, Database, AlertTriangle, 
  Image, ScanLine, MessageSquare, Bot, User, Sparkles, X, FileSpreadsheet,
  Package, DollarSign, Ship, Search, ArrowRight, Clock, TrendingUp, Wand2
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
  const [searchQuery, setSearchQuery] = useState('');
  
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
        return <span className="trend-badge trend-up">High Confidence</span>;
      case 'medium':
        return <span className="trend-badge trend-warn">Medium Confidence</span>;
      default:
        return <span className="trend-badge trend-danger">Low Confidence</span>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slide-in">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Control Tower</p>
            <h1 className="text-3xl font-semibold gradient-text">AI Data Entry</h1>
          </div>
          <div className="search-glass w-full md:w-80">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search HBL, Container or Client..." 
              className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* Stats Grid */}
        <div className="bento-grid">
          {/* Auto-Import Toggle Card */}
          <div className="glass-card" style={{ animationDelay: '0.1s' }}>
            <div className="card-label">
              <Database className="h-4 w-4 text-accent" />
              Auto-Import
            </div>
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-sm text-muted-foreground">Auto-create records</p>
              </div>
              <Switch checked={autoImport} onCheckedChange={setAutoImport} />
            </div>
          </div>

          {/* Active Analysis Card */}
          <div className="glass-card" style={{ animationDelay: '0.2s' }}>
            <div className="card-label">
              <Sparkles className="h-4 w-4 text-primary" />
              Files Ready
            </div>
            <div className="big-number">{uploadedFiles.length}</div>
            <span className="trend-badge trend-up">Ready for analysis</span>
          </div>

          {/* Upload Area - Wide Card */}
          <div className="glass-card card-wide" style={{ animationDelay: '0.3s' }}>
            <div className="card-label">
              <Upload className="h-4 w-4 text-accent" />
              Drop Files Here
            </div>
            
            <div className="border-2 border-dashed border-glass-border rounded-2xl p-8 text-center hover:border-primary/50 transition-all mt-4 relative">
              <input
                type="file"
                accept=".txt,.csv,.json,.xml,.md,.xlsx,.xls,image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload"
                multiple
                disabled={isOcrProcessing || isAnalyzing}
              />
              
              {isOcrProcessing ? (
                <div className="space-y-3">
                  <ScanLine className="h-10 w-10 text-primary mx-auto animate-pulse" />
                  <p className="font-medium">Extracting text... {ocrProgress}%</p>
                  <Progress value={ocrProgress} className="h-1.5 max-w-xs mx-auto" />
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3 animate-float" />
                  <p className="font-medium">Click or drop up to 10 files</p>
                  <p className="text-sm text-muted-foreground">CSV, Excel, images, invoices, BOLs</p>
                </>
              )}
            </div>

            {/* File Pills */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {uploadedFiles.map((f, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                    style={{
                      background: 'hsl(0 0% 100% / 0.05)',
                      border: '1px solid hsl(0 0% 100% / 0.1)',
                    }}
                  >
                    {f.type === 'csv' ? (
                      <FileSpreadsheet className="h-3 w-3 text-accent" />
                    ) : f.type === 'image' ? (
                      <Image className="h-3 w-3 text-primary" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                    <span className="max-w-24 truncate">{f.name}</span>
                    <button 
                      onClick={() => removeFile(idx)} 
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Tasks */}
          <div className="glass-card" style={{ animationDelay: '0.4s' }}>
            <div className="card-label">
              <Clock className="h-4 w-4 text-warning" />
              Mode
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 px-3 rounded-xl text-sm transition-all ${
                  activeTab === 'upload' 
                    ? 'bg-primary/20 text-foreground border border-primary/30' 
                    : 'bg-glass-surface text-muted-foreground'
                }`}
              >
                <Upload className="h-4 w-4 mx-auto mb-1" />
                Upload
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 px-3 rounded-xl text-sm transition-all ${
                  activeTab === 'chat' 
                    ? 'bg-primary/20 text-foreground border border-primary/30' 
                    : 'bg-glass-surface text-muted-foreground'
                }`}
              >
                <MessageSquare className="h-4 w-4 mx-auto mb-1" />
                Chat
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {activeTab === 'upload' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Analyze Button */}
            <div className="glass-card">
              <div className="card-label">
                <Wand2 className="h-4 w-4 text-primary" />
                AI Analysis
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                AI will extract data from your files and auto-create records
              </p>
              <Button
                onClick={analyzeUploads}
                disabled={isAnalyzing || uploadedFiles.length === 0}
                className="w-full h-12 rounded-xl text-base"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(239 84% 50%))',
                }}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analyze & Import
                  </>
                )}
              </Button>
            </div>

            {/* Results Card */}
            <div className="glass-card">
              <div className="card-label">
                <Database className="h-4 w-4 text-accent" />
                Analysis Results
              </div>
              
              {currentAnalysis ? (
                <div className="space-y-4 mt-4">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {getConfidenceBadge(currentAnalysis.confidence)}
                    <Badge variant="outline" className="capitalize border-glass-border">
                      {currentAnalysis.documentType.replace('-', ' ')}
                    </Badge>
                    {importResult?.success && (
                      <span className="trend-badge trend-up">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Imported
                      </span>
                    )}
                  </div>

                  {/* Key Data Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {currentAnalysis.lotNumber && (
                      <div className="p-3 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }}>
                        <p className="text-xs text-muted-foreground">LOT Number</p>
                        <p className="font-medium">{currentAnalysis.lotNumber}</p>
                      </div>
                    )}
                    {currentAnalysis.supplierName && (
                      <div className="p-3 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }}>
                        <p className="text-xs text-muted-foreground">Supplier</p>
                        <p className="font-medium">{currentAnalysis.supplierName}</p>
                      </div>
                    )}
                    {currentAnalysis.totalAmount && (
                      <div className="p-3 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }}>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="font-medium">
                          {currentAnalysis.currency} {currentAnalysis.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {currentAnalysis.clientName && (
                      <div className="p-3 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }}>
                        <p className="text-xs text-muted-foreground">Client</p>
                        <p className="font-medium">{currentAnalysis.clientName}</p>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="p-4 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.02)' }}>
                    <p className="text-sm">{currentAnalysis.summary}</p>
                  </div>

                  {/* Issues */}
                  {currentAnalysis.issues?.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-xl trend-warn">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">Issues Found:</p>
                        <ul className="list-disc list-inside text-xs mt-1">
                          {currentAnalysis.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Created Records */}
                  {importResult?.createdRecords && (
                    <div className="flex items-start gap-2 p-3 rounded-xl trend-up">
                      <Package className="h-4 w-4 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">Records Created:</p>
                        <p className="text-xs mt-1">{formatCreatedRecords(importResult.createdRecords)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Upload and analyze documents</p>
                    <p className="text-sm text-muted-foreground/70">Records auto-created</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Chat Mode */
          <div className="glass-card" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            <div className="card-label border-b border-glass-border pb-4 mb-4">
              <Bot className="h-4 w-4 text-primary" />
              Chat with AI
              <span className="text-muted-foreground ml-2 normal-case tracking-normal">
                Describe shipments, paste data — AI extracts and creates records
              </span>
            </div>
            
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="font-medium text-lg">Start a conversation</p>
                    <p className="text-sm mt-2 max-w-md mx-auto">
                      Try: "New shipment LOT 900 from WINTEX to MJ, ETA Jan 15"
                    </p>
                  </div>
                )}
                
                {chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.role === 'assistant' && (
                      <div 
                        className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'hsl(var(--primary) / 0.2)' }}
                      >
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      <div 
                        className="rounded-2xl p-4"
                        style={{
                          background: msg.role === 'user' 
                            ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(239 84% 50%))'
                            : 'hsl(0 0% 100% / 0.05)',
                        }}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      
                      {msg.analysis && (
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs border-glass-border">
                            {msg.analysis.documentType}
                          </Badge>
                          {msg.analysis.lotNumber && (
                            <Badge variant="outline" className="text-xs border-glass-border">
                              LOT: {msg.analysis.lotNumber}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {msg.importResult?.success && (
                        <span className="trend-badge trend-up text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {formatCreatedRecords(msg.importResult.createdRecords)}
                        </span>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div 
                        className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'hsl(0 0% 100% / 0.1)' }}
                      >
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isAnalyzing && (
                  <div className="flex gap-3">
                    <div 
                      className="h-8 w-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'hsl(var(--primary) / 0.2)' }}
                    >
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    </div>
                    <div 
                      className="rounded-2xl p-4"
                      style={{ background: 'hsl(0 0% 100% / 0.05)' }}
                    >
                      <p className="text-sm text-muted-foreground">Analyzing and creating records...</p>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            
            <div className="pt-4 border-t border-glass-border mt-4">
              <div className="flex gap-3">
                <Textarea
                  placeholder="Describe a shipment, paste invoice data..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                  className="min-h-[60px] resize-none rounded-xl bg-glass-surface border-glass-border"
                  disabled={isAnalyzing}
                />
                <Button 
                  onClick={sendChatMessage} 
                  disabled={isAnalyzing || !chatInput.trim()}
                  className="h-auto px-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(239 84% 50%))',
                  }}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating AI Button */}
      <div className="ai-fab" onClick={() => setActiveTab('chat')}>
        <Wand2 className="h-6 w-6" />
      </div>
    </AppLayout>
  );
};

export default AIHub;
