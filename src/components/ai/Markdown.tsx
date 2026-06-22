import { memo } from 'react';
import { Anchor, Table, Text } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { safeUrl } from '@/components/ai/markdownUrl';

// Renders assistant chat text as GitHub-flavoured Markdown, mapped onto Mantine
// primitives so it inherits the app's theme (spacing, colours, dark mode).
// react-markdown does not use dangerouslySetInnerHTML, and links are run through
// safeUrl (see markdownUrl.ts), so this is XSS-safe.

const components: Components = {
  p: ({ children }) => (
    <Text size="sm" style={{ margin: '0 0 6px', lineHeight: 1.55 }}>
      {children}
    </Text>
  ),
  strong: ({ children }) => <Text span fw={700} size="sm">{children}</Text>,
  em: ({ children }) => <Text span fs="italic" size="sm">{children}</Text>,
  a: ({ href, children }) => (
    <Anchor href={href} target="_blank" rel="noopener noreferrer" size="sm">
      {children}
    </Anchor>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: '0 0 6px', paddingInlineStart: 20 }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: '0 0 6px', paddingInlineStart: 20 }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ marginBottom: 2 }}>
      <Text span size="sm" style={{ lineHeight: 1.5 }}>{children}</Text>
    </li>
  ),
  h1: ({ children }) => <Text fw={700} size="md" mt={6} mb={4}>{children}</Text>,
  h2: ({ children }) => <Text fw={700} size="md" mt={6} mb={4}>{children}</Text>,
  h3: ({ children }) => <Text fw={700} size="sm" mt={6} mb={4}>{children}</Text>,
  h4: ({ children }) => <Text fw={700} size="sm" mt={6} mb={4}>{children}</Text>,
  code: ({ className, children }) => {
    const isBlock = (className ?? '').includes('language-');
    if (isBlock) {
      return (
        <Text
          component="pre"
          size="xs"
          style={{
            margin: '0 0 6px',
            padding: 8,
            borderRadius: 6,
            overflowX: 'auto',
            background: 'var(--mantine-color-default-hover)',
            fontFamily: 'var(--mantine-font-family-monospace)',
            whiteSpace: 'pre',
          }}
        >
          <code>{children}</code>
        </Text>
      );
    }
    return (
      <Text
        span
        size="xs"
        style={{
          padding: '1px 4px',
          borderRadius: 4,
          background: 'var(--mantine-color-default-hover)',
          fontFamily: 'var(--mantine-font-family-monospace)',
        }}
      >
        {children}
      </Text>
    );
  },
  blockquote: ({ children }) => (
    <div
      style={{
        borderInlineStart: '3px solid var(--mantine-color-default-border)',
        paddingInlineStart: 10,
        margin: '0 0 6px',
        opacity: 0.85,
      }}
    >
      {children}
    </div>
  ),
  table: ({ children }) => (
    <Table.ScrollContainer minWidth={0} mb={6}>
      <Table withTableBorder withColumnBorders striped fz="xs" verticalSpacing={4} horizontalSpacing={8}>
        {children}
      </Table>
    </Table.ScrollContainer>
  ),
  thead: ({ children }) => <Table.Thead>{children}</Table.Thead>,
  tbody: ({ children }) => <Table.Tbody>{children}</Table.Tbody>,
  tr: ({ children }) => <Table.Tr>{children}</Table.Tr>,
  th: ({ children }) => <Table.Th>{children}</Table.Th>,
  td: ({ children }) => <Table.Td>{children}</Table.Td>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--mantine-color-default-border)', margin: '8px 0' }} />,
};

function MarkdownImpl({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={safeUrl} components={components}>
      {children}
    </ReactMarkdown>
  );
}

// Markdown parsing is non-trivial; memoise so streaming siblings don't re-parse.
export const Markdown = memo(MarkdownImpl);
