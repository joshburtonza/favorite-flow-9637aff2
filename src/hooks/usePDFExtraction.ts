import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExtractedTableData {
  headers: string[];
  rows: string[][];
  fileName: string;
  confidence?: string;
  documentType?: string;
  summary?: string;
}

interface PDFExtractionResult {
  success: boolean;
  data?: ExtractedTableData;
  error?: string;
}

export function usePDFExtraction() {
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);

  const extractPDFToTable = async (file: File): Promise<PDFExtractionResult> => {
    try {
      // Read file content
      const content = await readFileContent(file);
      
      // Call AI to extract structured data
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: {
          documentContent: content,
          documentName: file.name,
          extractAsTable: true,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Extraction failed');

      const result = data.result;
      
      // Convert extracted data to table format
      const tableData = convertToTableFormat(result, file.name);
      
      return {
        success: true,
        data: tableData
      };
    } catch (error: any) {
      console.error('PDF extraction error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  const extractMultiplePDFs = async (files: File[]): Promise<ExtractedTableData[]> => {
    setIsExtracting(true);
    const results: ExtractedTableData[] = [];
    
    try {
      for (const file of files) {
        const result = await extractPDFToTable(file);
        if (result.success && result.data) {
          results.push(result.data);
        } else {
          toast({
            title: `Failed to extract ${file.name}`,
            description: result.error,
            variant: 'destructive'
          });
        }
      }
      
      if (results.length > 0) {
        toast({
          title: 'PDF Extraction Complete',
          description: `Extracted data from ${results.length} file(s)`
        });
      }
      
      return results;
    } finally {
      setIsExtracting(false);
    }
  };

  return {
    extractPDFToTable,
    extractMultiplePDFs,
    isExtracting
  };
}

async function readFileContent(file: File): Promise<string> {
  // For text-based files
  if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
    return await file.text();
  }
  
  // For PDFs and other binary files, we'll send base64
  // The edge function will handle OCR/extraction
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Convert to base64 for PDF processing
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return `[PDF_BASE64]${btoa(binary)}`;
}

function convertToTableFormat(result: any, fileName: string): ExtractedTableData {
  const cleanFileName = fileName.replace(/\.(pdf|PDF)$/i, '');
  
  // Check if we have bulk data (multiple rows)
  if (result.bulkData && Array.isArray(result.bulkData) && result.bulkData.length > 0) {
    // Get all unique keys from bulk data
    const allKeys = new Set<string>();
    result.bulkData.forEach((item: any) => {
      Object.keys(item).forEach(key => {
        if (item[key] !== null && item[key] !== undefined) {
          allKeys.add(key);
        }
      });
    });
    
    const headers = Array.from(allKeys).map(key => formatHeader(key));
    const rows = result.bulkData.map((item: any) => 
      Array.from(allKeys).map(key => String(item[key] ?? ''))
    );
    
    return {
      headers,
      rows,
      fileName: cleanFileName,
      confidence: result.confidence,
      documentType: result.documentType,
      summary: result.summary
    };
  }
  
  // Single document - extract data as a single row table
  const extractedData = result.extractedData || {};
  const entries = Object.entries(extractedData).filter(
    ([_, value]) => value !== null && value !== undefined && value !== ''
  );
  
  if (entries.length === 0) {
    // No structured data, create a summary table
    return {
      headers: ['Field', 'Value'],
      rows: [
        ['Document Type', result.documentType || 'Unknown'],
        ['Summary', result.summary || 'No summary available'],
        ['Confidence', result.confidence || 'N/A']
      ],
      fileName: cleanFileName,
      confidence: result.confidence,
      documentType: result.documentType,
      summary: result.summary
    };
  }
  
  const headers = entries.map(([key]) => formatHeader(key));
  const rows = [entries.map(([_, value]) => String(value))];
  
  return {
    headers,
    rows,
    fileName: cleanFileName,
    confidence: result.confidence,
    documentType: result.documentType,
    summary: result.summary
  };
}

function formatHeader(key: string): string {
  // Convert camelCase/snake_case to Title Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
