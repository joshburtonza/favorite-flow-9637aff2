import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bot, Check, AlertTriangle, Edit2 } from 'lucide-react';

interface AIExtractionConfirmationProps {
  documentId: string;
  documentType: string;
  extractedData: Record<string, unknown>;
  confidence: number;
  onConfirm: (correctedData: Record<string, unknown>) => void;
  onCancel: () => void;
  loading?: boolean;
}

// Format field names for display
function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export function AIExtractionConfirmation({
  documentId,
  documentType,
  extractedData,
  confidence,
  onConfirm,
  onCancel,
  loading = false,
}: AIExtractionConfirmationProps) {
  const [editedData, setEditedData] = useState<Record<string, string>>({});
  const [corrections, setCorrections] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Initialize edited data from extracted data
    const initial: Record<string, string> = {};
    for (const [key, value] of Object.entries(extractedData)) {
      initial[key] = String(value || '');
    }
    setEditedData(initial);
  }, [extractedData]);

  const handleFieldChange = (field: string, newValue: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: newValue,
    }));
    
    // Track if field was corrected
    const originalValue = String(extractedData[field] || '');
    if (newValue !== originalValue) {
      setCorrections(prev => new Set(prev).add(field));
    } else {
      setCorrections(prev => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }
  };

  const handleConfirm = () => {
    // Convert back to proper types if needed
    const finalData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(editedData)) {
      // Try to parse numbers
      if (!isNaN(Number(value)) && value.trim() !== '') {
        finalData[key] = Number(value);
      } else {
        finalData[key] = value;
      }
    }
    onConfirm(finalData);
  };

  const getConfidenceColor = () => {
    if (confidence > 0.9) return 'text-green-600';
    if (confidence > 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = () => {
    if (confidence > 0.9) return 'High confidence';
    if (confidence > 0.7) return 'Medium confidence';
    return 'Low confidence - please review carefully';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">AI Extracted Data</CardTitle>
              <CardDescription>
                Review and correct the extracted information
              </CardDescription>
            </div>
          </div>
          
          <div className="text-right">
            <Badge variant="outline" className={getConfidenceColor()}>
              {(confidence * 100).toFixed(0)}% confidence
            </Badge>
            <p className={`text-xs mt-1 ${getConfidenceColor()}`}>
              {getConfidenceLabel()}
            </p>
          </div>
        </div>
        
        {confidence <= 0.7 && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-yellow-700 dark:text-yellow-300">
              Low confidence extraction - please verify all fields carefully
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary">{documentType}</Badge>
          {corrections.size > 0 && (
            <Badge variant="default" className="bg-blue-500">
              {corrections.size} correction{corrections.size !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(editedData).map(([field, value]) => (
            <div key={field} className="space-y-1.5">
              <Label 
                htmlFor={field}
                className={`flex items-center gap-1.5 ${
                  corrections.has(field) ? 'text-blue-600' : ''
                }`}
              >
                {formatFieldName(field)}
                {corrections.has(field) && (
                  <Edit2 className="h-3 w-3" />
                )}
              </Label>
              <Input
                id={field}
                value={value}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                className={corrections.has(field) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
              />
              {corrections.has(field) && (
                <p className="text-xs text-muted-foreground">
                  Original: <span className="line-through">{String(extractedData[field])}</span>
                </p>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            <Check className="h-4 w-4 mr-2" />
            {corrections.size > 0 ? 'Save Corrections & Continue' : 'Confirm & Continue'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
