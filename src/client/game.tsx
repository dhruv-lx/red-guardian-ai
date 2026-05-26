import { StrictMode, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';

type Severity = 'HIGH' | 'MEDIUM' | 'LOW';
type RiskTone = 'safe' | 'suspicious' | 'dangerous';
type ActionType = 'Warn User' | 'Remove Comment' | 'Temporary Mute';
type ReportStatus = 'Resolved' | 'Under Review' | 'Escalated';
type FeedTone = 'info' | 'warning' | 'success';
type ToastTone = 'info' | 'success' | 'warning';

interface ReportItem {
  id: string;
  username: string;
  issueType: string;
  severity: Severity;
  toxicCommentText: string;
  riskScore: number;
  aiConfidence: number;
  status: ReportStatus;
  warned: boolean;
  commentRemoved: boolean;
  muted: boolean;
  updateCount: number;
}

interface RiskItem {
  label: string;
  tone: RiskTone;
  score: number;
}

interface SummaryState {
  toxicitySummary: string;
  moderationRecommendation: string;
  riskSeverity: string;
}

interface ToastState {
  visible: boolean;
  message: string;
  tone: ToastTone;
}

interface FeedItem {
  id: string;
  text: string;
  isNew: boolean;
  tone: FeedTone;
}

interface MetricCardData {
  label: string;
  value: string;
  detail: string;
  accent: string;
}

const usernames = [
  'u/ZeroMercy17',
  'u/NovaScam',
  'u/CrimsonEcho',
  'u/ByteRaider',
  'u/IronFlare',
  'u/VenomReply',
  'u/ShadowCaps',
  'u/GlitchMonger',
  'u/RiotCircuit',
  'u/AshenNova',
  'u/SnareDrop',
  'u/MalicePixel',
  'u/SpamOrbit',
  'u/ToxicHelix',
  'u/ColdTrigger',
  'u/CrashVandal',
  'u/ThreadSniper',
  'u/LagPhantom',
  'u/FrostNoise',
  'u/BaitEngine',
];

const issueProfiles = [
  {
    issueType: 'Harassment',
    severity: 'HIGH' as const,
    comment:
      'You are useless, nobody wants you here, and I will keep replying until you leave this thread.',
    riskBase: 88,
    confidenceBase: 93,
  },
  {
    issueType: 'Spam Links',
    severity: 'MEDIUM' as const,
    comment:
      'Easy money here, click my crypto drop link now, I have posted it five times because mods cannot stop this.',
    riskBase: 69,
    confidenceBase: 87,
  },
  {
    issueType: 'Hate Speech',
    severity: 'HIGH' as const,
    comment:
      'People like you do not belong in this community, go back where you came from and stay silent.',
    riskBase: 94,
    confidenceBase: 96,
  },
  {
    issueType: 'Threatening Language',
    severity: 'HIGH' as const,
    comment:
      'Keep posting and I will find your account everywhere, make one more comment and see what happens.',
    riskBase: 91,
    confidenceBase: 95,
  },
  {
    issueType: 'Impersonation',
    severity: 'MEDIUM' as const,
    comment:
      'Official moderator here, send me your login code in DM or your account gets banned in ten minutes.',
    riskBase: 74,
    confidenceBase: 84,
  },
  {
    issueType: 'Targeted Bullying',
    severity: 'HIGH' as const,
    comment:
      'Everyone should downvote this clown, quote them, mock them, and make sure they never post again.',
    riskBase: 86,
    confidenceBase: 92,
  },
  {
    issueType: 'Misinformation',
    severity: 'LOW' as const,
    comment:
      'Ignore the safety rules, the exploit is real, and the only reason mods delete it is because they are hiding the truth.',
    riskBase: 58,
    confidenceBase: 79,
  },
];

const liveEventTemplates = [
  'New spam detected',
  'Toxicity increased',
  'User muted',
  'Report resolved',
  'Escalation routed to human moderator',
  'Duplicate abuse pattern linked',
];

const statusCycle: ReportStatus[] = ['Under Review', 'Escalated', 'Resolved'];

const dashboardGlobalCss = `
  :root {
    color-scheme: light;
    --rg-bg: linear-gradient(180deg, #fffaf9 0%, #fffefe 48%, #fff8fb 100%);
    --rg-surface: rgba(255, 255, 255, 0.94);
    --rg-surface-strong: rgba(255, 255, 255, 0.98);
    --rg-surface-soft: rgba(250, 244, 248, 0.92);
    --rg-text: #181b34;
    --rg-text-strong: #11162b;
    --rg-muted: #69728e;
    --rg-muted-soft: #8d96ae;
    --rg-line: rgba(233, 223, 233, 0.9);
    --rg-line-strong: rgba(246, 74, 123, 0.16);
    --rg-shadow: 0 18px 48px rgba(181, 166, 197, 0.16);
    --rg-shadow-strong: 0 24px 56px rgba(181, 166, 197, 0.2);
    --rg-primary: #ff5c7c;
    --rg-primary-soft: rgba(255, 92, 124, 0.1);
    --rg-purple: #8f5bff;
    --rg-purple-soft: rgba(143, 91, 255, 0.1);
    --rg-cyan: #4f8dff;
    --rg-cyan-soft: rgba(79, 141, 255, 0.1);
    --rg-green: #2fbe7d;
    --rg-green-soft: rgba(47, 190, 125, 0.1);
    --rg-orange: #ff9c44;
    --rg-orange-soft: rgba(255, 156, 68, 0.12);
    --rg-alert: linear-gradient(90deg, rgba(255, 242, 244, 0.98), rgba(255, 249, 250, 0.96));
    --rg-accent-glow: radial-gradient(circle, rgba(255, 92, 124, 0.1), transparent 72%);
    --rg-accent-glow-alt: radial-gradient(circle, rgba(143, 91, 255, 0.1), transparent 72%);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --rg-bg: linear-gradient(180deg, #0f111b 0%, #131725 52%, #12131f 100%);
      --rg-surface: rgba(22, 25, 39, 0.94);
      --rg-surface-strong: rgba(24, 28, 44, 0.98);
      --rg-surface-soft: rgba(29, 33, 51, 0.9);
      --rg-text: #f4f6ff;
      --rg-text-strong: #ffffff;
      --rg-muted: #a0a8c2;
      --rg-muted-soft: #8a93b1;
      --rg-line: rgba(255, 255, 255, 0.08);
      --rg-line-strong: rgba(255, 92, 124, 0.24);
      --rg-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
      --rg-shadow-strong: 0 24px 56px rgba(0, 0, 0, 0.34);
      --rg-primary: #ff6f8d;
      --rg-primary-soft: rgba(255, 111, 141, 0.12);
      --rg-purple: #a376ff;
      --rg-purple-soft: rgba(163, 118, 255, 0.12);
      --rg-cyan: #6ba2ff;
      --rg-cyan-soft: rgba(107, 162, 255, 0.12);
      --rg-green: #48ce8f;
      --rg-green-soft: rgba(72, 206, 143, 0.12);
      --rg-orange: #ffb15e;
      --rg-orange-soft: rgba(255, 177, 94, 0.12);
      --rg-alert: linear-gradient(90deg, rgba(43, 26, 34, 0.96), rgba(28, 28, 40, 0.96));
      --rg-accent-glow: radial-gradient(circle, rgba(255, 111, 141, 0.12), transparent 72%);
      --rg-accent-glow-alt: radial-gradient(circle, rgba(163, 118, 255, 0.1), transparent 72%);
    }
  }

  html, body {
    background: var(--rg-bg);
    color: var(--rg-text);
    overflow-x: visible;
    overflow-y: visible;
  }

  .guardian-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(143, 91, 255, 0.28) transparent;
  }

  .guardian-scroll::-webkit-scrollbar {
    width: 10px;
  }

  .guardian-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .guardian-scroll::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(255, 92, 124, 0.42), rgba(143, 91, 255, 0.3));
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  .guardian-scroll::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(255, 92, 124, 0.56), rgba(143, 91, 255, 0.42));
  }

  @media (max-width: 900px) {
    .guardian-shell {
      gap: 18px;
    }
  }

  @media (max-width: 640px) {
    .guardian-shell {
      gap: 16px;
    }
  }
`;

const styles: Record<string, CSSProperties> = {
  app: {
    minHeight: '100vh',
    margin: 0,
    padding: '32px 20px',
    background:
      'radial-gradient(circle at top left, rgba(255, 92, 124, 0.1), transparent 24%), radial-gradient(circle at top right, rgba(143, 91, 255, 0.08), transparent 26%), var(--rg-bg)',
    color: 'var(--rg-text)',
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    display: 'flex',
    justifyContent: 'center',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'visible',
  },
  ambientGlowLeft: {
    position: 'absolute',
    top: '6%',
    left: '-14%',
    width: '420px',
    height: '420px',
    borderRadius: '999px',
    background: 'var(--rg-accent-glow)',
    filter: 'blur(14px)',
    pointerEvents: 'none',
  },
  ambientGlowRight: {
    position: 'absolute',
    top: '18%',
    right: '-12%',
    width: '380px',
    height: '380px',
    borderRadius: '999px',
    background: 'var(--rg-accent-glow-alt)',
    filter: 'blur(14px)',
    pointerEvents: 'none',
  },
  shell: {
    width: '100%',
    maxWidth: '1180px',
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
    position: 'relative',
    zIndex: 1,
    transition: 'opacity 420ms ease, transform 420ms ease',
    overflow: 'visible',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '28px',
    borderRadius: '24px',
    background: 'var(--rg-surface)',
    border: '1px solid var(--rg-line)',
    boxShadow: 'var(--rg-shadow-strong)',
    backdropFilter: 'blur(12px)',
    flexWrap: 'wrap',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  shield: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #ff365b 0%, #ff5f7c 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 16px 34px rgba(255, 92, 124, 0.18)',
    flexShrink: 0,
  },
  shieldSvg: {
    width: '34px',
    height: '34px',
    display: 'block',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  title: {
    margin: 0,
    fontSize: '32px',
    lineHeight: 1.02,
    letterSpacing: '-0.04em',
    fontWeight: 800,
    textWrap: 'balance',
  },
  subtitle: {
    margin: 0,
    color: 'var(--rg-muted)',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '999px',
    background: 'var(--rg-surface-soft)',
    border: '1px solid var(--rg-line)',
    color: 'var(--rg-text)',
    fontSize: '13px',
    fontWeight: 600,
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    background: 'var(--rg-green)',
    boxShadow: '0 0 14px rgba(72, 206, 143, 0.35)',
  },
  monitorBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '999px',
    background: 'var(--rg-primary-soft)',
    border: '1px solid var(--rg-line-strong)',
    color: 'var(--rg-primary)',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    boxShadow: '0 0 18px rgba(255, 92, 124, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.18)',
  },
  pulseWrap: {
    position: 'relative',
    width: '10px',
    height: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCore: {
    width: '8px',
    height: '8px',
    borderRadius: '999px',
    background: 'var(--rg-primary)',
    boxShadow: '0 0 12px rgba(255, 92, 124, 0.45)',
  },
  pulseRing: {
    position: 'absolute',
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    border: '1px solid rgba(255, 92, 124, 0.32)',
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '18px',
  },
  analyticsCard: {
    padding: '20px 22px',
    borderRadius: '22px',
    background: 'var(--rg-surface-strong)',
    border: '1px solid var(--rg-line)',
    boxShadow: 'var(--rg-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(12px)',
    minHeight: '132px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'border-color 160ms ease, box-shadow 160ms ease',
  },
  analyticsLabel: {
    margin: 0,
    fontSize: '12px',
    letterSpacing: '0.1em',
    fontWeight: 800,
    color: 'var(--rg-muted-soft)',
    textTransform: 'uppercase',
  },
  analyticsValue: {
    margin: '14px 0 8px',
    fontSize: '36px',
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-0.04em',
  },
  analyticsDetail: {
    margin: 0,
    color: 'var(--rg-muted)',
    fontSize: '13px',
    lineHeight: 1.55,
  },
  alertBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    padding: '15px 18px',
    borderRadius: '18px',
    background: 'var(--rg-alert)',
    border: '1px solid var(--rg-line-strong)',
    color: 'var(--rg-text)',
    boxShadow: '0 16px 34px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
    transition: 'opacity 220ms ease, border-color 220ms ease',
    flexWrap: 'wrap',
  },
  alertLabel: {
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    color: 'var(--rg-primary)',
  },
  alertText: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--rg-text)',
    flex: 1,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '22px',
    overflow: 'visible',
  },
  primaryColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    minWidth: '320px',
    overflow: 'visible',
  },
  secondaryColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    minWidth: '320px',
    overflow: 'visible',
  },
  card: {
    borderRadius: '24px',
    padding: '24px 24px 32px',
    background: 'var(--rg-surface)',
    border: '1px solid var(--rg-line)',
    boxShadow: 'var(--rg-shadow), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(12px)',
    transition: 'border-color 220ms ease, box-shadow 220ms ease',
    overflow: 'visible',
    minHeight: 'fit-content',
    maxHeight: 'none',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '18px',
    flexWrap: 'wrap',
  },
  cardTitleWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '19px',
    fontWeight: 750,
    letterSpacing: '-0.02em',
  },
  cardCaption: {
    margin: 0,
    color: 'var(--rg-muted)',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  badge: {
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'var(--rg-primary-soft)',
    border: '1px solid var(--rg-line-strong)',
    color: 'var(--rg-primary)',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.04em',
    boxShadow: '0 0 18px rgba(255, 92, 124, 0.08)',
  },
  reportScroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: '13px',
    maxHeight: '580px',
    overflowY: 'auto',
    paddingRight: '10px',
    paddingBottom: '4px',
  },
  reportButton: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    width: '100%',
    padding: '18px',
    borderRadius: '20px',
    background: 'var(--rg-surface-strong)',
    border: '1px solid var(--rg-line)',
    transition:
      'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), border-color 240ms ease, box-shadow 240ms ease, background 240ms ease',
    textAlign: 'left',
    cursor: 'pointer',
    minHeight: '132px',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  avatar: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'linear-gradient(135deg, rgba(255, 92, 124, 0.14), rgba(143, 91, 255, 0.12))',
    color: 'var(--rg-text-strong)',
    fontSize: '14px',
    fontWeight: 800,
    flexShrink: 0,
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 12px 22px rgba(0, 0, 0, 0.18)',
  },
  reportText: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  reportTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    minWidth: 0,
  },
  reportUser: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--rg-text-strong)',
    letterSpacing: '-0.01em',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 'calc(100% - 118px)',
  },
  reportReason: {
    margin: '4px 0 0',
    color: 'var(--rg-muted-soft)',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  reportSnippet: {
    margin: '10px 0 0',
    color: 'var(--rg-muted)',
    fontSize: '12px',
    lineHeight: 1.65,
    opacity: 0.92,
  },
  reportMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px',
    maxWidth: '100%',
    overflow: 'visible',
    alignItems: 'center',
  },
  miniPill: {
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'var(--rg-surface-soft)',
    border: '1px solid var(--rg-line)',
    color: 'var(--rg-text)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.02em',
    whiteSpace: 'normal',
    flexShrink: 1,
    minWidth: 'fit-content',
    display: 'inline-block',
    visibility: 'visible',
    opacity: 1,
  },
  summaryBox: {
    padding: '20px',
    borderRadius: '20px',
    background: 'var(--rg-surface-soft)',
    border: '1px solid var(--rg-line)',
    color: 'var(--rg-text)',
    lineHeight: 1.7,
    fontSize: '15px',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 12px 30px rgba(181, 166, 197, 0.14)',
    transition: 'border-color 260ms ease, box-shadow 260ms ease, transform 260ms ease',
  },
  summaryHeadline: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  summarySubject: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--rg-text-strong)',
    letterSpacing: '-0.01em',
  },
  summaryText: {
    margin: 0,
    color: 'var(--rg-text)',
    lineHeight: 1.72,
  },
  commentBlock: {
    marginTop: '16px',
    padding: '15px 16px',
    borderRadius: '16px',
    background: 'var(--rg-surface-strong)',
    border: '1px solid var(--rg-line)',
    color: 'var(--rg-text)',
    fontSize: '13px',
    lineHeight: 1.7,
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
  },
  summaryMeta: {
    marginTop: '14px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  summaryPill: {
    padding: '7px 12px',
    borderRadius: '999px',
    background: 'var(--rg-surface-strong)',
    border: '1px solid var(--rg-line)',
    color: 'var(--rg-text)',
    fontSize: '12px',
    fontWeight: 700,
  },
  confidenceBlock: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  confidenceRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    fontSize: '13px',
    color: 'var(--rg-muted)',
  },
  meterTrack: {
    width: '100%',
    height: '10px',
    borderRadius: '999px',
    background: 'rgba(128, 139, 166, 0.16)',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.22)',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '14px',
    overflow: 'visible',
    minHeight: 'auto',
  },
  actionButton: {
    border: '1px solid var(--rg-line)',
    borderRadius: '20px',
    padding: '18px 16px',
    background: 'var(--rg-surface-strong)',
    color: 'var(--rg-text-strong)',
    textAlign: 'left',
    cursor: 'pointer',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
    transition:
      'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), border-color 240ms ease, box-shadow 240ms ease, background 240ms ease',
    minHeight: 'auto',
  },
  actionLabel: {
    display: 'block',
    fontSize: '15px',
    fontWeight: 700,
    marginBottom: '6px',
  },
  actionHint: {
    display: 'block',
    color: 'var(--rg-muted)',
    fontSize: '12px',
    lineHeight: 1.5,
  },
  actionState: {
    marginTop: '16px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    overflow: 'visible',
    paddingBottom: '8px',
    width: '100%',
    position: 'relative',
    zIndex: 2,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    minHeight: 'fit-content',
    maxHeight: 'none',
  },
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '13px',
  },
  feedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '15px 16px',
    borderRadius: '18px',
    background: 'var(--rg-surface-strong)',
    border: '1px solid var(--rg-line)',
    transition:
      'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), border-color 240ms ease, opacity 240ms ease, background 240ms ease',
  },
  feedDot: {
    width: '9px',
    height: '9px',
    borderRadius: '999px',
    background: '#41d992',
    boxShadow: '0 0 14px rgba(65, 217, 146, 0.5)',
    flexShrink: 0,
  },
  feedText: {
    margin: 0,
    color: 'var(--rg-text)',
    fontSize: '13px',
    lineHeight: 1.55,
  },
  riskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  riskRow: {
    padding: '15px 16px',
    borderRadius: '18px',
    background: 'var(--rg-surface-strong)',
    border: '1px solid var(--rg-line)',
    transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), border-color 220ms ease, background 220ms ease, box-shadow 220ms ease',
  },
  riskTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '10px',
  },
  riskLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: 700,
  },
  riskDot: {
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    flexShrink: 0,
  },
  footer: {
    textAlign: 'center',
    color: 'var(--rg-muted)',
    fontSize: '12px',
    paddingBottom: '14px',
    letterSpacing: '0.04em',
  },
  toast: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    padding: '15px 18px',
    borderRadius: '18px',
    background: 'var(--rg-surface-strong)',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.34), 0 0 24px rgba(87, 217, 255, 0.08)',
    color: 'var(--rg-text)',
    fontSize: '13px',
    fontWeight: 700,
    zIndex: 10,
    transition: 'opacity 180ms ease, transform 180ms ease',
    pointerEvents: 'none',
    minWidth: '220px',
    backdropFilter: 'blur(14px)',
  },
  emptyState: {
    borderRadius: '20px',
    padding: '24px 18px',
    border: '1px dashed rgba(133, 152, 180, 0.22)',
    background: 'rgba(12, 20, 31, 0.68)',
    textAlign: 'center',
  },
  emptyTitle: {
    margin: '0 0 8px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#edf5fd',
  },
  emptyText: {
    margin: 0,
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#8ca6bf',
  },
};

