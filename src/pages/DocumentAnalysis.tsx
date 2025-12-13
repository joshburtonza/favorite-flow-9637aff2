import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Upload, Link, Loader2, Send, CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

const DocumentAnalysis = () => {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [sendToTelegram, setSendToTelegram] = useState(true);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [telegramSent, setTelegramSent] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocumentName(file.name);
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
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
      
      const content = await response.text();
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
    setTelegramSent(false);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: {
          documentContent,
          documentName,
          sendToTelegram,
        },
      });

      if (error) throw error;

      if (data.success) {
        setAnalysis(data.analysis);
        setTelegramSent(data.telegramSent);
        toast({
          title: 'Analysis complete',
          description: data.telegramSent 
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
    setTelegramSent(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Document Analysis</h1>
          <p className="text-muted-foreground">
            Upload documents for AI-powered analysis with Telegram notifications
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
                Upload a file or provide a URL to analyze
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Upload File</Label>
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
                    placeholder="https://example.com/document.txt"
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
                  placeholder="Paste document content here..."
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

              {/* Telegram Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Send to Telegram</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive analysis results via Telegram
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
                      Analyze Document
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
                  {telegramSent && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Sent to Telegram</span>
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
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
