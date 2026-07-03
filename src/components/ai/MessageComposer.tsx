import { useState } from 'react';
import { ActionIcon, Group, Textarea, Tooltip } from '@mantine/core';
import { IconSend, IconPlayerStopFilled, IconWand } from '@tabler/icons-react';
import { looksLikeActionRequest } from '@/ai/actions/intentRouting';

interface Props {
  onSend: (text: string) => void;
  onPropose: (text: string) => void;
  onStop: () => void;
  sending: boolean;
}

export default function MessageComposer({ onSend, onPropose, onStop, sending }: Props) {
  const [text, setText] = useState('');

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (looksLikeActionRequest(trimmed)) {
      onPropose(trimmed);
    } else {
      onSend(trimmed);
    }
    setText('');
  }

  function handlePropose() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    onPropose(trimmed);
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
        disabled={sending}
        autosize
        minRows={1}
        maxRows={5}
        radius="md"
      />
      {sending ? (
        <Tooltip label="Stop" withArrow>
          <ActionIcon
            size="lg"
            color="red"
            variant="filled"
            onClick={onStop}
            radius="md"
            aria-label="Stop response"
          >
            <IconPlayerStopFilled size={16} />
          </ActionIcon>
        </Tooltip>
      ) : (
        <>
          <Tooltip label="Suggest a change to your plan" withArrow>
            <ActionIcon
              size="lg"
              color="violet"
              variant="light"
              onClick={handlePropose}
              disabled={!text.trim()}
              radius="md"
              aria-label="Suggest a change"
            >
              <IconWand size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Send (Enter)" withArrow>
            <ActionIcon
              size="lg"
              color="brand"
              variant="filled"
              onClick={handleSend}
              disabled={!text.trim()}
              radius="md"
              aria-label="Send message"
            >
              <IconSend size={16} />
            </ActionIcon>
          </Tooltip>
        </>
      )}
    </Group>
  );
}
