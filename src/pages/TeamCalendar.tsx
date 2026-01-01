import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTeamEvents, TeamEvent, EventType, EventVisibility, CreateEventInput, RecurringRule } from '@/hooks/useTeamEvents';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, Trash2, Edit, Repeat } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useIsMobile } from '@/hooks/use-mobile';

const eventTypeConfig: Record<EventType, { color: string; label: string }> = {
  meeting: { color: '#3b82f6', label: 'Meeting' },
  reminder: { color: '#eab308', label: 'Reminder' },
  deadline: { color: '#ef4444', label: 'Deadline' },
  leave: { color: '#22c55e', label: 'Leave' },
  shipment: { color: '#8b5cf6', label: 'Shipment' },
  other: { color: '#6b7280', label: 'Other' }
};

export default function TeamCalendar() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TeamEvent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEventSheet, setShowEventSheet] = useState(false);
  
  const { events, isLoading, createEvent, updateEvent, deleteEvent, refetch } = useTeamEvents(currentMonth);

  const [formData, setFormData] = useState<CreateEventInput>({
    title: '',
    description: '',
    event_type: 'meeting',
    event_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '',
    end_time: '',
    all_day: false,
    color: '#3b82f6',
    visibility: 'team'
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringRule, setRecurringRule] = useState<RecurringRule>({
    frequency: 'weekly',
    interval: 1
  });

  const handleRefresh = async () => {
    await refetch();
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to begin on Sunday
  const startPadding = monthStart.getDay();
  const paddedDays = [...Array(startPadding).fill(null), ...calendarDays];

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => e.event_date === dateStr);
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const openCreateForDate = (date: Date) => {
    setFormData(prev => ({
      ...prev,
      title: '',
      description: '',
      event_date: format(date, 'yyyy-MM-dd'),
      start_time: '',
      end_time: '',
      all_day: false
    }));
    setIsRecurring(false);
    setRecurringRule({ frequency: 'weekly', interval: 1 });
    setSelectedDate(date);
    setShowCreateDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    const eventData: CreateEventInput = {
      ...formData,
      recurring_rule: isRecurring ? recurringRule : undefined
    };
    await createEvent.mutateAsync(eventData);
    setShowCreateDialog(false);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (confirm('Delete this event?')) {
      await deleteEvent.mutateAsync(selectedEvent.id);
      setShowEventSheet(false);
      setSelectedEvent(null);
    }
  };

  const openEventDetail = (event: TeamEvent) => {
    setSelectedEvent(event);
    setShowEventSheet(true);
  };

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <div className="p-4 md:p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Team Calendar</h1>
                <p className="text-muted-foreground text-sm">Events and schedules</p>
              </div>
            </div>
            <Button onClick={() => openCreateForDate(new Date())}>
              <Plus className="h-4 w-4 mr-2" />
              Event
            </Button>
          </div>

          {/* Calendar Navigation */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleToday}>
                    Today
                  </Button>
                </div>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <>
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {isMobile ? day.charAt(0) : day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {paddedDays.map((day, idx) => {
                      if (!day) {
                        return <div key={`pad-${idx}`} className="aspect-square" />;
                      }

                      const dayEvents = getEventsForDay(day);
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isCurrentDay = isToday(day);

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => openCreateForDate(day)}
                          className={cn(
                            'aspect-square p-1 rounded-lg border text-left transition-colors hover:bg-accent',
                            !isCurrentMonth && 'opacity-50',
                            isCurrentDay && 'border-primary bg-primary/5'
                          )}
                        >
                          <div className={cn(
                            'text-sm font-medium mb-1',
                            isCurrentDay && 'text-primary'
                          )}>
                            {format(day, 'd')}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, isMobile ? 2 : 3).map(event => (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEventDetail(event);
                                }}
                                className="text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                                style={{ backgroundColor: event.color + '20', color: event.color }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > (isMobile ? 2 : 3) && (
                              <div className="text-xs text-muted-foreground px-1">
                                +{dayEvents.length - (isMobile ? 2 : 3)} more
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Event Type Legend */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(eventTypeConfig).map(([type, config]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-sm text-muted-foreground">{config.label}</span>
              </div>
            ))}
          </div>
        </div>
      </PullToRefresh>

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create Event - {selectedDate ? format(selectedDate, 'MMM d, yyyy') : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Event title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => {
                    const config = eventTypeConfig[value as EventType];
                    setFormData(prev => ({ 
                      ...prev, 
                      event_type: value as EventType,
                      color: config.color
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(eventTypeConfig).map(([type, config]) => (
                      <SelectItem key={type} value={type}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, visibility: value as EventVisibility }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="team">Team Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="all-day"
                checked={formData.all_day}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, all_day: checked }))}
              />
              <Label htmlFor="all-day">All day event</Label>
            </div>

            {!formData.all_day && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Recurring Event Section */}
            <div className="flex items-center space-x-2">
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label htmlFor="recurring" className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Repeat
              </Label>
            </div>

            {isRecurring && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={recurringRule.frequency}
                      onValueChange={(value: RecurringRule['frequency']) => 
                        setRecurringRule(prev => ({ ...prev, frequency: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Every</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={recurringRule.interval}
                        onChange={(e) => setRecurringRule(prev => ({ 
                          ...prev, 
                          interval: parseInt(e.target.value) || 1 
                        }))}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">
                        {recurringRule.frequency === 'daily' ? 'day(s)' :
                         recurringRule.frequency === 'weekly' ? 'week(s)' :
                         recurringRule.frequency === 'monthly' ? 'month(s)' : 'year(s)'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Input
                    type="date"
                    value={recurringRule.end_date || ''}
                    onChange={(e) => setRecurringRule(prev => ({ 
                      ...prev, 
                      end_date: e.target.value || undefined 
                    }))}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.title.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Sheet */}
      <Sheet open={showEventSheet} onOpenChange={setShowEventSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: selectedEvent?.color }}
              />
              {selectedEvent?.title}
            </SheetTitle>
          </SheetHeader>

          {selectedEvent && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(parseISO(selectedEvent.event_date), 'EEEE, MMMM d, yyyy')}</span>
              </div>

              {!selectedEvent.all_day && selectedEvent.start_time && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {selectedEvent.start_time}
                    {selectedEvent.end_time && ` - ${selectedEvent.end_time}`}
                  </span>
                </div>
              )}

              {selectedEvent.all_day && (
                <Badge variant="secondary">All Day</Badge>
              )}

              <div className="flex gap-2 flex-wrap">
                <Badge style={{ backgroundColor: selectedEvent.color + '20', color: selectedEvent.color }}>
                  {eventTypeConfig[selectedEvent.event_type].label}
                </Badge>
                {selectedEvent.recurring_rule && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Repeat className="h-3 w-3" />
                    Recurring
                  </Badge>
                )}
              </div>

              {selectedEvent.description && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Created by {selectedEvent.creator?.full_name || 'Unknown'} • {selectedEvent.visibility}
                </p>
              </div>

              {selectedEvent.created_by === user?.id && (
                <div className="flex gap-2 pt-4">
                  <Button variant="destructive" onClick={handleDeleteEvent} className="flex-1">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