const severityStyles: Record<Severity, CSSProperties> = {
  HIGH: {
    padding: '7px 11px',
    borderRadius: '999px',
    background: 'rgba(255, 68, 93, 0.14)',
    border: '1px solid rgba(255, 68, 93, 0.42)',
    color: '#e92f52',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    maxWidth: '100%',
  },
  MEDIUM: {
    padding: '7px 11px',
    borderRadius: '999px',
    background: 'rgba(255, 169, 40, 0.16)',
    border: '1px solid rgba(255, 169, 40, 0.46)',
    color: '#c97400',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    maxWidth: '100%',
  },
  LOW: {
    padding: '7px 11px',
    borderRadius: '999px',
    background: 'rgba(47, 190, 125, 0.14)',
    border: '1px solid rgba(47, 190, 125, 0.42)',
    color: '#15975d',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    maxWidth: '100%',
  },
};

const riskToneStyles: Record<RiskTone, { dot: string; bar: string; border: string }> = {
  safe: {
    dot: '#41d992',
    bar: 'linear-gradient(90deg, #1dbf73 0%, #49e49a 100%)',
    border: 'rgba(65, 217, 146, 0.24)',
  },
  suspicious: {
    dot: '#f2c14e',
    bar: 'linear-gradient(90deg, #dba500 0%, #ffd166 100%)',
    border: 'rgba(242, 193, 78, 0.24)',
  },
  dangerous: {
    dot: '#ff5b5b',
    bar: 'linear-gradient(90deg, #ff3d3d 0%, #ff7b54 100%)',
    border: 'rgba(255, 91, 91, 0.28)',
  },
};

