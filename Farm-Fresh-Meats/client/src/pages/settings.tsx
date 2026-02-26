import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  KeyRound,
  Shield,
  Loader2,
  CheckCircle2,
  Copy,
  AlertCircle,
  Users,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchUsers, inviteUser, updateUserRole, apiGet, mfaDisable, mfaEnable } from "@/lib/api";

const TOTP_ISSUER = "Enkana Fresh";
const ROLES = ["admin", "editor", "viewer"] as const;
const PERMISSIONS_MATRIX: Record<string, Record<string, boolean>> = {
  admin: {
    "Orders (all)": true,
    "Customers (all)": true,
    "Payments (view)": true,
    "Reports (view)": true,
    "Products (view & edit)": true,
    "Settings (view)": true,
    "Users (view, invite, edit)": true,
  },
  editor: {
    "Orders (all)": true,
    "Customers (all)": true,
    "Payments (view)": true,
    "Reports (view)": true,
    "Products (view & edit)": true,
    "Settings (view)": true,
    "Users (view, invite, edit)": false,
  },
  viewer: {
    "Orders (all)": false,
    "Customers (all)": false,
    "Payments (view)": true,
    "Reports (view)": true,
    "Products (view & edit)": false,
    "Settings (view)": true,
    "Users (view, invite, edit)": false,
  },
};
Object.keys(PERMISSIONS_MATRIX.viewer).forEach((k) => {
  (PERMISSIONS_MATRIX.viewer as Record<string, boolean>)[k] =
    k === "Payments (view)" || k === "Reports (view)" || k === "Settings (view)";
});

type AuthMe = { isAdmin: boolean; role: string | null; mfaDisabled?: boolean; user?: { email?: string } };

