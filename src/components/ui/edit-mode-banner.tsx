import { AlertTriangle, Lock, Pencil, X } from 'lucide-react';
import { Button } from './button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';

interface EditModeBannerProps {
  isEditMode: boolean;
  onEnableEdit: () => void;
  onDisableEdit: () => void;
}

export function EditModeBanner({ isEditMode, onEnableEdit, onDisableEdit }: EditModeBannerProps) {
  if (isEditMode) {
    return (
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="font-medium text-warning-foreground text-sm">Manual Override Mode</p>
            <p className="text-xs text-muted-foreground">Changes are normally automated via Telegram. Editing manually.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onDisableEdit}>
          <Lock className="h-4 w-4 mr-1" />
          Lock
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 border border-border rounded-lg p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <p className="font-medium text-foreground text-sm">View Only Mode</p>
          <p className="text-xs text-muted-foreground">Data is updated via Telegram automation</p>
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Enable Manual Override?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This data is normally updated automatically via Telegram commands.</p>
              <p className="font-medium text-foreground">Manual editing should only be used for:</p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Emergency corrections</li>
                <li>Fixing automation errors</li>
                <li>Initial data setup</li>
              </ul>
              <p className="text-warning-foreground font-medium mt-3">
                Are you sure you want to enable manual editing?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onEnableEdit} className="bg-warning text-warning-foreground hover:bg-warning/90">
              Enable Manual Override
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
