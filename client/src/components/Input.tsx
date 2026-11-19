import React, { useId, useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, disabled, id: idProp, style, ...rest }, ref) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);

    const inputStyle: React.CSSProperties = {
      height: 36,
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${
        error
          ? 'var(--color-error-500)'
          : focused
          ? 'var(--color-border-focus)'
          : hovered
          ? 'var(--color-border-strong)'
          : 'var(--color-border-default)'
      }`,
      padding: 'var(--space-2) var(--space-3)',
      fontSize: 'var(--text-base)',
      color: disabled ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
      background: disabled ? 'var(--color-surface-overlay)' : 'var(--color-surface-base)',
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box',
      cursor: disabled ? 'not-allowed' : undefined,
      boxShadow: focused && !error ? 'var(--shadow-focus)' : undefined,
      ...style,
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {label && (
          <label
            htmlFor={id}
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          disabled={disabled}
          style={inputStyle}
          onMouseEnter={(e) => {
            setHovered(true);
            rest.onMouseEnter?.(e);
          }}
          onMouseLeave={(e) => {
            setHovered(false);
            rest.onMouseLeave?.(e);
          }}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {error ? (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error-700)' }}>
            {error}
          </span>
        ) : helperText ? (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
