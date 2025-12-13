import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, FileText, Download, Calendar, Package, Building2, 
  Users, Filter, Eye, Loader2, FolderOpen
} from 'lucide-react';
import { format } from 'date-fns';

interface UploadedDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  document_type: string | null;
  lot_number: string | null;
  supplier_name: string | null;
  client_name: string | null;
  summary: string | null;
  extracted_data: Record<string, any> | null;
  uploaded_at: string;
}

const Documents = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['uploaded-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as UploadedDocument[];
    },
  });

  const documentTypes = ['all', ...new Set(documents?.map(d => d.document_type).filter(Boolean) || [])];

  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = searchQuery === '' || 
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.lot_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const handleDownload = async (doc: UploadedDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);
      
      if (error) {
        console.error('Download error:', error);
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const getDocumentTypeColor = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case 'invoice': return 'bg-primary/20 text-primary border-primary/30';
      case 'bol': return 'bg-accent/20 text-accent border-accent/30';
      case 'payment': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'shipment': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slide-in">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Document Management</p>
            <h1 className="text-3xl font-semibold gradient-text">Documents</h1>
          </div>
          <div className="search-glass w-full md:w-80">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search documents, LOT, supplier..." 
              className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* Stats & Filters */}
        <div className="bento-grid">
          <div className="glass-card" style={{ animationDelay: '0.1s' }}>
            <div className="card-label">
              <FolderOpen className="h-4 w-4 text-primary" />
              Total Documents
            </div>
            <div className="big-number">{documents?.length || 0}</div>
          </div>

          <div className="glass-card" style={{ animationDelay: '0.2s' }}>
            <div className="card-label">
              <Filter className="h-4 w-4 text-accent" />
              Filter by Type
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {documentTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    typeFilter === type 
                      ? 'bg-primary/20 text-foreground border border-primary/30' 
                      : 'bg-glass-surface text-muted-foreground hover:bg-glass-surface/80'
                  }`}
                >
                  {type === 'all' ? 'All' : type}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ animationDelay: '0.3s' }}>
            <div className="card-label">
              <Eye className="h-4 w-4 text-warning" />
              Showing
            </div>
            <div className="big-number">{filteredDocuments?.length || 0}</div>
            <span className="text-sm text-muted-foreground">of {documents?.length || 0} documents</span>
          </div>
        </div>

        {/* Documents List */}
        <div className="glass-card">
          <div className="card-label border-b border-glass-border pb-4 mb-4">
            <FileText className="h-4 w-4 text-primary" />
            All Documents
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredDocuments?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-lg">No documents found</p>
              <p className="text-sm mt-2">Upload documents in the AI Hub to see them here</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredDocuments?.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="p-4 rounded-xl border border-glass-border bg-glass-surface/50 hover:bg-glass-surface transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div 
                          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'hsl(var(--primary) / 0.15)' }}
                        >
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium truncate">{doc.file_name}</h3>
                            {doc.document_type && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getDocumentTypeColor(doc.document_type)}`}
                              >
                                {doc.document_type}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}
                            </span>
                            
                            {doc.lot_number && (
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                LOT {doc.lot_number}
                              </span>
                            )}
                            
                            {doc.supplier_name && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {doc.supplier_name}
                              </span>
                            )}
                            
                            {doc.client_name && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {doc.client_name}
                              </span>
                            )}
                          </div>
                          
                          {doc.summary && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {doc.summary}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-accent/20 hover:bg-accent/30 text-accent transition-colors shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Documents;
