import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent, forwardRef, useImperativeHandle } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  teamMembers: TeamMember[];
  placeholder?: string;
  className?: string;
}

export interface MentionInputRef {
  focus: () => void;
}

export const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(({
  value,
  onChange,
  onKeyPress,
  onBlur,
  teamMembers,
  placeholder = "Type a message... Use @ to mention",
  className
}, ref) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus()
  }));

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredMembers = teamMembers.filter(member => {
    const name = (member.full_name || member.email || '').toLowerCase();
    return name.includes(mentionQuery.toLowerCase());
  }).slice(0, 5);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const newCursorPosition = e.target.selectionStart || 0;
    setCursorPosition(newCursorPosition);
    onChange(newValue);

    // Check if we should show mentions
    const textBeforeCursor = newValue.slice(0, newCursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only show mentions if there's no space after @ or if we're still typing the name
      if (!textAfterAt.includes(' ') || textAfterAt.length === 0) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        setMentionIndex(0);
        return;
      }
    }
    
    setShowMentions(false);
  };

  const insertMention = (member: TeamMember) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const name = member.full_name || member.email || 'Unknown';
      const beforeMention = value.slice(0, lastAtIndex);
      const newValue = `${beforeMention}@${name} ${textAfterCursor}`;
      onChange(newValue);
      
      // Move cursor after the mention
      setTimeout(() => {
        const newPosition = lastAtIndex + name.length + 2; // +2 for @ and space
        inputRef.current?.setSelectionRange(newPosition, newPosition);
        inputRef.current?.focus();
      }, 0);
    }
    
    setShowMentions(false);
    setMentionQuery('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }
    
    // Pass through to parent handler
    onKeyPress(e);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        className={className}
      />
      
      {/* Mentions Dropdown */}
      {showMentions && filteredMembers.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {filteredMembers.map((member, index) => (
            <button
              key={member.id}
              type="button"
              onClick={() => insertMention(member)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                index === mentionIndex ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(member.full_name || member.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {member.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {member.email}
                </p>
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-t bg-muted/50">
            Use ↑↓ to navigate, Enter to select
          </div>
        </div>
      )}
    </div>
  );
});

MentionInput.displayName = 'MentionInput';
