import { cn } from '@/lib/utils';

interface MessageContentProps {
  content: string;
  className?: string;
}

// Render message content with @mentions highlighted
export function MessageContent({ content, className }: MessageContentProps) {
  // Regex to match @mentions (names can have spaces)
  const mentionRegex = /@(\w+(?:\s\w+)*)/g;
  
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    
    // Add the mention as a highlighted span
    parts.push(
      <span 
        key={match.index}
        className="bg-primary/20 text-primary px-1 rounded font-medium"
      >
        @{match[1]}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return (
    <p className={cn("text-sm whitespace-pre-wrap break-words", className)}>
      {parts.length > 0 ? parts : content}
    </p>
  );
}
