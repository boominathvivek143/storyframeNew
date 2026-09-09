import { CheckCircle2, Film, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { postJson } from '../utils/apiClient';

export interface AuthUser {
  id: number;
  email: string;
  credits: number;
  isAdmin: boolean;
}

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

type Mode = 'signup' | 'login';

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [signupDone, setSignupDone] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setIsSubmitting(true);
    const res = await postJson('/api/auth/signup', { email: email.trim() });
    setIsSubmitting(false);
    if (!res.ok) {
      setError(res.data?.error || res.error || 'Could not create your account.');
      return;
    }
    setSignupDone(true);
    onAuthenticated(res.data.user);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setIsSubmitting(true);
    const res = await postJson('/api/auth/login', { email: email.trim(), password });
    setIsSubmitting(false);
    if (!res.ok) {
      setError(res.data?.error || res.error || 'Invalid email or password.');
      return;
    }
    onAuthenticated(res.data.user);
  };

  const handleResendPassword = async () => {
    setError('');
    if (!email.trim()) {
      setError('Enter your email address first, then request a new password.');
      return;
    }
    setIsSubmitting(true);
    const res = await postJson('/api/auth/resend-password', { email: email.trim() });
    setIsSubmitting(false);
    if (!res.ok) {
      setError(res.data?.error || res.error || 'Could not reset your password.');
      return;
    }
    setError('');
    alert('A new password has been emailed to you.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1b1822] border border-[#2f2a3a] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-[#2a1c3d] via-[#20182c] to-[#1a1424] px-6 py-5 border-b border-[#2f2a3a] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d9a042] to-[#a8701f] flex items-center justify-center shadow-lg shrink-0">
            <Film className="w-5 h-5 text-[#1b1408]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#ece8de]">Storyframe Studio</h2>
            <p className="text-xs text-[#9d97ab] mt-0.5">Turn a story into an illustrated slideshow</p>
          </div>
        </div>

        <div className="flex px-6 pt-4 gap-1 border-b border-[#2a2438]">
          {(['signup', 'login'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError('');
                setSignupDone(false);
              }}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                mode === m ? 'border-[#d9a042] text-[#ece8de]' : 'border-transparent text-[#6b6579] hover:text-[#c9c2e0]'
              }`}
            >
              {m === 'signup' ? 'Create account' : 'Log in'}
            </button>
          ))}
        </div>

        {mode === 'signup' ? (
          <form onSubmit={handleSignup} className="p-6 space-y-4">
            <div className="p-3 rounded-xl bg-[#14101c] border border-[#262033] text-xs text-[#b4adc4] leading-relaxed flex gap-2">
              <Sparkles className="w-4 h-4 text-[#d9a042] shrink-0 mt-0.5" />
              <span>Free to join. You'll get <strong className="text-[#ece8de]">10 free credits</strong> to explore story creation, and your login password will be emailed to you.</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#c9c2e0]">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-[#121017] border border-[#2f2a3a] rounded-xl px-3.5 py-2.5 text-sm text-[#ece8de] placeholder-[#655d75] outline-none focus:border-[#d9a042] transition-colors"
              />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            {signupDone && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Account created! Check your email for your password.
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-[#1b1408] bg-gradient-to-r from-[#d9a042] via-[#e2af58] to-[#d9a042] hover:brightness-105 active:scale-[0.99] transition-all shadow-lg shadow-[#d9a042]/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Create my account</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#c9c2e0]">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-[#121017] border border-[#2f2a3a] rounded-xl px-3.5 py-2.5 text-sm text-[#ece8de] placeholder-[#655d75] outline-none focus:border-[#d9a042] transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#c9c2e0]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="From your welcome email"
                autoComplete="current-password"
                className="w-full bg-[#121017] border border-[#2f2a3a] rounded-xl px-3.5 py-2.5 text-sm text-[#ece8de] placeholder-[#655d75] outline-none focus:border-[#d9a042] transition-colors"
              />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-[#1b1408] bg-gradient-to-r from-[#d9a042] via-[#e2af58] to-[#d9a042] hover:brightness-105 active:scale-[0.99] transition-all shadow-lg shadow-[#d9a042]/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Log in</span>
            </button>
            <button
              type="button"
              onClick={handleResendPassword}
              disabled={isSubmitting}
              className="w-full py-2 text-xs text-[#8a8399] hover:text-[#ece8de] transition-colors"
            >
              Forgot your password? Email me a new one
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
