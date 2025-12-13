import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Upload, Link, Loader2, Send, CheckCircle, Database, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

interface StructuredData {
  documentType: string;
  summary: string;
  extractedData: Record<string, any>;
  bulkData?: Record<string, any>[];
  issues: string[];
  actionItems: string[];
  confidence: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  details?: any[];
}

const DocumentAnalysis = () => {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [sendToTelegram, setSendToTelegram] = useState(true);
  const [autoImport, setAutoImport] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [structuredData, setStructuredData] = useState<StructuredData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [telegramSent, setTelegramSent] = useState(false);

  const parseCSV = (text: string): string => {
    // Simple CSV to readable format conversion
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return text;
    
    const headers = lines[0].split(',').map(h => h.trim());
    let formatted = `CSV Data (${lines.length - 1} rows)\n\nColumns: ${headers.join(', ')}\n\n`;
    
    lines.slice(1, 51).forEach((line, idx) => {
      const values = line.split(',').map(v => v.trim());
      formatted += `Row ${idx + 1}:\n`;
      headers.forEach((header, i) => {
        formatted += `  ${header}: ${values[i] || 'N/A'}\n`;
      });
      formatted += '\n';
    });
    
    if (lines.length > 51) {
      formatted += `... and ${lines.length - 51} more rows\n`;
    }
    
    return formatted;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocumentName(file.name);
    const isCSV = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      let content = event.target?.result as string;
      
      // Format CSV for better readability
      if (isCSV) {
        content = parseCSV(content);
      }
      
      setDocumentContent(content);
      toast({
        title: 'File loaded',
        description: `${file.name} ready for analysis`,
      });
    };
    reader.onerror = () => {
      toast({
        title: 'Error',
        description: 'Failed to read file',
        variant: 'destructive',
      });
    };
    reader.readAsText(file);
  };

  const fetchDocumentFromUrl = async () => {
    if (!documentUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a document URL',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      const response = await fetch(documentUrl);
      if (!response.ok) throw new Error('Failed to fetch document');
      
      let content = await response.text();
      const isCSV = documentUrl.toLowerCase().endsWith('.csv');
      if (isCSV) {
        content = parseCSV(content);
      }
      
      setDocumentContent(content);
      setDocumentName(documentUrl.split('/').pop() || 'Document from URL');
      
      toast({
        title: 'Document fetched',
        description: 'Ready for analysis',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch document from URL',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeDocument = async () => {
    if (!documentContent) {
      toast({
        title: 'Error',
        description: 'Please upload a document or enter content to analyze',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setStructuredData(null);
    setImportResult(null);
    setTelegramSent(false);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: {
          documentContent,
          documentName,
          sendToTelegram,
          autoImport,
        },
      });

      if (error) throw error;

      if (data.success) {
        setAnalysis(data.analysis);
        setStructuredData(data.structuredData);
        setImportResult(data.importResult);
        setTelegramSent(data.telegramSent);
        toast({
          title: 'Analysis complete',
          description: data.importResult?.success 
            ? `${data.importResult.message}` 
            : data.telegramSent 
              ? 'Results sent to Telegram' 
              : 'Analysis ready',
        });
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to analyze document',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => {
    setDocumentUrl('');
    setDocumentContent('');
    setDocumentName('');
    setAnalysis(null);
    setStructuredData(null);
    setImportResult(null);
    setTelegramSent(false);
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-500/20 text-green-600">High Confidence</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-600">Medium Confidence</Badge>;
      default:
        return <Badge className="bg-red-500/20 text-red-600">Low Confidence</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Document Analysis</h1>
          <p className="text-muted-foreground">
            Upload invoices, BOLs, CSVs, or payment records for AI analysis and auto-import
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Document
              </CardTitle>
              <CardDescription>
                Upload invoices, BOLs, CSVs, or payment records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Upload File (CSV, TXT, JSON, XML)</Label>
                <Input
                  type="file"
                  accept=".txt,.csv,.json,.xml,.md"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <Label>Or fetch from URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/document.csv"
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    onClick={fetchDocumentFromUrl}
                    disabled={isAnalyzing || !documentUrl}
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Manual Content Input */}
              <div className="space-y-2">
                <Label>Or paste content directly</Label>
                <Textarea
                  placeholder="Paste invoice, BOL, or CSV content here..."
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  rows={6}
                />
              </div>

              {documentName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {documentName}
                </div>
              )}

              {/* Auto-Import Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-primary/5">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Auto-Import to Database
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create/update shipments, costs, and payments
                  </p>
                </div>
                <Switch
                  checked={autoImport}
                  onCheckedChange={setAutoImport}
                />
              </div>

              {/* Telegram Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Send to Telegram</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive analysis summary via Telegram
                  </p>
                </div>
                <Switch
                  checked={sendToTelegram}
                  onCheckedChange={setSendToTelegram}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={analyzeDocument}
                  disabled={isAnalyzing || !documentContent}
                  className="flex-1"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Analyze & {autoImport ? 'Import' : 'Review'}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Analysis Results
              </CardTitle>
              <CardDescription>
                AI-powered document analysis using DeepSeek
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis ? (
                <div className="space-y-4">
                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2">
                    {structuredData && getConfidenceBadge(structuredData.confidence)}
                    {structuredData && (
                      <Badge variant="outline" className="capitalize">
                        {structuredData.documentType}
                      </Badge>
                    )}
                    {telegramSent && (
                      <Badge className="bg-green-500/10 text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sent to Telegram
                      </Badge>
                    )}
                    {importResult?.success && (
                      <Badge className="bg-blue-500/10 text-blue-600">
                        <Database className="h-3 w-3 mr-1" />
                        {importResult.message}
                      </Badge>
                    )}
                  </div>

                  {/* Issues warning */}
                  {structuredData?.issues && structuredData.issues.length > 0 && (
                    <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">Issues Found:</p>
                        <ul className="list-disc list-inside mt-1">
                          {structuredData.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Analysis output */}
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm overflow-auto max-h-96">
                      {analysis}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span>Analyzing document...</span>
                    </div>
                  ) : (
                    <span>Upload a document to see analysis results</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default DocumentAnalysis;
