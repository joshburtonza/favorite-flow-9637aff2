import { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, Tag, Calendar, FileType } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useAllTags, useFileTypeStats } from '@/hooks/useFileSearch';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (start: Date | null, end: Date | null) => void;
  onClearAll: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  selectedTags,
  onTagsChange,
  selectedType,
  onTypeChange,
  dateRange,
  onDateRangeChange,
  onClearAll,
  placeholder = 'Search files...',
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { tags: allTags } = useAllTags();
  const { stats: fileTypeStats } = useFileTypeStats();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const hasFilters = selectedTags.length > 0 || selectedType || dateRange.start || dateRange.end;
  const hasAnyValue = value || hasFilters;

  // Focus on "/" key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Search input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => onChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filters popover */}
      <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={hasFilters ? 'secondary' : 'outline'}
            size="sm"
            className={cn('gap-2', hasFilters && 'bg-primary/10')}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasFilters && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {(selectedTags.length > 0 ? 1 : 0) + (selectedType ? 1 : 0) + (dateRange.start ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <div className="space-y-4">
            {/* File types */}
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <FileType className="h-4 w-4" />
                File Type
              </div>
              <div className="flex flex-wrap gap-1">
                {fileTypeStats.map(({ type, count }) => (
                  <Badge
                    key={type}
                    variant={selectedType === type ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => onTypeChange(selectedType === type ? null : type)}
                  >
                    {type} ({count})
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <Tag className="h-4 w-4" />
                  Tags
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Date range */}
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Date Range
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start">
                      {dateRange.start ? dateRange.start.toLocaleDateString() : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.start || undefined}
                      onSelect={(date) => onDateRangeChange(date || null, dateRange.end)}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 justify-start">
                      {dateRange.end ? dateRange.end.toLocaleDateString() : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.end || undefined}
                      onSelect={(date) => onDateRangeChange(dateRange.start, date || null)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Clear all */}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  onClearAll();
                  setIsFiltersOpen(false);
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex items-center gap-1">
          {selectedType && (
            <Badge variant="secondary" className="gap-1">
              {selectedType}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onTypeChange(null)} />
            </Badge>
          )}
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleTag(tag)} />
            </Badge>
          ))}
          {(dateRange.start || dateRange.end) && (
            <Badge variant="secondary" className="gap-1">
              {dateRange.start?.toLocaleDateString()} - {dateRange.end?.toLocaleDateString() || 'Now'}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onDateRangeChange(null, null)} />
            </Badge>
          )}
        </div>
      )}

      {/* Clear all button */}
      {hasAnyValue && (
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          Clear
        </Button>
      )}
    </div>
  );
}
