import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'icon';
  size?: 'compact' | 'default' | 'large';
  children?: React.ReactNode;
}

const baseStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-md)',
  fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  border: '1px solid transparent',
  transition: [
    'background-color var(--duration-fast) var(--ease-standard)',
    'box-shadow var(--duration-fast) var(--ease-standard)',
    'transform var(--duration-instant) var(--ease-standard)',
  ].join(', '),
  outline: 'none',
  fontFamily: 'inherit',
  lineHeight: 1,
  whiteSpace: 'nowrap' as const,
  textDecoration: 'none',
  boxSizing: 'border-box' as const,
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  compact: { height: '32px', padding: '0 var(--space-3)' },
  default: { height: '36px', padding: '0 var(--space-4)' },
  large:   { height: '40px', padding: '0 var(--space-5)' },
};

const iconSizeStyles: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  compact: { height: '32px', width: '32px', padding: 'var(--space-2)' },
  default: { height: '36px', width: '36px', padding: 'var(--space-2)' },
  large:   { height: '40px', width: '40px', padding: 'var(--space-2)' },
};

const variantStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-interactive-primary)',
    color: 'var(--color-text-inverse)',
  },
  secondary: {
    backgroundColor: 'var(--color-interactive-secondary)',
    color: 'var(--color-text-primary)',
    borderColor: 'var(--color-border-default)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  destructive: {
    backgroundColor: 'var(--color-interactive-destructive)',
    color: 'var(--color-text-inverse)',
  },
  icon: {
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    borderRadius: 'var(--radius-sm)',
  },
};

/*
 * Hover, active, disabled, and focus states require event handlers because
 * inline styles cannot target pseudo-classes. We manage these via React state.
 */

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'default',
      children,
      style,
      onMouseEnter,
      onMouseLeave,
      onMouseDown,
      onMouseUp,
      onFocus,
      onBlur,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const [hovered, setHovered] = React.useState(false);
    const [active, setActive]   = React.useState(false);
    const [focused, setFocused] = React.useState(false);

    // Respect prefers-reduced-motion via a ref-checked media query at render time.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Resolve dimension styles — icon variant overrides size dims
    const dimensionStyle =
      variant === 'icon' ? iconSizeStyles[size] : sizeStyles[size];

    // Build hover overrides per variant
    function getHoverStyle(): React.CSSProperties {
      if (!hovered || disabled) return {};
      switch (variant) {
        case 'primary':     return { backgroundColor: 'var(--color-interactive-primary-hover)' };
        case 'secondary':   return { backgroundColor: 'var(--color-interactive-secondary-hover)' };
        case 'ghost':       return { backgroundColor: 'var(--color-interactive-secondary)', color: 'var(--color-text-primary)' };
        case 'destructive': return { backgroundColor: 'var(--color-interactive-destructive-hover)' };
        case 'icon':        return { backgroundColor: 'var(--color-interactive-secondary)' };
        default:            return {};
      }
    }

    // Active (pressed) overrides
    function getActiveStyle(): React.CSSProperties {
      if (!active || disabled) return {};
      if (variant === 'primary') {
        return { backgroundColor: 'var(--color-interactive-primary-active)' };
      }
      if (!prefersReducedMotion) {
        return { transform: 'scale(0.97)' };
      }
      return {};
    }

    // Disabled overrides
    function getDisabledStyle(): React.CSSProperties {
      if (!disabled) return {};
      if (variant === 'primary') {
        return {
          backgroundColor: 'var(--color-interactive-primary-disabled)',
          cursor: 'default',
        };
      }
      return { opacity: 0.5, cursor: 'default' };
    }

    // Focus ring
    const focusStyle: React.CSSProperties = focused
      ? { boxShadow: 'var(--shadow-focus)' }
      : {};

    // Suppress transition when reduced motion is preferred
    const motionStyle: React.CSSProperties = prefersReducedMotion
      ? { transition: 'none', transform: 'none' }
      : {};

    const computedStyle: React.CSSProperties = {
      ...baseStyle,
      ...variantStyles[variant],
      ...dimensionStyle,
      ...getHoverStyle(),
      ...getActiveStyle(),
      ...getDisabledStyle(),
      ...focusStyle,
      ...motionStyle,
      ...style,
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        style={computedStyle}
        onMouseEnter={(e) => {
          setHovered(true);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          setActive(false);
          onMouseLeave?.(e);
        }}
        onMouseDown={(e) => {
          if (!disabled) setActive(true);
          onMouseDown?.(e);
        }}
        onMouseUp={(e) => {
          setActive(false);
          onMouseUp?.(e);
        }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        // Accessibility: communicate pressed state for icon/toggle buttons when needed
        aria-disabled={disabled}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
