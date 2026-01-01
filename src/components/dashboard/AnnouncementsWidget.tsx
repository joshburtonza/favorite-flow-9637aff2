import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Megaphone, ArrowRight } from 'lucide-react';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const priorityColors = {
  urgent: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500/20 text-orange-500',
  normal: 'bg-primary/20 text-primary',
  low: 'bg-muted text-muted-foreground'
};

export function AnnouncementsWidget() {
  const navigate = useNavigate();
  const { announcements, isLoading, unreadCount } = useAnnouncements();
  
  const unreadAnnouncements = announcements.filter(a => !a.is_read).slice(0, 3);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Announcements
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => navigate('/announcements')}
          >
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {unreadAnnouncements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No new announcements
          </p>
        ) : (
          <div className="space-y-3">
            {unreadAnnouncements.map(announcement => (
              <div 
                key={announcement.id}
                className="p-3 rounded-lg bg-card/50 border cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate('/announcements')}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm line-clamp-1">{announcement.title}</h4>
                  <Badge className={cn('text-xs shrink-0', priorityColors[announcement.priority])}>
                    {announcement.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {announcement.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