const statusStyles: Record<ReportStatus, CSSProperties> = {
  Resolved: {
    background: 'rgba(65, 217, 146, 0.16)',
    border: '1px solid rgba(65, 217, 146, 0.3)',
    color: '#98f0bf',
    maxWidth: '112px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  'Under Review': {
    background: 'rgba(0, 179, 255, 0.12)',
    border: '1px solid rgba(0, 179, 255, 0.26)',
    color: '#8fddff',
    maxWidth: '112px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  Escalated: {
    background: 'rgba(255, 91, 91, 0.14)',
    border: '1px solid rgba(255, 91, 91, 0.28)',
    color: '#ffabab',
    maxWidth: '112px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

const feedToneStyles: Record<FeedTone, { dot: string; border: string }> = {
  info: {
    dot: '#57d9ff',
    border: 'rgba(87, 217, 255, 0.22)',
  },
  warning: {
    dot: '#ffb85c',
    border: 'rgba(255, 184, 92, 0.22)',
  },
  success: {
    dot: '#41d992',
    border: 'rgba(65, 217, 146, 0.22)',
  },
};

const toastToneStyles: Record<ToastTone, CSSProperties> = {
  info: {
    border: '1px solid rgba(87, 217, 255, 0.35)',
    color: '#dff7ff',
  },
  success: {
    border: '1px solid rgba(65, 217, 146, 0.35)',
    color: '#e7fff2',
  },
  warning: {
    border: '1px solid rgba(255, 184, 92, 0.35)',
    color: '#fff0d8',
  },
};

const ShieldGlyph = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 40 40"
    fill="none"
    style={styles.shieldSvg}
  >
    <path
      d="M20 4L8.5 8.8V18.2C8.5 25.8 13.2 32.6 20 35.6C26.8 32.6 31.5 25.8 31.5 18.2V8.8L20 4Z"
      fill="white"
      opacity="0.96"
    />
    <path
      d="M20 9.1L13.5 11.8V18.3C13.5 22.8 16 27 20 29.4C24 27 26.5 22.8 26.5 18.3V11.8L20 9.1Z"
      fill="#ff365b"
    />
    <path d="M20 9.1V29.4C24 27 26.5 22.8 26.5 18.3V11.8L20 9.1Z" fill="#ff5f7c" />
    <path d="M17.2 17.5L19.1 19.4L23.2 15.2" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WindowLogo = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 48 48"
    fill="none"
    style={{ width: '56px', height: '56px', display: 'block' }}
  >
    <rect x="4" y="4" width="40" height="40" rx="12" fill="#ff6b35" />
    <path
      d="M24 10L14 14V22C14 28.5 18 34 24 36C30 34 34 28.5 34 22V14L24 10Z"
      fill="white"
      opacity="0.95"
    />
    <path
      d="M24 14L18 16V22C18 25.5 20 29 24 30C28 29 30 25.5 30 22V16L24 14Z"
      fill="#ff6b35"
    />
    <path d="M24 14V30C28 29 30 25.5 30 22V16L24 14Z" fill="#ff8c5a" />
    <path d="M21 20L22.5 21.5L26 17.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getRiskTone = (riskSeverity: string): RiskTone => {
  if (riskSeverity.toUpperCase() === 'HIGH') return 'dangerous';
  if (riskSeverity.toUpperCase() === 'LOW') return 'safe';
  return 'suspicious';
};

const getTimeLabel = () =>
  new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const getInitials = (username: string) =>
  username
    .replace('u/', '')
    .slice(0, 2)
    .toUpperCase();

function createSummary(report: ReportItem): SummaryState {
  const riskSeverity =
    report.riskScore >= 85 ? 'HIGH' : report.riskScore >= 65 ? 'MEDIUM' : 'LOW';

  const statusContext =
    report.status === 'Resolved'
      ? 'The account is currently stabilized after earlier intervention.'
      : report.status === 'Escalated'
        ? 'The account is showing persistent signals that justify human escalation.'
        : 'The account remains in the active review lane for automated triage.';

  const toxicitySummary = `${report.issueType} markers were detected in multiple interactions from ${report.username}. The flagged language shows ${report.severity.toLowerCase()} severity intent with a live risk score of ${report.riskScore}. ${statusContext}`;

  const moderationRecommendation =
    report.status === 'Resolved'
      ? 'Recommendation: keep watchlist monitoring enabled and archive the report unless the behavior returns.'
      : report.riskScore >= 90
        ? 'Recommendation: remove the content immediately, apply a temporary mute, and escalate to a human moderator.'
        : report.riskScore >= 72
          ? 'Recommendation: remove the flagged comment and keep the user under active review for repeat behavior.'
          : 'Recommendation: issue a warning, preserve evidence, and monitor for continued escalation.';

  return {
    toxicitySummary,
    moderationRecommendation,
    riskSeverity,
  };
}

function generateFakeReports(total = 18): ReportItem[] {
  return Array.from({ length: total }, (_, index) => {
    const profile = issueProfiles[index % issueProfiles.length] ?? issueProfiles[0]!;
    const status = statusCycle[index % statusCycle.length] ?? 'Under Review';
    const riskScore = clamp(profile.riskBase + ((index * 7) % 13) - 6, 48, 99);
    const aiConfidence = clamp(profile.confidenceBase + ((index * 5) % 11) - 5, 72, 99);

    return {
      id: `report-${index + 1}`,
      username: usernames[index % usernames.length] ?? `u/Guardian${index + 1}`,
      issueType: profile.issueType,
      severity: profile.severity,
      toxicCommentText: profile.comment,
      riskScore,
      aiConfidence,
      status,
      warned: status !== 'Resolved',
      commentRemoved: status === 'Resolved',
      muted: status === 'Escalated',
      updateCount: index % 4,
    };
  });
}

function createInitialFeed(report: ReportItem): FeedItem[] {
  return [
    {
      id: 'feed-start-1',
      text: `${getTimeLabel()} AI queue synced with ${report.username} at the top of the review stack.`,
      isNew: false,
      tone: 'info',
    },
    {
      id: 'feed-start-2',
      text: `${getTimeLabel()} ${report.issueType} pattern grouped with recent platform abuse reports.`,
      isNew: false,
      tone: 'warning',
    },
    {
      id: 'feed-start-3',
      text: `${getTimeLabel()} Auto-triage confidence stabilized at ${report.aiConfidence}% for the selected case.`,
      isNew: false,
      tone: 'success',
    },
  ];
}

function buildActionResult(
  action: ActionType,
  report: ReportItem
): {
  status: ReportStatus;
  message: string;
  tone: ToastTone;
  feedTone: FeedTone;
} {
  if (action === 'Warn User') {
    return {
      status: 'Under Review' as ReportStatus,
      message: `Warning sent to ${report.username}`,
      tone: 'warning' as ToastTone,
      feedTone: 'warning' as FeedTone,
    };
  }

  if (action === 'Remove Comment') {
    return {
      status: 'Resolved' as ReportStatus,
      message: `Flagged comment removed for ${report.username}`,
      tone: 'success' as ToastTone,
      feedTone: 'success' as FeedTone,
    };
  }

  return {
    status: 'Escalated' as ReportStatus,
    message: `Temporary mute applied to ${report.username}`,
    tone: 'info' as ToastTone,
    feedTone: 'info' as FeedTone,
  };
}

const initialReports = generateFakeReports(18);

function AnalyticsCards({ items }: { items: MetricCardData[] }) {
  return (
    <section style={styles.analyticsGrid}>
      {items.map((item, index) => (
        <article
          key={item.label}
          style={{
            ...styles.analyticsCard,
            boxShadow:
              index === 0
                ? 'var(--rg-shadow-strong), 0 0 24px rgba(255, 92, 124, 0.08)'
                : 'var(--rg-shadow)',
          }}
        >
          <p style={styles.analyticsLabel}>{item.label}</p>
          <p style={{ ...styles.analyticsValue, color: item.accent }}>{item.value}</p>
          <p style={styles.analyticsDetail}>{item.detail}</p>
        </article>
      ))}
    </section>
  );
}

function StatusLabel({ status }: { status: ReportStatus }) {
  return (
    <span
      style={{
        ...styles.miniPill,
        ...statusStyles[status],
        marginLeft: 'auto',
        flexShrink: 0,
      }}
    >
      {status}
    </span>
  );
}

function ReportQueueCard({
  items,
  selectedId,
  onSelect,
}: {
  items: ReportItem[];
  selectedId: string;
  onSelect: (report: ReportItem) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitleWrap}>
          <h2 style={styles.cardTitle}>Moderation Queue</h2>
          <p style={styles.cardCaption}>Live scrolling queue of active reported users</p>
        </div>
        <span style={styles.badge}>{items.length} Cases Loaded</span>
      </div>
      <div style={styles.reportScroll} className="guardian-scroll">
        {items.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>No live reports available</p>
            <p style={styles.emptyText}>The moderation queue will populate as new incidents arrive.</p>
          </div>
        ) : null}
        {items.map((report) => {
          const isSelected = report.id === selectedId;
          const isHovered = hoveredId === report.id;

          return (
            <button
              key={report.id}
              type="button"
              onClick={() => onSelect(report)}
              onMouseEnter={() => setHoveredId(report.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                ...styles.reportButton,
                transform: 'translateY(0)',
                borderColor: isSelected
                  ? 'var(--rg-line-strong)'
                  : isHovered
                    ? 'rgba(143, 91, 255, 0.2)'
                    : 'var(--rg-line)',
                background: isSelected
                  ? 'var(--rg-primary-soft)'
                  : 'var(--rg-surface-strong)',
                boxShadow: isSelected
                  ? '0 16px 30px rgba(255, 92, 124, 0.12)'
                  : isHovered
                    ? 'var(--rg-shadow)'
                    : 'none',
              }}
            >
              <div style={styles.avatar}>{getInitials(report.username)}</div>
              <div style={styles.reportText}>
                <div style={styles.reportTop}>
                  <p style={styles.reportUser}>{report.username}</p>
                  <StatusLabel status={report.status} />
                </div>
                <p style={styles.reportReason}>{report.issueType}</p>
                <p style={styles.reportSnippet}>"{report.toxicCommentText}"</p>
                <div style={styles.reportMeta}>
                  <span style={severityStyles[report.severity]}>{report.severity}</span>
                  <span style={styles.miniPill}>Risk {report.riskScore}</span>
                  <span style={styles.miniPill}>AI {report.aiConfidence}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SummaryCard({
  selectedReport,
  summary,
}: {
  selectedReport: ReportItem;
  summary: SummaryState;
}) {
  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitleWrap}>
          <h2 style={styles.cardTitle}>AI Summary</h2>
          <p style={styles.cardCaption}>Model-style case synthesis for the selected user</p>
        </div>
        <span
          style={{
            ...styles.badge,
            background: 'rgba(0, 179, 255, 0.12)',
            border: '1px solid var(--rg-line-strong)',
            color: 'var(--rg-purple)',
          }}
        >
          Live Insight
        </span>
      </div>
      <div
        style={{
          ...styles.summaryBox,
        }}
      >
        <div style={styles.summaryHeadline}>
          <p style={styles.summarySubject}>Focused Report: {selectedReport.username}</p>
          <StatusLabel status={selectedReport.status} />
        </div>
        <p style={styles.summaryText}>{summary.toxicitySummary}</p>
        <div style={styles.commentBlock}>
          <strong>Flagged Comment:</strong> "{selectedReport.toxicCommentText}"
        </div>
        <div style={styles.summaryMeta}>
          <span style={styles.summaryPill}>Issue Type: {selectedReport.issueType}</span>
          <span style={styles.summaryPill}>Risk Severity: {summary.riskSeverity}</span>
          <span style={styles.summaryPill}>{summary.moderationRecommendation}</span>
        </div>
        <div style={styles.confidenceBlock}>
          <div style={styles.confidenceRow}>
            <span>AI Confidence</span>
            <span>{selectedReport.aiConfidence}%</span>
          </div>
          <div style={styles.meterTrack}>
            <div
              style={{
                width: `${selectedReport.aiConfidence}%`,
                height: '100%',
                borderRadius: '999px',
                background: 'linear-gradient(90deg, var(--rg-purple) 0%, var(--rg-cyan) 100%)',
                transition: 'width 320ms ease',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionsCard({
  selectedReport,
  onAction,
}: {
  selectedReport: ReportItem;
  onAction: (action: ActionType) => void;
}) {
  const [hoveredAction, setHoveredAction] = useState<ActionType | null>(null);

  const actions: Array<{ label: ActionType; hint: string }> = [
    { label: 'Warn User', hint: `Issue an automated warning to ${selectedReport.username}` },
    {
      label: 'Remove Comment',
      hint: `Take down the flagged ${selectedReport.issueType.toLowerCase()} content`,
    },
    {
      label: 'Temporary Mute',
      hint: 'Apply a cooldown while moderators review the behavior cluster',
    },
  ];

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitleWrap}>
          <h2 style={styles.cardTitle}>Suggested Actions</h2>
          <p style={styles.cardCaption}>Functional moderation controls for the selected case</p>
        </div>
      </div>
      <div style={styles.actionGrid}>
        {actions.map((action) => {
          const isHovered = hoveredAction === action.label;

          return (
            <button
              key={action.label}
              type="button"
              onClick={() => onAction(action.label)}
              onMouseEnter={() => setHoveredAction(action.label)}
              onMouseLeave={() => setHoveredAction(null)}
              style={{
                ...styles.actionButton,
                transform: 'translateY(0)',
                borderColor: isHovered
                  ? 'var(--rg-line-strong)'
                  : 'var(--rg-line)',
                boxShadow: isHovered
                  ? 'var(--rg-shadow)'
                  : 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
              }}
            >
              <span style={styles.actionLabel}>{action.label}</span>
              <span style={styles.actionHint}>{action.hint}</span>
            </button>
          );
        })}
      </div>
      <div style={styles.actionState}>
        <span style={styles.miniPill}>
          Warning: {selectedReport.warned ? 'Issued' : 'Pending'}
        </span>
        <span style={styles.miniPill}>
          Comment: {selectedReport.commentRemoved ? 'Removed' : 'Visible'}
        </span>
        <span style={styles.miniPill}>
          Mute: {selectedReport.muted ? 'Active' : 'Inactive'}
        </span>
      </div>
    </section>
  );
}

function ActivityFeedCard({ items }: { items: FeedItem[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitleWrap}>
          <h2 style={styles.cardTitle}>Moderation Activity Feed</h2>
          <p style={styles.cardCaption}>Selections, automated signals, and moderator actions</p>
        </div>
      </div>
      <div style={styles.feedList}>
        {items.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>No moderation activity yet</p>
            <p style={styles.emptyText}>Actions, selections, and live AI updates will appear here in real time.</p>
          </div>
        ) : null}
        {items.map((item, index) => {
          const tone = feedToneStyles[item.tone];

          return (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                ...styles.feedRow,
                transform: 'translateY(0)',
                opacity: item.isNew ? 1 : 0.94,
                background: item.isNew ? 'var(--rg-primary-soft)' : 'var(--rg-surface-strong)',
                borderColor:
                  item.isNew || hoveredIndex === index ? tone.border : 'var(--rg-line)',
              }}
            >
              <span style={{ ...styles.feedDot, background: tone.dot }} />
              <p style={styles.feedText}>{item.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RiskScoreCard({
  summary,
  selectedReport,
}: {
  summary: SummaryState;
  selectedReport: ReportItem;
}) {
  const dynamicRiskItems = useMemo<RiskItem[]>(() => {
    const severity = summary.riskSeverity.toUpperCase();

    return [
      {
        label: 'Green Safe',
        tone: 'safe',
        score: severity === 'LOW' ? Math.max(48, 100 - selectedReport.riskScore) : 18,
      },
      {
        label: 'Yellow Suspicious',
        tone: 'suspicious',
        score: severity === 'MEDIUM' ? selectedReport.riskScore : 58,
      },
      {
        label: 'Red Dangerous',
        tone: 'dangerous',
        score: severity === 'HIGH' ? selectedReport.riskScore : 34,
      },
    ];
  }, [selectedReport.riskScore, summary.riskSeverity]);

  const activeTone = getRiskTone(summary.riskSeverity);

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitleWrap}>
          <h2 style={styles.cardTitle}>Risk Score</h2>
          <p style={styles.cardCaption}>Behavior severity indicators for the live case</p>
        </div>
      </div>
      <div style={styles.riskList}>
        {dynamicRiskItems.map((risk) => {
          const tone = riskToneStyles[risk.tone];
          const isActive = risk.tone === activeTone;

          return (
            <div
              key={risk.label}
              style={{
                ...styles.riskRow,
                transform: 'translateY(0)',
                borderColor: isActive ? tone.border : 'rgba(133, 152, 180, 0.4)',
                background: isActive ? 'var(--rg-primary-soft)' : 'rgba(255, 255, 255, 0.7)',
                boxShadow: isActive ? '0 0 20px rgba(255, 92, 124, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
              }}
            >
              <div style={styles.riskTop}>
                <div style={styles.riskLabel}>
                  <span style={{ ...styles.riskDot, background: tone.dot }} />
                  <span>{risk.label}</span>
                </div>
                <span style={{ color: 'var(--rg-text)', fontWeight: 700 }}>{risk.score}%</span>
              </div>
              <div style={styles.meterTrack}>
                <div
                  style={{
                    width: `${risk.score}%`,
                    height: '100%',
                    borderRadius: '999px',
                    background: tone.bar,
                    transition: 'width 320ms ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function App() {
  const [reports, setReports] = useState<ReportItem[]>(() => initialReports);
  const [selectedReportId, setSelectedReportId] = useState<string>('report-1');
  const [activityFeed, setActivityFeed] = useState<FeedItem[]>(() => createInitialFeed(initialReports[0]!));
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    tone: 'success',
  });
  const [liveAlert, setLiveAlert] = useState('New spam detected in the live moderation queue.');
  const [aiActionsToday, setAiActionsToday] = useState(184);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? reports[0],
    [reports, selectedReportId]
  );

  const summary = useMemo(
    () =>
      selectedReport
        ? createSummary(selectedReport)
        : {
            toxicitySummary: 'No report selected.',
            moderationRecommendation: 'Recommendation unavailable.',
            riskSeverity: 'LOW',
          },
    [selectedReport]
  );

  const analytics = useMemo<MetricCardData[]>(() => {
    const activeReports = reports.filter((report) => report.status !== 'Resolved').length;
    const highRiskUsers = reports.filter(
      (report) => report.riskScore >= 80 || report.status === 'Escalated'
    ).length;
    const resolved = reports.filter((report) => report.status === 'Resolved').length;
    const moderatorEfficiency = clamp(
      Math.round((resolved / reports.length) * 100 + aiActionsToday / 20),
      72,
      98
    );

    return [
      {
        label: 'Active Reports',
        value: `${activeReports}`,
        detail: `${reports.length} users currently loaded in the queue`,
        accent: 'var(--rg-text-strong)',
      },
      {
        label: 'High Risk Users',
        value: `${highRiskUsers}`,
        detail: 'Risk score above 80 or active escalation path',
        accent: '#ff9f8e',
      },
      {
        label: 'AI Actions Today',
        value: `${aiActionsToday}`,
        detail: 'Warnings, removals, and mutes issued this shift',
        accent: '#7ddcff',
      },
      {
        label: 'Moderator Efficiency',
        value: `${moderatorEfficiency}%`,
        detail: `${resolved} reports resolved with automated triage support`,
        accent: '#86efac',
      },
    ];
  }, [aiActionsToday, reports]);

  useEffect(() => {
    if (!toast.visible) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }));
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [toast.visible]);

  useEffect(() => {
    const liveTimer = window.setInterval(() => {
      setReports((currentReports) => {
        const targetIndex = Math.floor(Math.random() * currentReports.length);
        const eventIndex = Math.floor(Math.random() * liveEventTemplates.length);
        const target = currentReports[targetIndex];

        if (!target) {
          return currentReports;
        }

        const event = liveEventTemplates[eventIndex];
        let nextStatus = target.status;
        let nextRisk = target.riskScore;
        let nextConfidence = target.aiConfidence;
        let tone: FeedTone = 'info';

        if (event === 'Toxicity increased') {
          nextStatus = 'Escalated';
          nextRisk = clamp(target.riskScore + 6, 45, 99);
          nextConfidence = clamp(target.aiConfidence + 2, 70, 99);
          tone = 'warning';
        } else if (event === 'Report resolved') {
          nextStatus = 'Resolved';
          nextRisk = clamp(target.riskScore - 12, 35, 99);
          tone = 'success';
        } else if (event === 'User muted') {
          nextStatus = 'Escalated';
          nextRisk = clamp(target.riskScore - 4, 35, 99);
          tone = 'info';
        } else if (event === 'New spam detected') {
          nextStatus = 'Under Review';
          nextRisk = clamp(target.riskScore + 3, 35, 99);
          tone = 'warning';
        } else if (event === 'Escalation routed to human moderator') {
          nextStatus = 'Escalated';
          nextConfidence = clamp(target.aiConfidence + 1, 70, 99);
          tone = 'info';
        } else {
          nextStatus = target.status === 'Resolved' ? 'Under Review' : target.status;
          nextRisk = clamp(target.riskScore + 2, 35, 99);
          tone = 'warning';
        }

        setLiveAlert(`${event}: ${target.username} | ${target.issueType} | ${getTimeLabel()}`);
        setActivityFeed((currentFeed) => [
          {
            id: `feed-live-${Date.now()}`,
            text: `${getTimeLabel()} ${event} for ${target.username}. Status now ${nextStatus}.`,
            isNew: true,
            tone,
          },
          ...currentFeed.map((item) => ({ ...item, isNew: false })),
        ].slice(0, 7));

        if (event === 'User muted' || event === 'Report resolved') {
          setAiActionsToday((count) => count + 1);
        }

        return currentReports.map((report, index) =>
          index === targetIndex
            ? {
                ...report,
                status: nextStatus,
                riskScore: nextRisk,
                aiConfidence: nextConfidence,
                muted: event === 'User muted' ? true : report.muted,
                commentRemoved:
                  event === 'Report resolved' ? true : report.commentRemoved,
                updateCount: report.updateCount + 1,
              }
            : report
        );
      });
    }, 4200);

    return () => window.clearInterval(liveTimer);
  }, []);

  const handleSelectReport = (report: ReportItem) => {
    setSelectedReportId(report.id);
    setActivityFeed(
      (current): FeedItem[] =>
        [
          {
            id: `feed-select-${Date.now()}`,
            text: `${getTimeLabel()} Moderator opened ${report.username}. Summary, recommendation, confidence, and live context refreshed.`,
            isNew: true,
            tone: 'info' as FeedTone,
          },
          ...current.map((item) => ({ ...item, isNew: false })),
        ].slice(0, 7)
    );
  };

  const handleAction = (action: ActionType) => {
    const activeReport = reports.find((report) => report.id === selectedReportId);

    if (!activeReport) {
      return;
    }

    const result = buildActionResult(action, activeReport);

    setReports((current) =>
      current.map((report) =>
        report.id === selectedReportId
          ? {
              ...report,
              status: result.status,
              warned: action === 'Warn User' ? true : report.warned,
              commentRemoved:
                action === 'Remove Comment' ? true : report.commentRemoved,
              muted: action === 'Temporary Mute' ? true : report.muted,
              riskScore:
                action === 'Remove Comment'
                  ? clamp(report.riskScore - 14, 30, 99)
                  : action === 'Warn User'
                    ? clamp(report.riskScore - 5, 30, 99)
                    : clamp(report.riskScore + 2, 30, 99),
              aiConfidence:
                action === 'Temporary Mute'
                  ? clamp(report.aiConfidence + 2, 70, 99)
                  : clamp(report.aiConfidence + 1, 70, 99),
            }
          : report
      )
    );

    setToast({
      visible: true,
      message: result.message,
      tone: result.tone,
    });
    setLiveAlert(`${action} executed for ${activeReport.username} at ${getTimeLabel()}.`);
    setAiActionsToday((count) => count + 1);
    setActivityFeed((current) => [
      {
        id: `feed-action-${Date.now()}`,
        text: `${getTimeLabel()} ${action} executed for ${activeReport.username}. Case status updated to ${result.status}.`,
        isNew: true,
        tone: result.feedTone,
      },
      ...current.map((item) => ({ ...item, isNew: false })),
    ].slice(0, 7));
  };

  if (!selectedReport) {
    return null;
  }

  return (
    <div style={styles.app}>
      <style>{dashboardGlobalCss}</style>
      <div style={styles.ambientGlowLeft} />
      <div style={styles.ambientGlowRight} />
      <main style={styles.shell} className="guardian-shell">
        {toast.visible ? (
          <div
            style={{
              ...styles.toast,
              ...toastToneStyles[toast.tone],
            }}
          >
            {toast.message}
          </div>
        ) : null}

        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.shield}>
              <WindowLogo />
            </div>
            <div style={styles.titleBlock}>
              <h1 style={styles.title}>Red Guardian AI</h1>
              <p style={styles.subtitle}>AI-powered live moderation command center</p>
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.monitorBadge}>
              <span style={styles.pulseWrap}>
                <span
                  style={{
                    ...styles.pulseRing,
                    opacity: 0.45,
                  }}
                />
                <span style={styles.pulseCore} />
              </span>
              LIVE AI MONITORING
            </div>
            <div style={styles.statusPill}>
              <span style={styles.statusDot} />
              18 Simulated Reports Streaming
            </div>
          </div>
        </header>

        <AnalyticsCards items={analytics} />

        <div style={styles.alertBanner}>
          <span style={styles.alertLabel}>LIVE ALERT</span>
          <p style={styles.alertText}>{liveAlert}</p>
        </div>

        <section style={styles.grid}>
          <div style={styles.primaryColumn}>
            <ReportQueueCard
              items={reports}
              selectedId={selectedReport.id}
              onSelect={handleSelectReport}
            />
            <SummaryCard selectedReport={selectedReport} summary={summary} />
          </div>
          <div style={styles.secondaryColumn}>
            <ActionsCard selectedReport={selectedReport} onAction={handleAction} />
            <ActivityFeedCard items={activityFeed} />
            <RiskScoreCard selectedReport={selectedReport} summary={summary} />
          </div>
        </section>

        <footer style={styles.footer}>Red Guardian AI | Devvit Hackathon Dashboard</footer>
      </main>
    </div>
  );
}

export default App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
