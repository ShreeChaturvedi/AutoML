import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-lg border px-4 py-3 shadow-sm space-y-2',
          isUser
            ? 'bg-primary text-primary-foreground border-primary/40'
            : 'bg-card text-foreground'
        )}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className={cn('font-mono', isUser && 'text-primary-foreground/80')}>
            {message.timestamp.toLocaleTimeString()}
          </span>
          <div className="flex items-center gap-2">
            {message.status && message.status !== 'ok' && (
              <Badge variant="outline" className="h-6 px-2 text-[10px] uppercase tracking-wide">
                {message.status}
              </Badge>
            )}
            {message.cached !== undefined && (
              <Badge
                variant={isUser ? 'secondary' : 'outline'}
                className="h-6 px-2 text-[10px] font-mono"
              >
                {message.cached ? 'Cache hit' : 'Fresh'}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
