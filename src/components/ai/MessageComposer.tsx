import { useState } from 'react';
import { ActionIcon, Group, Textarea, Tooltip } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function MessageComposer({ onSend, disabled }: Props) {
  const [text, setText] = useState('');

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Group gap={8} align="flex-end" p="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
      <Textarea
        style={{ flex: 1 }}
        placeholder="Ask about your forecast…"
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autosize
        minRows={1}
        maxRows={5}
        radius="md"
      />
      <Tooltip label="Send (Enter)" withArrow>
        <ActionIcon
          size="lg"
          color="brand"
          variant="filled"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          radius="md"
          aria-label="Send message"
        >
          <IconSend size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
