import { useState, useEffect } from 'react';
import { useExtractionCorrections } from '@/hooks/useExtractionCorrections';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Bot } from 'lucide-react';
import { format } from 'date-fns';

interface ExtractionStats {
  document_type: string;
  field_name: string;
  total_extractions: number;
  corrections_count: number;
  accuracy_rate: number;
}

interface RecentCorrection {
  id: string;
  document_id: string;
  field_name: string;
  ai_extracted_value: string;
  user_corrected_value: string;
  corrected_by: string;
  corrected_at: string;
  document_type: string;
}

export function ExtractionAccuracyDashboard() {
  const { isAdmin } = usePermissions();
  const { fetchExtractionStats, fetchRecentCorrections, calculateOverallAccuracy } = useExtractionCorrections();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ExtractionStats[]>([]);
  const [corrections, setCorrections] = useState<RecentCorrection[]>([]);
  const [accuracy, setAccuracy] = useState<{
    overall: number;
    byType: Record<string, number>;
    byField: Record<string, number>;
  }>({ overall: 100, byType: {}, byField: {} });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, correctionsData, accuracyData] = await Promise.all([
        fetchExtractionStats(),
        fetchRecentCorrections(10),
        calculateOverallAccuracy(),
      ]);
      setStats(statsData);
      setCorrections(correctionsData);
      setAccuracy(accuracyData);
    } catch (error) {
      console.error('Error loading extraction data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group stats by document type
  const statsByType = stats.reduce((acc, stat) => {
    if (!acc[stat.document_type]) {
      acc[stat.document_type] = [];
    }
    acc[stat.document_type].push(stat);
    return acc;
  }, {} as Record<string, ExtractionStats[]>);

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Admin access required to view extraction analytics</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Accuracy</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {accuracy.overall.toFixed(1)}%
              {accuracy.overall >= 90 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={accuracy.overall} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Auto-Applied Rate</CardDescription>
            <CardTitle className="text-3xl">
              {stats.length > 0 
                ? ((stats.reduce((sum, s) => sum + s.total_extractions - s.corrections_count, 0) / 
                   stats.reduce((sum, s) => sum + s.total_extractions, 0)) * 100).toFixed(0)
                : 100}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              High confidence extractions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Corrections</CardDescription>
            <CardTitle className="text-3xl">
              {stats.reduce((sum, s) => sum + s.corrections_count, 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From {stats.reduce((sum, s) => sum + s.total_extractions, 0)} extractions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy by Document Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Accuracy by Document Type
          </CardTitle>
          <CardDescription>
            Extraction accuracy breakdown by document classification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(accuracy.byType).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No extraction data yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Corrections</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                  <TableHead className="w-[200px]">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(statsByType).map(([type, typeStats]) => {
                  const total = typeStats.reduce((sum, s) => sum + s.total_extractions, 0);
                  const corrections = typeStats.reduce((sum, s) => sum + s.corrections_count, 0);
                  const acc = total > 0 ? ((total - corrections) / total) * 100 : 100;
                  
                  return (
                    <TableRow key={type}>
                      <TableCell className="font-medium">{type}</TableCell>
                      <TableCell className="text-right">{total}</TableCell>
                      <TableCell className="text-right">{corrections}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={acc >= 90 ? 'default' : acc >= 70 ? 'secondary' : 'destructive'}>
                          {acc.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Progress value={acc} className="h-2" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Field-Level Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Field-Level Accuracy</CardTitle>
          <CardDescription>
            Which fields are being corrected most often
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(accuracy.byField).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No field-level data yet
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(accuracy.byField)
                .sort((a, b) => a[1] - b[1])
                .map(([field, acc]) => (
                  <div key={field} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">
                          {field.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-sm ${
                          acc >= 90 ? 'text-green-600' : 
                          acc >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {acc.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={acc} className="h-2" />
                    </div>
                    {acc < 80 && (
                      <Badge variant="outline" className="text-yellow-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Needs improvement
                      </Badge>
                    )}
                    {acc >= 95 && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Excellent
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Corrections */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Corrections</CardTitle>
          <CardDescription>
            Latest user corrections for AI learning
          </CardDescription>
        </CardHeader>
        <CardContent>
          {corrections.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No corrections recorded yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>AI Value</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Corrected To</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {corrections.map((correction) => (
                  <TableRow key={correction.id}>
                    <TableCell>
                      <Badge variant="outline">{correction.document_type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium capitalize">
                      {correction.field_name.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-muted-foreground line-through">
                      {correction.ai_extracted_value || '-'}
                    </TableCell>
                    <TableCell>→</TableCell>
                    <TableCell className="font-medium text-green-600">
                      {correction.user_corrected_value}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(correction.corrected_at), 'PPp')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
