import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, Clock, FileText, Package, CreditCard, 
  AlertTriangle, Bell as BellIcon, CheckCheck 
} from 'lucide-react';

const typeIcons: Record<string, React.ElementType> = {
  task_assigned: Clock,
  task_due: AlertTriangle,
  invoice_status: CreditCard,
  document_approved: CheckCircle2,
  document_rejected: AlertTriangle,
  shipment_update: Package,
  payment_received: CreditCard,
  system: BellIcon,
};

const priorityColors: Record<string, string> = {
  low: 'text-muted-foreground',
  normal: 'text-foreground',
  high: 'text-warning',
  urgent: 'text-destructive',
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, isLoading } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-destructive border-2 border-background"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs gap-1"
              onClick={() => markAllRead()}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[350px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : !notifications?.length ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || BellIcon;
                
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                      !notification.is_read && "bg-primary/5"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        notification.is_read ? "bg-muted" : "bg-primary/10"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          priorityColors[notification.priority]
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm line-clamp-1",
                            !notification.is_read && "font-medium"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
