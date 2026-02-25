import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Leaf, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else {
        setLocation("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <div
            className="grid h-12 w-12 place-items-center rounded-xl bg-[hsl(var(--primary))] text-white mb-3"
            data-testid="img-login-logo"
          >
            <Leaf className="h-6 w-6" strokeWidth={2.4} />
          </div>
          <h1 className="font-display text-xl tracking-tight" data-testid="text-login-title">
            Enkana Fresh
          </h1>
          <p className="text-sm text-gray-500 mt-1" data-testid="text-login-subtitle">
            Admin login
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              data-testid="input-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              data-testid="input-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 text-center" data-testid="text-login-error">
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90"
            disabled={loading}
            data-testid="button-login"
          >
            <LogIn className="mr-2 h-4 w-4" />
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
