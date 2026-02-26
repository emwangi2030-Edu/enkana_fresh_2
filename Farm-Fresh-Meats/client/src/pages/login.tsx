import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Leaf, LogIn, Shield, Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

const ENKANA_CREAM = "#f5f0e8";
const ENKANA_FOREST = "#1a3a2a";
const ENKANA_AMBER = "#e9a82a";
const ENKANA_FOREST_LIGHT = "#2a4a3a";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setLocation("/dashboard");
    });
  }, [setLocation]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setForgotSent(false);
    setLoading(true);

    try {
      const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Incorrect email or password. Please try again.");
        setLoading(false);
        return;
      }

      // If user has turned off 2FA (factor kept, mfa_disabled), skip MFA step and use same Authy when they turn it on again
      const mfaDisabled = (signInData.session?.user?.app_metadata?.mfa_disabled as boolean) ?? false;
      if (mfaDisabled) {
        setLocation("/dashboard");
        setLoading(false);
        return;
      }

      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError || !aal) {
        setLocation("/dashboard");
        setLoading(false);
        return;
      }
      if (aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }
      setLocation("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.MouseEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email above first, then click Forgot password.");
      return;
    }
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    if (err) {
      setError(err.message);
      return;
    }
    setForgotSent(true);
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    setMfaError("");
    setMfaLoading(true);
    try {
      const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
      if (listErr || !factors?.totp?.length) {
        setMfaError("No authenticator found. Please try logging in again.");
        setMfaLoading(false);
        return;
      }
      const factorId = (factors.totp[0] as { id: string }).id;
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) {
        setMfaError(challengeErr.message);
        setMfaLoading(false);
        return;
      }
      const challengeId = (challenge as { id: string }).id;
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: mfaCode.trim(),
      });
      if (verifyErr) {
        setMfaError(verifyErr.message);
        setMfaLoading(false);
        return;
      }
      setLocation("/dashboard");
    } catch {
      setMfaError("Something went wrong. Please try again.");
    } finally {
      setMfaLoading(false);
    }
  }

  function backToPassword() {
    setMfaRequired(false);
    setMfaCode("");
    setMfaError("");
    supabase.auth.signOut();
  }

  // ——— MFA step (keep compact for mobile) ———
  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: ENKANA_CREAM }}>
        <Card className="w-full max-w-sm p-8 shadow-lg rounded-xl">
          <div className="flex flex-col items-center mb-6">
            <div className="grid h-12 w-12 place-items-center rounded-xl text-white mb-3" style={{ backgroundColor: ENKANA_FOREST }}>
              <Shield className="h-6 w-6" strokeWidth={2.4} />
            </div>
            <h1 className="font-display text-xl tracking-tight text-foreground">Two-factor authentication</h1>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              Enter the 6-digit code from your authenticator app (Google Authenticator or Authy).
            </p>
          </div>
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Verification code</label>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="font-mono text-center tracking-[0.5em] text-lg mt-1"
                autoFocus
              />
            </div>
            {mfaError && <div className="text-sm text-destructive text-center">{mfaError}</div>}
            <Button
              type="submit"
              className="w-full text-white rounded-lg h-10"
              style={{ backgroundColor: ENKANA_FOREST }}
              disabled={mfaLoading || mfaCode.length !== 6}
              data-testid="button-mfa-verify"
            >
              {mfaLoading ? "Verifying…" : "Verify"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={backToPassword} disabled={mfaLoading}>
              Back to login
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // ——— Main login: two-column desktop, single column mobile ———
  return (
    <div className="min-h-screen flex">
      {/* Left panel — hidden on mobile */}
      <div
        className="hidden md:flex md:w-1/2 flex-col relative overflow-hidden"
        style={{ backgroundColor: ENKANA_FOREST }}
      >
        <div className="p-8">
          <img src="/logo.png" alt="Enkana Fresh" className="h-10 w-10 rounded-full object-cover shadow" />
        </div>
        <div className="flex-1 flex flex-col justify-center px-10 lg:px-14">
          <h1 className="text-hero">
            Farm to Freezer. Managed.
          </h1>
          <p className="mt-4 text-base max-w-md" style={{ color: ENKANA_CREAM }}>
            Run your entire Enkana Fresh operation from one place.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Track orders, sourcing, and deliveries in real time",
              "Monitor margins from live animal to customer doorstep",
              "Manage every delivery cycle end to end",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5" style={{ color: ENKANA_AMBER }}>
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <span className="text-base" style={{ color: ENKANA_CREAM }}>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Grass silhouette placeholder — subtle darker band */}
        <div
          className="h-32 w-full shrink-0"
          style={{ backgroundColor: ENKANA_FOREST_LIGHT }}
          aria-hidden
        />
        <p
          className="absolute bottom-4 left-10 text-sm opacity-70"
          style={{ color: ENKANA_CREAM }}
        >
          Enkana Fresh · Nairobi, Kenya · Premium Grass-Fed Meat
        </p>
      </div>

      {/* Right panel — form */}
      <div
        className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 md:p-10"
        style={{ backgroundColor: ENKANA_CREAM }}
      >
        {/* Mobile: logo at top */}
        <div className="md:hidden mb-6">
          <img src="/logo.png" alt="Enkana Fresh" className="h-10 w-10 rounded-full object-cover mx-auto shadow" />
        </div>

        <Card className="w-full max-w-md p-8 shadow-lg rounded-xl bg-white border-0">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/logo.png"
              alt=""
              className="h-12 w-12 rounded-full object-cover shadow mb-4"
              aria-hidden
            />
            <h2 className="page-title" data-testid="text-login-title">
              Sign in
            </h2>
            <p className="page-subtitle mt-1" data-testid="text-login-subtitle">
              Admin Dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label block">Email address</label>
              <Input
                data-testid="input-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="mt-1.5 rounded-lg"
              />
            </div>
            <div>
              <label className="form-label block">Password</label>
              <div className="relative mt-1.5">
                <Input
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-link-amber"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {error && (
              <p className="form-error text-center" data-testid="text-login-error">
                {error}
              </p>
            )}
            {forgotSent && (
              <p className="text-sm text-green-600 text-center">
                Check your email for a password reset link.
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-10 rounded-lg btn-primary-text"
              style={{ backgroundColor: ENKANA_FOREST }}
              disabled={loading}
              data-testid="button-login"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-10 rounded-lg font-medium border-2 bg-white"
            style={{ borderColor: ENKANA_FOREST, color: ENKANA_FOREST }}
            onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground max-w-sm">
          Enkana Fresh · Admin Access Only
          <br />
          Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
