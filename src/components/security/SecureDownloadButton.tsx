import { useState } from 'react';
import { useSecurityRequests } from '@/hooks/useSecurityRequests';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Download, Lock, Clock, CheckCircle, XCircle } from 'lucide-react';

interface SecureDownloadButtonProps {
  entityType: string;
  entityId?: string;
  entityName: string;
  onApproved: () => void;
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function SecureDownloadButton({
  entityType,
  entityId,
  entityName,
  onApproved,
  children,
  variant = 'outline',
  size = 'default',
  className,
}: SecureDownloadButtonProps) {
  const { isAdmin } = usePermissions();
  const { createRequest, checkApproval } = useSecurityRequests();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleClick = async () => {
    // Admins can download directly
    if (isAdmin) {
      onApproved();
      return;
    }

    setChecking(true);
    const hasApproval = await checkApproval('download', entityType, entityId);
    setChecking(false);

    if (hasApproval) {
      onApproved();
    } else {
      setShowRequestDialog(true);
    }
  };

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    const result = await createRequest({
      request_type: 'download',
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      reason,
    });
    setSubmitting(false);

    if (result) {
      setShowRequestDialog(false);
      setReason('');
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={checking}
      >
        {checking ? (
          <Clock className="h-4 w-4 animate-spin mr-2" />
        ) : isAdmin ? (
          <Download className="h-4 w-4 mr-2" />
        ) : (
          <Lock className="h-4 w-4 mr-2" />
        )}
        {children || 'Download'}
      </Button>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Request Download Approval
            </DialogTitle>
            <DialogDescription>
              Downloads require admin approval. Your request will be reviewed by Mo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{entityName}</p>
              <p className="text-xs text-muted-foreground">{entityType}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for download (optional)</label>
              <Textarea
                placeholder="Why do you need to download this file?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface SecureExportButtonProps {
  entityType: string;
  entityName: string;
  onApproved: () => void;
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  metadata?: Record<string, any>;
}

export function SecureExportButton({
  entityType,
  entityName,
  onApproved,
  children,
  variant = 'outline',
  size = 'default',
  className,
  metadata,
}: SecureExportButtonProps) {
  const { isAdmin } = usePermissions();
  const { createRequest, checkApproval } = useSecurityRequests();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleClick = async () => {
    // Admins can export directly
    if (isAdmin) {
      onApproved();
      return;
    }

    setChecking(true);
    const hasApproval = await checkApproval('export', entityType);
    setChecking(false);

    if (hasApproval) {
      onApproved();
    } else {
      setShowRequestDialog(true);
    }
  };

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    const result = await createRequest({
      request_type: 'export',
      entity_type: entityType,
      entity_name: entityName,
      reason,
      metadata,
    });
    setSubmitting(false);

    if (result) {
      setShowRequestDialog(false);
      setReason('');
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={checking}
      >
        {checking ? (
          <Clock className="h-4 w-4 animate-spin mr-2" />
        ) : isAdmin ? (
          <Download className="h-4 w-4 mr-2" />
        ) : (
          <Lock className="h-4 w-4 mr-2" />
        )}
        {children || 'Export'}
      </Button>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Request Export Approval
            </DialogTitle>
            <DialogDescription>
              Data exports require admin approval for security purposes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{entityName}</p>
              <p className="text-xs text-muted-foreground">{entityType}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for export (optional)</label>
              <Textarea
                placeholder="Why do you need to export this data?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
