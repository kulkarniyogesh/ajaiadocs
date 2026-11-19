import { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType = 'success' | 'warning' | 'error' | 'info';

interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  persistent?: boolean;
}

interface NotificationProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ICONS: Record<NotificationType, string> = {
  success: '✓',
  warning: '⚠',
  error: '✕',
  info: 'ℹ',
};

const BORDER_COLORS: Record<NotificationType, string> = {
  success: 'var(--color-success-500)',
  warning: 'var(--color-warning-500)',
  error: 'var(--color-error-500)',
  info: 'var(--color-info-500)',
};

const BG_COLORS: Record<NotificationType, string> = {
  success: 'var(--color-success-50)',
  warning: 'var(--color-warning-50)',
  error: 'var(--color-error-50)',
  info: 'var(--color-info-50)',
};

const ICON_COLORS: Record<NotificationType, string> = {
  success: 'var(--color-success-500)',
  warning: 'var(--color-warning-500)',
  error: 'var(--color-error-500)',
  info: 'var(--color-info-500)',
};

const AUTO_DISMISS_MS = 5000;

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps {
  item: NotificationItem;
  onDismiss: (id: string) => void;
}

function Toast({ item, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  // Trigger entrance animation on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Auto-dismiss non-persistent notifications after 5 s
  useEffect(() => {
    if (item.persistent) return;
    const timer = setTimeout(() => onDismiss(item.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [item.id, item.persistent, onDismiss]);

  return (
    <div
      role="alert"
      aria-live={item.type === 'error' ? 'assertive' : 'polite'}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border-subtle)',
        borderLeft: `4px solid ${BORDER_COLORS[item.type]}`,
        boxShadow: 'var(--shadow-lg)',
        padding: 'var(--space-4)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        backgroundColor: BG_COLORS[item.type],
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform var(--duration-normal) var(--ease-decelerate)',
      }}
    >
      {/* Icon */}
      <span
        aria-hidden="true"
        style={{
          color: ICON_COLORS[item.type],
          fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
          fontSize: 'var(--text-base)',
          lineHeight: 'var(--leading-normal)',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {ICONS[item.type]}
      </span>

      {/* Message */}
      <span
        style={{
          flex: 1,
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-normal)',
          color: 'var(--color-text-primary)',
          wordBreak: 'break-word',
        }}
      >
        {item.message}
      </span>

      {/* Dismiss button — hidden for persistent notifications */}
      {!item.persistent && (
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(item.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── Notification container ───────────────────────────────────────────────────

export function Notification({ notifications, onDismiss }: NotificationProps) {
  return (
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        right: 'var(--space-6)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 'var(--space-3)',
        maxWidth: '380px',
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {notifications.map((item) => (
        <div key={item.id} style={{ pointerEvents: 'auto' }}>
          <Toast item={item} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// ─── useNotifications hook ────────────────────────────────────────────────────

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  function add(type: NotificationType, message: string, persistent?: boolean) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotifications((prev) => [...prev, { id, type, message, persistent }]);
  }

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return { notifications, add, dismiss };
}
