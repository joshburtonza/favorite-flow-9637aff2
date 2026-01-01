import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, ArrowRight, Clock } from 'lucide-react';
import { useTeamEvents } from '@/hooks/useTeamEvents';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday, isTomorrow, addDays } from 'date-fns';

export function CalendarWidget() {
  const navigate = useNavigate();
  const { events, todayEvents, isLoading } = useTeamEvents(new Date());
  
  // Get upcoming events (today and next 7 days)
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd');
  
  const upcomingEvents = events
    .filter(e => e.event_date >= today && e.event_date <= weekEnd)
    .slice(0, 4);

  const formatEventDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-14" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Calendar
            {todayEvents.length > 0 && (
              <Badge variant="secondary" className="h-5 text-xs">
                {todayEvents.length} today
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => navigate('/calendar')}
          >
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming events
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map(event => (
              <div 
                key={event.id}
                className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate('/calendar')}
              >
                <div 
                  className="w-1 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: event.color }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{event.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatEventDate(event.event_date)}</span>
                    {!event.all_day && event.start_time && (
                      <>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{event.start_time}</span>
                      </>
                    )}
                    {event.all_day && <Badge variant="outline" className="text-xs h-4">All Day</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
