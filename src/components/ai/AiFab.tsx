import { useState, useContext, useEffect } from 'react';
import { Paper, Transition } from '@mantine/core';
import { IconSparkles, IconX } from '@tabler/icons-react';
import { useAuthStore } from '@/store/authStore';
import { useAiStore } from '@/store/aiStore';
import { usePlannerStore } from '@/store/plannerStore';
import { useUiStore } from '@/store/uiStore';
import { ThemeContext } from '@/app/theme-context';
import { useIsMobile } from '@/hooks/useIsMobile';
import ChatPanel from '@/components/ai/ChatPanel';
import { computePanelGeometry, FAB_SIZE, FAB_INSET } from '@/components/ai/aiFabGeometry';

const IO_THRESHOLDS = Array.from({ length: 11 }, (_, i) => i / 10);

const panelTransition = {
  in: { opacity: 1, transform: 'scale(1) translateY(0px)' },
  out: { opacity: 0, transform: 'scale(0.94) translateY(14px)' },
  common: { transformOrigin: 'bottom right' },
  transitionProperty: 'transform, opacity',
};

export default function AiFab() {
  const ctx = useContext(ThemeContext);
  const isDark = ctx?.colorScheme === 'dark';

  const authenticated = useAuthStore((s) => s.authenticated);
  const keyStatus = useAiStore((s) => s.keyStatus);
  const activeView = usePlannerStore((s) => s.activeView);
  const aiPanelOpened = useUiStore((s) => s.aiPanelOpened);
  const openAiPanel = useUiStore((s) => s.openAiPanel);
  const closeAiPanel = useUiStore((s) => s.closeAiPanel);
  const scenarioDrawerOpened = useUiStore((s) => s.scenarioDrawerOpened);

  const isMobile = useIsMobile();
  const [liftPx, setLiftPx] = useState(0);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const footer = document.getElementById('app-footer');
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLiftPx(Math.max(0, window.innerHeight - entry.boundingClientRect.top));
        } else {
          setLiftPx(0);
        }
      },
      { threshold: IO_THRESHOLDS },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isMobile && scenarioDrawerOpened && aiPanelOpened) {
      closeAiPanel();
    }
  }, [isMobile, scenarioDrawerOpened, aiPanelOpened, closeAiPanel]);

  if (!authenticated || activeView !== 'forecast') return null;
  if (isMobile && scenarioDrawerOpened) return null;

  const isOpen = aiPanelOpened;
  const hasKey = keyStatus !== 'absent';

  const panelHeight = isMobile
    ? 'calc(100dvh - 104px)'
    : 'min(720px, calc(100vh - 140px))';

  const { fabBottom, panelBottom, panelRight, panelMaxHeight, panelWidth } = computePanelGeometry({
    innerWidth: viewport.w,
    innerHeight: viewport.h,
    liftPx,
    isMobile,
  });

  const bg = isDark
    ? 'linear-gradient(145deg, #818cf8 0%, #6366f1 100%)'
    : 'linear-gradient(145deg, #6366f1 0%, #4338ca 100%)';

  const glowColor = isDark ? 'rgba(129,140,248,0.45)' : 'rgba(99,102,241,0.4)';
  const boxShadow = `0 4px ${isOpen ? 26 : 16}px ${glowColor}, 0 2px 8px rgba(0,0,0,0.18)`;

  return (
    <>
      <Transition
        mounted={isOpen}
        transition={panelTransition}
        duration={230}
        timingFunction="cubic-bezier(0.34, 1.56, 0.64, 1)"
      >
        {(styles) => (
          <Paper
            shadow="xl"
            radius="lg"
            withBorder={!isMobile}
            style={{
              ...styles,
              position: 'fixed',
              bottom: panelBottom,
              right: panelRight,
              width: panelWidth,
              height: panelHeight,
              maxHeight: panelMaxHeight,
              maxWidth: 'calc(100vw - 32px)',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transformOrigin: 'bottom right',
            }}
          >
            <ChatPanel />
          </Paper>
        )}
      </Transition>

      <button
        onClick={() => { if (isOpen) { closeAiPanel(); } else { openAiPanel(); } }}
        aria-label={isOpen ? 'Close AI assistant' : hasKey ? 'Open AI assistant' : 'Set up AI assistant'}
        style={{
          position: 'fixed',
          bottom: fabBottom,
          right: FAB_INSET,
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: '50%',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          background: bg,
          boxShadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 201,
          transition: 'bottom 0.28s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
          animation: !hasKey ? 'ai-fab-pulse 2.6s ease-in-out infinite' : undefined,
          userSelect: 'none',
        }}
      >
        <div style={{ position: 'relative', width: 24, height: 24 }}>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.2s ease, transform 0.22s ease',
              opacity: isOpen ? 0 : 1,
              transform: isOpen ? 'scale(0.35) rotate(-45deg)' : 'scale(1) rotate(0deg)',
              pointerEvents: 'none',
            }}
          >
            <IconSparkles size={24} color="white" />
          </span>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.2s ease, transform 0.22s ease',
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? 'scale(1) rotate(0deg)' : 'scale(0.35) rotate(45deg)',
              pointerEvents: 'none',
            }}
          >
            <IconX size={24} color="white" />
          </span>
        </div>
      </button>
    </>
  );
}
