import React from 'react';
import { Ship, FileText, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { workspaceTemplates, WorkspaceTemplate } from '@/data/workspaceTemplates';

const iconMap: Record<string, React.ElementType> = {
  Ship,
  FileText,
  Building2,
};

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: WorkspaceTemplate) => void;
}

export function TemplatePickerDialog({ open, onOpenChange, onSelect }: TemplatePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New from Template</DialogTitle>
          <DialogDescription>Choose a template to create a pre-formatted spreadsheet.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {workspaceTemplates.map((template) => {
            const Icon = iconMap[template.icon] || FileText;
            return (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                onClick={() => onSelect(template)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {template.category}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs leading-snug">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
