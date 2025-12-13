import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCreateShipment } from '@/hooks/useShipments';
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, ArrowLeft, ArrowRight, Check, AlertCircle, Loader2, Download, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

type ImportType = 'shipments' | 'suppliers' | 'clients' | 'generic';
type Step = 'type' | 'upload' | 'map' | 'preview' | 'complete';

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  [csvColumn: string]: string;
}

const SHIPMENT_FIELDS = [
  { key: 'lot_number', label: 'LOT Number', required: true },
  { key: 'supplier_name', label: 'Supplier Name', required: false },
  { key: 'client_name', label: 'Client Name', required: false },
  { key: 'commodity', label: 'Commodity', required: false },
  { key: 'eta', label: 'ETA', required: false },
  { key: 'document_submitted', label: 'Document Submitted', required: false },
  { key: 'telex_released', label: 'Telex Released', required: false },
  { key: 'delivery_date', label: 'Delivery Date', required: false },
];

const SUPPLIER_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'currency', label: 'Currency', required: false },
  { key: 'contact_person', label: 'Contact Person', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Phone', required: false },
];

const CLIENT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'contact_person', label: 'Contact Person', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'address', label: 'Address', required: false },
];

export default function ImportData() {
  const [step, setStep] = useState<Step>('type');
  const [importType, setImportType] = useState<ImportType>('shipments');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] }>({ success: 0, errors: [] });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const { data: existingSuppliers } = useSuppliers();
  const { data: existingClients } = useClients();
  const createShipment = useCreateShipment();
  const createSupplier = useCreateSupplier();
  const createClient = useCreateClient();

  const getFields = () => {
    switch (importType) {
      case 'shipments': return SHIPMENT_FIELDS;
      case 'suppliers': return SUPPLIER_FIELDS;
      case 'clients': return CLIENT_FIELDS;
      case 'generic': return [];
      default: return SHIPMENT_FIELDS;
    }
  };

  const fields = getFields();

  const parseCSV = (text: string): { headers: string[]; data: ParsedRow[] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: ParsedRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return { headers, data };
  };

  const parseExcel = (buffer: ArrayBuffer): { headers: string[]; data: ParsedRow[] } => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
    
    if (jsonData.length === 0) return { headers: [], data: [] };
    
    const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
    const data = jsonData.slice(1).map(row => {
      const parsedRow: ParsedRow = {};
      headers.forEach((header, index) => {
        parsedRow[header] = String((row as string[])[index] || '').trim();
      });
      return parsedRow;
    }).filter(row => Object.values(row).some(v => v)); // Filter out empty rows
    
    return { headers, data };
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const isCSV = uploadedFile.name.endsWith('.csv');
    const isExcel = uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls');

    if (!isCSV && !isExcel) {
      toast.error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    setFile(uploadedFile);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      let headers: string[] = [];
      let data: ParsedRow[] = [];

      if (isCSV) {
        const result = parseCSV(event.target?.result as string);
        headers = result.headers;
        data = result.data;
      } else {
        const result = parseExcel(event.target?.result as ArrayBuffer);
        headers = result.headers;
        data = result.data;
      }

      setCsvHeaders(headers);
      setCsvData(data);

      // Auto-map columns with matching names (only for predefined types)
      if (importType !== 'generic') {
        const autoMapping: ColumnMapping = {};
        headers.forEach(header => {
          const matchingField = fields.find(f => 
            f.label.toLowerCase() === header.toLowerCase() ||
            f.key.toLowerCase() === header.toLowerCase().replace(/\s+/g, '_')
          );
          if (matchingField) {
            autoMapping[header] = matchingField.key;
          }
        });
        setColumnMapping(autoMapping);
      }
    };

    if (isCSV) {
      reader.readAsText(uploadedFile);
    } else {
      reader.readAsArrayBuffer(uploadedFile);
    }
  }, [fields, importType]);

  const downloadTemplate = () => {
    const templateData = [fields.map(f => f.label)];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${importType}_import_template.xlsx`);
    toast.success('Template downloaded');
  };

  const analyzeWithAI = async () => {
    if (csvData.length === 0) return;

    setAnalyzing(true);
    try {
      // Convert CSV data to text format for AI analysis
      const csvText = [
        csvHeaders.join(','),
        ...csvData.slice(0, 50).map(row => csvHeaders.map(h => row[h] || '').join(','))
      ].join('\n');

      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: { 
          text: csvText,
          fileName: file?.name || 'data.csv'
        }
      });

      if (error) throw error;

      setAnalysisResult(data);
      toast.success('AI analysis complete');
    } catch (err: any) {
      console.error('AI analysis error:', err);
      toast.error('Failed to analyze with AI');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImport = async () => {
    // Generic import doesn't actually import - it's just for viewing/analyzing
    if (importType === 'generic') {
      toast.info('Generic import is view-only. Use AI analysis to extract data.');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    const results = { success: 0, errors: [] as string[] };

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        setImportProgress(Math.round(((i + 1) / csvData.length) * 100));

        try {
          if (importType === 'shipments') {
            const lotNumber = Object.entries(columnMapping).find(([, v]) => v === 'lot_number')?.[0];
            const supplierName = Object.entries(columnMapping).find(([, v]) => v === 'supplier_name')?.[0];
            const clientName = Object.entries(columnMapping).find(([, v]) => v === 'client_name')?.[0];
            const commodityCol = Object.entries(columnMapping).find(([, v]) => v === 'commodity')?.[0];
            const etaCol = Object.entries(columnMapping).find(([, v]) => v === 'eta')?.[0];

            if (!lotNumber || !row[lotNumber]) {
              results.errors.push(`Row ${i + 1}: Missing LOT number`);
              continue;
            }

            let supplierId: string | undefined;
            if (supplierName && row[supplierName]) {
              const existingSupplier = existingSuppliers?.find(s => 
                s.name.toLowerCase() === row[supplierName].toLowerCase()
              );
              if (existingSupplier) {
                supplierId = existingSupplier.id;
              } else {
                const newSupplier = await createSupplier.mutateAsync({ name: row[supplierName], currency: 'USD' });
                supplierId = newSupplier.id;
              }
            }

            let clientId: string | undefined;
            if (clientName && row[clientName]) {
              const existingClient = existingClients?.find(c => 
                c.name.toLowerCase() === row[clientName].toLowerCase()
              );
              if (existingClient) {
                clientId = existingClient.id;
              } else {
                const newClient = await createClient.mutateAsync({ name: row[clientName] });
                clientId = newClient.id;
              }
            }

            await createShipment.mutateAsync({
              lot_number: row[lotNumber],
              supplier_id: supplierId,
              client_id: clientId,
              commodity: commodityCol ? row[commodityCol] : undefined,
              eta: etaCol && row[etaCol] ? row[etaCol] : undefined,
            });

            results.success++;
          } else if (importType === 'suppliers') {
            const nameCol = Object.entries(columnMapping).find(([, v]) => v === 'name')?.[0];
            
            if (!nameCol || !row[nameCol]) {
              results.errors.push(`Row ${i + 1}: Missing name`);
              continue;
            }

            const currencyCol = Object.entries(columnMapping).find(([, v]) => v === 'currency')?.[0];
            const contactCol = Object.entries(columnMapping).find(([, v]) => v === 'contact_person')?.[0];
            const emailCol = Object.entries(columnMapping).find(([, v]) => v === 'email')?.[0];
            const phoneCol = Object.entries(columnMapping).find(([, v]) => v === 'phone')?.[0];

            await createSupplier.mutateAsync({
              name: row[nameCol],
              currency: currencyCol && row[currencyCol] ? row[currencyCol] as 'USD' | 'EUR' | 'ZAR' : 'USD',
              contact_person: contactCol ? row[contactCol] : undefined,
              email: emailCol ? row[emailCol] : undefined,
              phone: phoneCol ? row[phoneCol] : undefined,
            });

            results.success++;
          } else if (importType === 'clients') {
            const nameCol = Object.entries(columnMapping).find(([, v]) => v === 'name')?.[0];
            
            if (!nameCol || !row[nameCol]) {
              results.errors.push(`Row ${i + 1}: Missing name`);
              continue;
            }

            const contactCol = Object.entries(columnMapping).find(([, v]) => v === 'contact_person')?.[0];
            const emailCol = Object.entries(columnMapping).find(([, v]) => v === 'email')?.[0];
            const phoneCol = Object.entries(columnMapping).find(([, v]) => v === 'phone')?.[0];
            const addressCol = Object.entries(columnMapping).find(([, v]) => v === 'address')?.[0];

            await createClient.mutateAsync({
              name: row[nameCol],
              contact_person: contactCol ? row[contactCol] : undefined,
              email: emailCol ? row[emailCol] : undefined,
              phone: phoneCol ? row[phoneCol] : undefined,
              address: addressCol ? row[addressCol] : undefined,
            });

            results.success++;
          }
        } catch (err: any) {
          results.errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }
    } finally {
      setImporting(false);
      setImportResults(results);
      setStep('complete');
    }
  };

  const resetImport = () => {
    setStep('type');
    setFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    setColumnMapping({});
    setImportProgress(0);
    setImportResults({ success: 0, errors: [] });
    setAnalysisResult(null);
  };

  const stepProgress = {
    type: 25,
    upload: 50,
    map: 75,
    preview: 90,
    complete: 100,
  };

  const isGeneric = importType === 'generic';

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Data</h1>
          <p className="text-muted-foreground">Import shipments and data from CSV or Excel files</p>
        </div>

        <Progress value={stepProgress[step]} className="h-2" />

        {step === 'type' && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Select Import Type</CardTitle>
              <CardDescription>Choose what type of data you want to import</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="generic" id="generic" />
                  <Label htmlFor="generic" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <p className="font-medium">Any CSV / Excel File</p>
                    </div>
                    <p className="text-sm text-muted-foreground">View any CSV data and analyze with AI</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="shipments" id="shipments" />
                  <Label htmlFor="shipments" className="flex-1 cursor-pointer">
                    <p className="font-medium">Shipment Schedule</p>
                    <p className="text-sm text-muted-foreground">Import LOT numbers, suppliers, clients, ETA dates</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="suppliers" id="suppliers" />
                  <Label htmlFor="suppliers" className="flex-1 cursor-pointer">
                    <p className="font-medium">Suppliers</p>
                    <p className="text-sm text-muted-foreground">Import supplier names, currency, and contact details</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="clients" id="clients" />
                  <Label htmlFor="clients" className="flex-1 cursor-pointer">
                    <p className="font-medium">Clients</p>
                    <p className="text-sm text-muted-foreground">Import client names and contact details</p>
                  </Label>
                </div>
              </RadioGroup>

              <div className="flex justify-between">
                {!isGeneric && (
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                )}
                {isGeneric && <div />}
                <Button onClick={() => setStep('upload')}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Upload File</CardTitle>
              <CardDescription>
                {isGeneric 
                  ? 'Upload any CSV or Excel file to view and analyze'
                  : `Upload a CSV or Excel file with your ${importType} data`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileSpreadsheet className="h-10 w-10 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{csvData.length} rows found</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="font-medium mb-1">Click to upload or drag and drop</p>
                      <p className="text-sm text-muted-foreground">CSV or Excel files (.csv, .xlsx, .xls)</p>
                    </>
                  )}
                </label>
              </div>

              {!isGeneric && (
                <Alert>
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertDescription>
                    Need a template? Go back and click "Download Template" to get started.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('type')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(isGeneric ? 'preview' : 'map')} 
                  disabled={!file || csvData.length === 0}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'map' && !isGeneric && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Map Columns</CardTitle>
              <CardDescription>Match your CSV columns to system fields</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {csvHeaders.map((header) => (
                  <div key={header} className="flex items-center gap-4">
                    <div className="w-48 text-sm font-medium truncate">{header}</div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Select
                      value={columnMapping[header] || ''}
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [header]: value }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Skip --</SelectItem>
                        {fields.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label} {field.required && '*'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep('preview')}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'preview' && (
          <Card>
            <CardHeader>
              <CardTitle>
                {isGeneric ? 'Step 3: View Data' : 'Step 4: Preview & Import'}
              </CardTitle>
              <CardDescription>
                {isGeneric 
                  ? 'View your data and optionally analyze with AI'
                  : 'Review the first 10 rows before importing'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isGeneric && (
                <div className="flex gap-2 mb-4">
                  <Button 
                    onClick={analyzeWithAI} 
                    disabled={analyzing}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {analyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                  </Button>
                </div>
              )}

              {analysisResult && (
                <Alert className="mb-4">
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">AI Analysis Result:</p>
                      {analysisResult.documentType && (
                        <p><strong>Document Type:</strong> {analysisResult.documentType}</p>
                      )}
                      {analysisResult.lotNumber && (
                        <p><strong>LOT Number:</strong> {analysisResult.lotNumber}</p>
                      )}
                      {analysisResult.supplierName && (
                        <p><strong>Supplier:</strong> {analysisResult.supplierName}</p>
                      )}
                      {analysisResult.clientName && (
                        <p><strong>Client:</strong> {analysisResult.clientName}</p>
                      )}
                      {analysisResult.totalAmount && (
                        <p><strong>Total Amount:</strong> {analysisResult.currency} {analysisResult.totalAmount}</p>
                      )}
                      {analysisResult.summary && (
                        <p className="text-sm text-muted-foreground mt-2">{analysisResult.summary}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isGeneric ? (
                        csvHeaders.map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))
                      ) : (
                        Object.entries(columnMapping).filter(([, v]) => v).map(([csvCol, fieldKey]) => (
                          <TableHead key={csvCol}>
                            {fields.find(f => f.key === fieldKey)?.label || fieldKey}
                          </TableHead>
                        ))
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        {isGeneric ? (
                          csvHeaders.map((header) => (
                            <TableCell key={header}>{row[header] || '-'}</TableCell>
                          ))
                        ) : (
                          Object.entries(columnMapping).filter(([, v]) => v).map(([csvCol]) => (
                            <TableCell key={csvCol}>{row[csvCol] || '-'}</TableCell>
                          ))
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {csvData.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing 10 of {csvData.length} rows
                </p>
              )}

              {!isGeneric && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will import {csvData.length} records. New suppliers and clients will be created automatically if they don't exist.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(isGeneric ? 'upload' : 'map')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                {isGeneric ? (
                  <Button variant="outline" onClick={resetImport}>
                    Import Another File
                  </Button>
                ) : (
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing... {importProgress}%
                      </>
                    ) : (
                      <>
                        Import {csvData.length} Records
                        <Check className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'complete' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-6 w-6 text-success" />
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-success/10 text-success rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{importResults.success}</p>
                <p>records imported successfully</p>
              </div>

              {importResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">{importResults.errors.length} errors occurred:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {importResults.errors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {importResults.errors.length > 5 && (
                        <li>...and {importResults.errors.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={resetImport}>
                  Import More
                </Button>
                <Button onClick={() => window.location.href = '/'}>
                  View Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