export default function Settings() {
  const [session, setSession] = useState<{ email?: string; role?: string } | null>(null);
  const [freshRole, setFreshRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(
        s
          ? {
              email: s.user?.email,
              role: (s.user?.app_metadata?.role as string) ?? undefined,
            }
          : null
      );
    });
  }, []);

  const [mfaDisabled, setMfaDisabled] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    apiGet<AuthMe>("/api/auth/me")
      .then((data) => {
        setFreshRole(data.role ?? null);
        setMfaDisabled(data.mfaDisabled ?? false);
      })
      .catch(() => {
        setFreshRole(null);
        setMfaDisabled(undefined);
      });
  }, []);

  const role = freshRole !== undefined ? freshRole : session?.role;
  const isAdmin = role === "super_admin" || role === "admin";

  return (
    <div className="p-4 max-w-5xl mx-auto min-h-full bg-background">
      <div className="mb-4">
        <h1 className="page-title">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Account, security, two-factor authentication, and team admin users with roles and permissions.
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="account" className="gap-2">
            <KeyRound className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security (2FA)
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm p-6">
            <h2 className="section-label mb-3">
              Change password
            </h2>
            <ChangePasswordForm email={session?.email} />
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm p-6">
            <h2 className="section-label mb-3">
              Two-factor authentication (TOTP)
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Use an authenticator app like Google Authenticator or Authy to add
              an extra layer of security. You’ll enter a code from the app when
              signing in.
            </p>
            <TotpSection mfaDisabled={mfaDisabled} onMfaToggle={() => apiGet<AuthMe>("/api/auth/me").then((d) => setMfaDisabled(d.mfaDisabled ?? false)).catch(() => {})} />
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {isAdmin ? (
            <UsersSection />
          ) : (
            <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm p-6">
              <h2 className="section-label mb-3">Team users</h2>
              <p className="text-sm text-muted-foreground">
                Only administrators can add and manage other admin users. Contact an existing admin to get access or to be granted the admin role.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          {isAdmin ? (
            <RolesAndPermissionsSection />
          ) : (
            <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm p-6">
              <h2 className="section-label mb-3">Roles & permissions</h2>
              <p className="text-sm text-muted-foreground">
                Only administrators can view and manage roles and permissions. Contact an existing admin to get access.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersSection() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
  const inviteMutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        data.temporaryPassword
          ? `User created. Temporary password: ${data.temporaryPassword} — share it securely.`
          : "User created."
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (error) {
    return (
      <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm p-6">
        <p className="text-sm text-destructive">
          You don’t have permission to manage users, or the request failed.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm p-6">
      <h2 className="section-label mb-3">
        Team users
      </h2>
      <p className="text-sm text-muted-foreground mb-3">
        Invite users and assign roles. Only admins can access this section.
      </p>
      <div className="mb-4">
        <InviteUserDialog
          onInvite={(email, role, temporaryPassword) =>
            inviteMutation.mutate({ email, role, temporaryPassword })
          }
          loading={inviteMutation.isPending}
        />
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading users…
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <Select
                      value={u.role}
                      onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })}
                      disabled={updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString(undefined, {
                          dateStyle: "short",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No users yet. Invite someone to get started.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function InviteUserDialog({
  onInvite,
  loading,
}: {
  onInvite: (email: string, role: string, temporaryPassword?: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("viewer");
  const [tempPassword, setTempPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    onInvite(email.trim(), role, tempPassword.trim() || undefined);
    setOpen(false);
    setEmail("");
    setRole("viewer");
    setTempPassword("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground font-normal">
              Temporary password (optional — one will be generated if left blank)
            </Label>
            <Input
              type="password"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder="Leave blank to auto-generate"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>Submit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RolesAndPermissionsSection() {
  const permissions = Object.keys(PERMISSIONS_MATRIX.admin);
  return (
    <Card className="overflow-hidden border-0 rounded-xl bg-card shadow-sm p-6">
      <h2 className="section-label mb-2">
        Roles & permissions
      </h2>
      <p className="text-sm text-muted-foreground mb-3">
        Permissions are enforced for dashboard access. Only admins can invite users and change roles.
      </p>
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium">Permission</th>
              {ROLES.map((r) => (
                <th key={r} className="text-left p-3 font-medium capitalize">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm) => (
              <tr key={perm} className="border-b border-border/50">
                <td className="p-3">{perm}</td>
                {ROLES.map((role) => (
                  <td key={role} className="p-3">
                    {PERMISSIONS_MATRIX[role]?.[perm] ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ChangePasswordForm({ email }: { email?: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (!email) {
      setError("Session missing. Please log in again.");
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        setError(signInError.message || "Current password is incorrect.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setError(updateError.message || "Failed to update password.");
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div>
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
          required
          autoComplete="current-password"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
          autoComplete="new-password"
          className="mt-1"
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Password updated successfully.
        </div>
      )}
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Update password
      </Button>
    </form>
  );
}

function TotpSection({
  mfaDisabled = false,
  onMfaToggle,
}: {
  mfaDisabled?: boolean;
  onMfaToggle?: () => void;
}) {
  const [factors, setFactors] = useState<{ id: string; friendly_name?: string }[]>([]);
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollQr, setEnrollQr] = useState<string | null>(null);
  const [enrollSecret, setEnrollSecret] = useState("");
  const [enrollFactorId, setEnrollFactorId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [unenrolling, setUnenrolling] = useState<string | null>(null);
  const [disablingMfa, setDisablingMfa] = useState(false);
  const [enablingMfa, setEnablingMfa] = useState(false);

  async function loadFactors() {
    setLoadingFactors(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error(error.message);
      setLoadingFactors(false);
      return;
    }
    const totp = (data?.totp ?? []) as { id: string; friendly_name?: string }[];
    setFactors(totp);
    setLoadingFactors(false);
  }

  useEffect(() => {
    loadFactors();
  }, []);

  async function startEnroll() {
    setEnrolling(true);
    setEnrollQr(null);
    setEnrollSecret("");
    setEnrollFactorId("");
    setVerifyCode("");
    setVerifyError("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: TOTP_ISSUER,
        friendlyName: "Authenticator app (Authy / Google)",
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const totpData = data as { totp?: { qr_code?: string; secret?: string }; id?: string } | undefined;
      setEnrollQr(totpData?.totp?.qr_code ?? null);
      setEnrollSecret(totpData?.totp?.secret ?? "");
      setEnrollFactorId(totpData?.id ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start 2FA setup");
    } finally {
      setEnrolling(false);
    }
  }

  function cancelEnroll() {
    setEnrollQr(null);
    setEnrollSecret("");
    setEnrollFactorId("");
    setVerifyCode("");
    setVerifyError("");
  }

  async function confirmEnroll() {
    if (!enrollFactorId || !verifyCode.trim()) return;
    setVerifyError("");
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrollFactorId,
    });
    if (challengeError) {
      setVerifyError(challengeError.message);
      return;
    }
    const challengeId = (challenge as { id: string }).id;
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId,
      code: verifyCode.trim(),
    });
    if (verifyErr) {
      setVerifyError(verifyErr.message);
      return;
    }
    toast.success("Two-factor authentication enabled.");
    cancelEnroll();
    loadFactors();
  }

  async function turnOffMfa() {
    setDisablingMfa(true);
    try {
      await mfaDisable();
      toast.success("2FA turned off. You can turn it on again and use the same Authy app.");
      onMfaToggle?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to turn off 2FA");
    } finally {
      setDisablingMfa(false);
    }
  }

  async function turnOnMfa() {
    setEnablingMfa(true);
    try {
      await mfaEnable();
      toast.success("2FA turned on. Use the same code from your Authy app at next login.");
      onMfaToggle?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to turn on 2FA");
    } finally {
      setEnablingMfa(false);
    }
  }

  async function unenrollFactor(factorId: string) {
    setUnenrolling(factorId);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      toast.error(error.message);
      setUnenrolling(null);
      return;
    }
    toast.success("Authenticator removed. When you enable 2FA again, you’ll need to scan a new QR code.");
    loadFactors();
    onMfaToggle?.();
    setUnenrolling(null);
  }

  if (loadingFactors) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const hasTotp = factors.length > 0;

  return (
    <div className="space-y-6">
      {hasTotp && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">
            {mfaDisabled ? "2FA is turned off" : "Active authenticator"}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Turn off = stop requiring a code at login but keep this authenticator so you can turn 2FA on again and use the same Authy entry. Remove = delete this authenticator; you’ll need to scan a new QR code when you enable 2FA again.
          </p>
          <ul className="space-y-2">
            {factors.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3"
              >
                <span className="text-sm">
                  {f.friendly_name || "Authenticator app"}
                </span>
                <div className="flex items-center gap-2">
                  {mfaDisabled ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={turnOnMfa}
                      disabled={enablingMfa}
                    >
                      {enablingMfa && <Loader2 className="mr-1.5 h-4 w-4 animate-spin shrink-0" />}
                      Turn on 2FA
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={turnOffMfa}
                      disabled={disablingMfa}
                    >
                      {disablingMfa && <Loader2 className="mr-1.5 h-4 w-4 animate-spin shrink-0" />}
                      Turn off 2FA
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => unenrollFactor(f.id)}
                    disabled={unenrolling === f.id}
                  >
                    {unenrolling === f.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Remove"
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!enrollQr ? (
        <div
          className="inline-block cursor-pointer"
          role="button"
          tabIndex={0}
          aria-disabled={enrolling}
          onClick={() => {
            if (enrolling) return;
            toast.info("Starting 2FA setup…");
            startEnroll();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (enrolling) return;
              toast.info("Starting 2FA setup…");
              startEnroll();
            }
          }}
          data-testid="button-enable-2fa"
        >
          <Button
            type="button"
            variant={hasTotp ? "outline" : "default"}
            disabled={enrolling}
            className="pointer-events-none"
            aria-hidden
          >
            {enrolling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {hasTotp ? "Add another authenticator" : "Enable two-factor authentication"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">
            Scan this QR code with Google Authenticator or Authy
          </p>
          {enrollQr && (
            <div className="inline-block rounded-lg border border-border bg-white p-2">
              {enrollQr.startsWith("data:") ? (
                <img src={enrollQr} alt="TOTP QR code" className="h-40 w-40" />
              ) : (
                <div
                  className="h-40 w-40 [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: enrollQr }}
                />
              )}
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Or enter this secret manually:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-2 py-1.5 text-xs font-mono break-all">
                {enrollSecret}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(enrollSecret);
                  toast.success("Secret copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="totp-verify">Enter the 6-digit code from your app</Label>
            <Input
              id="totp-verify"
              className="mt-1 max-w-[10rem] font-mono tracking-widest"
              placeholder="000000"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
            />
            {verifyError && (
              <p className="mt-1 text-sm text-destructive">{verifyError}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={confirmEnroll} disabled={verifyCode.length !== 6}>
              Enable 2FA
            </Button>
            <Button type="button" variant="outline" onClick={cancelEnroll}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
