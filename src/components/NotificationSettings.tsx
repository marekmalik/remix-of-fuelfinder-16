import { useState } from 'react';
import { usePushNotifications, NotificationSchedule } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bell, BellOff, Plus, Trash2, Clock, Loader2, Send, Globe, Pencil, Timer } from 'lucide-react';

// Week starts on Monday
const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Australia/Perth',
  'Pacific/Auckland',
  'UTC',
];

type ScheduleType = 'daily' | 'interval';

interface FormState {
  time: string;
  days: number[];
  timezone: string;
  scheduleType: ScheduleType;
  intervalHours: number;
  intervalMinutes: number;
  fromTime: string;
  untilTime: string;
}

const defaultFormState = (): FormState => ({
  time: '09:00',
  days: [1, 2, 3, 4, 5],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  scheduleType: 'daily',
  intervalHours: 1,
  intervalMinutes: 0,
  fromTime: '08:00',
  untilTime: '20:00',
});

// Helper component for +/- number input with step snapping
function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  snapToStep = false,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  snapToStep?: boolean;
}) {
  const handleDecrease = () => {
    let newValue: number;
    if (snapToStep && step > 1) {
      // Snap to previous step value
      const prevStep = Math.floor((value - 1) / step) * step;
      newValue = prevStep < min ? min : prevStep;
    } else {
      newValue = Math.max(min, value - step);
    }
    onChange(newValue);
  };

  const handleIncrease = () => {
    let newValue: number;
    if (snapToStep && step > 1) {
      // Snap to next step value
      const nextStep = Math.ceil((value + 1) / step) * step;
      newValue = nextStep > max ? max : nextStep;
    } else {
      newValue = Math.min(max, value + step);
    }
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    } else if (e.target.value === '') {
      onChange(min);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleDecrease}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors font-bold text-lg"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleInputChange}
          className="w-14 h-10 text-center bg-background border border-border rounded-lg text-foreground font-medium"
        />
        <button
          type="button"
          onClick={handleIncrease}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors font-bold text-lg"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    permission,
    schedules,
    loading,
    subscribe,
    unsubscribe,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    sendTestNotification,
  } = usePushNotifications();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezones = COMMON_TIMEZONES.includes(userTimezone)
    ? COMMON_TIMEZONES
    : [userTimezone, ...COMMON_TIMEZONES];

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-secondary/30 border border-border flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl bg-secondary/30 border border-border">
        <div className="flex items-center gap-3 text-muted-foreground">
          <BellOff className="w-5 h-5" />
          <p className="text-sm">
            Push notifications are not supported in your browser.
          </p>
        </div>
      </div>
    );
  }

  const handleToggleSubscription = async () => {
    setActionLoading(true);
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
    setActionLoading(false);
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormState(defaultFormState());
    setShowForm(true);
  };

  const openEditForm = (schedule: NotificationSchedule) => {
    setEditingId(schedule.id);
    const totalMinutes = schedule.interval_minutes || 60;
    setFormState({
      time: (schedule.time || '09:00').slice(0, 5),
      days: schedule.days_of_week,
      timezone: schedule.timezone,
      scheduleType: schedule.schedule_type || 'daily',
      intervalHours: Math.floor(totalMinutes / 60),
      intervalMinutes: totalMinutes % 60,
      fromTime: schedule.from_time ? schedule.from_time.slice(0, 5) : '08:00',
      untilTime: schedule.until_time ? schedule.until_time.slice(0, 5) : '20:00',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormState(defaultFormState());
  };

  const getTotalIntervalMinutes = () => {
    return formState.intervalHours * 60 + formState.intervalMinutes;
  };

  const handleSave = async () => {
    const totalInterval = getTotalIntervalMinutes();
    if (formState.scheduleType === 'daily') {
      if (!formState.time || formState.days.length === 0) return;
    } else {
      if (totalInterval < 1) return; // Minimum 1 minute
    }

    setActionLoading(true);

    if (editingId) {
      const updates: any = {
        time: formState.time,
        days_of_week: formState.days,
        timezone: formState.timezone,
        schedule_type: formState.scheduleType,
        interval_minutes: formState.scheduleType === 'interval' ? totalInterval : null,
        from_time: formState.scheduleType === 'interval' ? formState.fromTime : null,
        until_time: formState.scheduleType === 'interval' ? formState.untilTime : null,
      };
      const success = await updateSchedule(editingId, updates);
      if (success) closeForm();
    } else {
      const success = await addSchedule(
        formState.time,
        formState.days,
        undefined,
        undefined,
        formState.timezone,
        formState.scheduleType,
        formState.scheduleType === 'interval' ? totalInterval : undefined,
        formState.scheduleType === 'interval' ? formState.fromTime : undefined,
        formState.scheduleType === 'interval' ? formState.untilTime : undefined
      );
      if (success) closeForm();
    }

    setActionLoading(false);
  };

  const handleDeleteSchedule = async () => {
    if (!deleteDialog) return;
    setActionLoading(true);
    await deleteSchedule(deleteDialog);
    setDeleteDialog(null);
    setActionLoading(false);
  };

  const handleTestNotification = async () => {
    setActionLoading(true);
    await sendTestNotification();
    setActionLoading(false);
  };

  const toggleDay = (day: number) => {
    setFormState(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day],
    }));
  };

  const formatTime = (time: string) => {
    // Always show HH:mm (no seconds)
    return (time || '').slice(0, 5);
  };

  const formatTimezoneLabel = (tz: string) => {
    try {
      const now = new Date();
      const offset = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'shortOffset',
      })
        .formatToParts(now)
        .find((p) => p.type === 'timeZoneName')?.value || '';
      return `${tz.replace(/_/g, ' ')} (${offset})`;
    } catch {
      return tz;
    }
  };

  const formatShortTimezone = (tz: string) => {
    const parts = tz.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
  };

  const formatInterval = (minutes: number) => {
    if (minutes < 60) return `Every ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return hours === 1 ? 'Every hour' : `Every ${hours} hrs`;
    }
    if (hours === 0) {
      return `Every ${remainingMinutes} min`;
    }
    return `Every ${hours}h ${remainingMinutes}m`;
  };

  const formatDays = (days: number[]) => {
    // Sort by DAYS_OF_WEEK order (Monday first) instead of numeric value
    const sortedDays = [...days].sort((a, b) => {
      const indexA = DAYS_OF_WEEK.findIndex(d => d.value === a);
      const indexB = DAYS_OF_WEEK.findIndex(d => d.value === b);
      return indexA - indexB;
    });
    return sortedDays
      .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label)
      .join(', ');
  };

  const formatIntervalDescription = (schedule: NotificationSchedule) => {
    const parts: string[] = [];
    
    // Add time range
    if (schedule.from_time && schedule.until_time) {
      const from = schedule.from_time.slice(0, 5);
      const until = schedule.until_time.slice(0, 5);
      parts.push(`${from}–${until}`);
    }
    
    // Add days
    if (schedule.days_of_week && schedule.days_of_week.length > 0) {
      parts.push(formatDays(schedule.days_of_week));
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Recurring interval';
  };

  const formatScheduleDescription = (schedule: NotificationSchedule) => {
    if (schedule.schedule_type === 'interval' && schedule.interval_minutes) {
      return formatIntervalDescription(schedule);
    }
    return (
      formatDays(schedule.days_of_week) +
      (schedule.timezone ? ` • ${formatShortTimezone(schedule.timezone)}` : '')
    );
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="p-4 rounded-xl bg-secondary/30 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-medium text-foreground">Push Notifications</h3>
              <p className="text-xs text-muted-foreground">
                {permission === 'denied'
                  ? 'Blocked in browser settings'
                  : isSubscribed
                  ? 'Enabled'
                  : 'Disabled'}
              </p>
            </div>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggleSubscription}
            disabled={actionLoading || permission === 'denied'}
          />
        </div>
      </div>

      {isSubscribed && (
        <>
          {/* Test Notification */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestNotification}
            disabled={actionLoading}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Test Notification
          </Button>

          {/* Schedules List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Reminder Schedule</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={openAddForm}
                disabled={showForm}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Edit Reminder' : 'New Reminder'}
                </div>

                {/* Schedule Type Selector */}
                <div className="space-y-2">
                  <Label className="text-sm">Type</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormState(prev => ({ ...prev, scheduleType: 'daily' }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formState.scheduleType === 'daily'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      Fixed Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormState(prev => ({ ...prev, scheduleType: 'interval' }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formState.scheduleType === 'interval'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Timer className="w-4 h-4" />
                      Interval
                    </button>
                  </div>
                </div>

                {formState.scheduleType === 'daily' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="time" className="text-sm">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        step={60}
                        value={formState.time}
                        onChange={(e) => setFormState(prev => ({ ...prev, time: e.target.value }))}
                        className="max-w-[140px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Timezone</Label>
                      <Select
                        value={formState.timezone}
                        onValueChange={(v) => setFormState(prev => ({ ...prev, timezone: v }))}
                      >
                        <SelectTrigger className="w-full">
                          <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {formatTimezoneLabel(tz)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Days</Label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(day.value)}
                            className={`min-w-[48px] px-3 py-3 rounded-full text-sm font-medium transition-colors ${
                              formState.days.includes(day.value)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Remind me every</Label>
                      <div className="flex items-center justify-center gap-4">
                        <NumberStepper
                          value={formState.intervalHours}
                          onChange={(v) => setFormState(prev => ({ ...prev, intervalHours: v }))}
                          min={0}
                          max={23}
                          step={1}
                          label="Hours"
                        />
                        <NumberStepper
                          value={formState.intervalMinutes}
                          onChange={(v) => setFormState(prev => ({ ...prev, intervalMinutes: v }))}
                          min={0}
                          max={59}
                          step={15}
                          snapToStep={true}
                          label="Minutes"
                        />
                      </div>
                      {getTotalIntervalMinutes() < 1 && (
                        <p className="text-xs text-destructive text-center">
                          Minimum interval is 1 minute
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 overflow-hidden">
                      <Label className="text-sm">Active hours</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0 overflow-hidden">
                          <Label className="text-xs text-muted-foreground">From</Label>
                          <Input
                            type="time"
                            step={60}
                            value={formState.fromTime}
                            onChange={(e) => setFormState(prev => ({ ...prev, fromTime: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <Label className="text-xs text-muted-foreground">Until</Label>
                          <Input
                            type="time"
                            step={60}
                            value={formState.untilTime}
                            onChange={(e) => setFormState(prev => ({ ...prev, untilTime: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Reminders will only be sent during these hours.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Days</Label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(day.value)}
                            className={`min-w-[48px] px-3 py-3 rounded-full text-sm font-medium transition-colors ${
                              formState.days.includes(day.value)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="lg"
                    className="flex-1 py-4 text-base"
                    onClick={handleSave}
                    disabled={
                      actionLoading ||
                      (formState.scheduleType === 'daily' && (!formState.time || formState.days.length === 0)) ||
                      (formState.scheduleType === 'interval' && getTotalIntervalMinutes() < 1)
                    }
                  >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Reminder'}
                  </Button>
                  <Button variant="outline" size="lg" className="py-4" onClick={closeForm}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Schedules */}
            {schedules.length === 0 && !showForm ? (
              <p className="text-sm text-muted-foreground italic py-2">
                No reminders set. Add one to get notified to log activities.
              </p>
            ) : (
              <div className="space-y-2">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-3 rounded-lg border border-border bg-card flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {schedule.schedule_type === 'interval' ? (
                        <Timer className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {schedule.schedule_type === 'interval' && schedule.interval_minutes
                            ? formatInterval(schedule.interval_minutes)
                            : formatTime(schedule.time)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatScheduleDescription(schedule)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={(enabled) => updateSchedule(schedule.id, { enabled })}
                        disabled={actionLoading}
                      />
                      <button
                        onClick={() => openEditForm(schedule)}
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                        disabled={actionLoading}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteDialog(schedule.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                        disabled={actionLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reminder? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSchedule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
