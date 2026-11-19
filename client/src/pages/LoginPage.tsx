import React, { useState } from 'react';

interface LoginPageProps {
  onLoginSuccess: (token: string, email: string) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit() {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? 'Login failed. Please try again.');
        return;
      }
      const body = await res.json();
      onLoginSuccess(body.token, email);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    height: 44,
    padding: '0 var(--space-md)',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${focusedField === field ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
    boxShadow: focusedField === field ? 'var(--shadow-focus)' : 'none',
    background: 'var(--color-surface-container-lowest)',
    color: 'var(--color-on-surface)',
    fontSize: 'var(--text-base)',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-md)',
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: 'var(--color-surface-container-lowest)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--color-outline-variant)',
        padding: 'var(--space-xl)',
        width: '100%',
        maxWidth: 420,
        boxSizing: 'border-box',
      }}>
        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-primary)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
            fontWeight: 'bold',
            margin: '0 auto var(--space-md)',
          }}>
            A
          </div>
          <h1 style={{
            margin: '0 0 4px',
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
            letterSpacing: 'var(--tracking-tight)',
            color: 'var(--color-on-surface)',
          }}>
            Sign in to Ajaia Docs
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-on-surface-variant)' }}>
            Collaborate on documents, specs, and more
          </p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Email */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-on-surface)',
            }}>
              Email
            </label>
            <input
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle('email')}
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)' as React.CSSProperties['fontWeight'],
              color: 'var(--color-on-surface)',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle('password'), paddingRight: 44 }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-on-surface-variant)', fontSize: 14, padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p style={{
              margin: 0,
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-error-container)',
              color: 'var(--color-on-error-container)',
              fontSize: 'var(--text-sm)',
            }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              height: 44,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: loading ? 'var(--color-interactive-primary-disabled)' : 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-weight-semibold)' as React.CSSProperties['fontWeight'],
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: 'var(--shadow-sm)',
              transition: 'background var(--duration-fast) var(--ease-standard)',
              marginTop: 'var(--space-xs)',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--color-primary-hover)'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--color-primary)'; }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        {/* Hint */}
        <p style={{
          marginTop: 'var(--space-lg)',
          marginBottom: 0,
          textAlign: 'center',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-on-surface-variant)',
          borderTop: '1px solid var(--color-outline-variant)',
          paddingTop: 'var(--space-md)',
        }}>
          Demo accounts: <strong>alice@example.com</strong> or <strong>bob@example.com</strong>
          <br />Password: <strong>password123</strong>
        </p>
      </div>
    </div>
  );
}
