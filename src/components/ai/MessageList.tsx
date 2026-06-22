import { useEffect, useRef } from 'react';
import { Alert, Box, Group, Loader, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconSparkles, IconUser } from '@tabler/icons-react';
import type { Message } from '@/ai/chat/conversation.types';
import { Markdown } from '@/components/ai/Markdown';
import ProposedActionCard from '@/components/ai/ProposedActionCard';

interface Props {
  messages: Message[];
  summary?: string;
  sending: boolean;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <Box
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 8,
      }}
    >
      <Stack
        gap={4}
        style={{
          maxWidth: '85%',
          padding: '8px 12px',
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          background: isUser
            ? 'var(--mantine-color-brand-6)'
            : 'var(--mantine-color-default-border)',
          color: isUser ? 'white' : 'inherit',
        }}
      >
        <Group gap={4} align="center">
          {isUser ? <IconUser size={12} /> : <IconSparkles size={12} />}
          <Text size="xs" opacity={0.7}>
            {isUser ? 'You' : 'AI Assistant'}
          </Text>
        </Group>

        {message.streaming && !message.text ? (
          <Loader size="xs" color={isUser ? 'white' : 'brand'} type="dots" />
        ) : isUser ? (
          // User text is literal — render plain so stray Markdown chars aren't eaten.
          <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
            {message.text}
          </Text>
        ) : (
          <Box style={{ wordBreak: 'break-word' }}>
            <Markdown>{message.text}</Markdown>
            {message.streaming && <Text span size="sm" style={{ opacity: 0.5 }}>▋</Text>}
          </Box>
        )}

        {message.error && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertCircle size={12} />}
            p={4}
            radius="md"
          >
            <Text size="xs">{message.error.message}</Text>
          </Alert>
        )}

        {message.proposedAction && <ProposedActionCard message={message} />}
      </Stack>
    </Box>
  );
}

export default function MessageList({ messages, summary, sending }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  if (messages.length === 0 && !summary) {
    return (
      <Box
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          opacity: 0.5,
        }}
      >
        <IconSparkles size={32} />
        <Text size="sm" mt={8} ta="center">
          Ask anything about your forecast — cash, investments, scenarios, instruments.
        </Text>
      </Box>
    );
  }

  return (
    <Box style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
      {summary && (
        <Alert color="blue" variant="light" mb={12} radius="md">
          <Text size="xs" c="dimmed">
            <b>Earlier summary:</b> {summary}
          </Text>
        </Alert>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      <div ref={bottomRef} />
    </Box>
  );
}
