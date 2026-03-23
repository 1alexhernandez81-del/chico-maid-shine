import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, RefreshCw, Trash2, Shield, KeyRound, Eye, EyeOff } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const getPasswordStrength = (pw: string): { score: number; labelKey: string; color: string } => {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 20, labelKey: "admin.users.pw.weak", color: "bg-destructive" };
  if (score === 2) return { score: 40, labelKey: "admin.users.pw.fair", color: "bg-orange-500" };
  if (score === 3) return { score: 60, labelKey: "admin.users.pw.good", color: "bg-yellow-500" };
  if (score === 4) return { score: 80, labelKey: "admin.users.pw.strong", color: "bg-emerald-400" };
  return { score: 100, labelKey: "admin.users.pw.vstrong", color: "bg-emerald-500" };
};

type ManagedUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
};

const UserManagement = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [creating, setCreating] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const invokeManageUsers = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("manage-users", { body });
    if (error) {
      let backendMessage: string | null = null;
      const response = (error as any).context;

      if (response?.json) {
        try {
          const payload = await response.json();
          backendMessage = payload?.error ?? null;
        } catch {
          backendMessage = null;
        }
      }

      throw new Error(backendMessage || error.message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await invokeManageUsers({ action: "list" });
      setUsers(data.users || []);
    } catch (err: any) {
      toast({ title: t("admin.error"), description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await invokeManageUsers({
        action: "create",
        email: newEmail,
        password: newPassword,
        full_name: newName,
        role: newRole,
      });
      toast({ title: t("admin.users.created.toast"), description: `${newEmail} ${t("admin.users.added.msg")} ${newRole}` });
      setShowCreate(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("user");
      fetchUsers();
    } catch (err: any) {
      toast({ title: t("admin.error"), description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await invokeManageUsers({ action: "update_role", user_id: userId, role });
      toast({ title: t("admin.users.role.updated"), description: `${t("admin.users.role.changed")} ${role}` });
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, roles: [role] } : u)
      );
    } catch (err: any) {
      toast({ title: t("admin.error"), description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await invokeManageUsers({ action: "delete", user_id: deleteTarget.id });
      toast({ title: t("admin.users.deleted"), description: `${deleteTarget.email} ${t("admin.users.deleted.msg")}` });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    } catch (err: any) {
      toast({ title: t("admin.error"), description: err.message, variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">{t("admin.users.title")}</h2>
          <p className="text-muted-foreground text-sm">{t("admin.users.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> {t("admin.bookings.refresh")}
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <UserPlus className="w-4 h-4 mr-2" /> {t("admin.users.adduser")}
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>{t("admin.users.email")}</TableHead>
              <TableHead>{t("admin.users.role")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("admin.users.created")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("admin.users.lastsignin")}</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  {t("admin.users.loading")}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  {t("admin.users.none")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.roles[0] || "user"}
                      onValueChange={(val) => handleRoleChange(u.id, val)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <span className="flex items-center gap-2">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        </SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleDateString()
                      : t("admin.users.never")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-accent"
                        title="Reset Password"
                        onClick={() => { setResetTarget(u); setResetPassword(""); }}
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(u)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.users.create.title")}</DialogTitle>
            <DialogDescription>{t("admin.users.create.desc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newName">{t("admin.users.fullname")}</Label>
              <Input id="newName" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">{t("admin.users.email")}</Label>
              <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required placeholder="jane@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("admin.users.password")}</Label>
              <div className="relative">
                <Input id="newPassword" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder={t("admin.users.password.placeholder")} className="pr-10" />
                <button type="button" tabIndex={-1} onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && (() => {
                const s = getPasswordStrength(newPassword);
                return (
                  <div className="space-y-1">
                    <Progress value={s.score} className="h-1.5" indicatorClassName={s.color} />
                    <p className="text-xs text-muted-foreground">{t(s.labelKey)} — {t("admin.users.pw.tip")}</p>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label>{t("admin.users.role")}</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("admin.users.role.admin")}</SelectItem>
                  <SelectItem value="moderator">{t("admin.users.role.moderator")}</SelectItem>
                  <SelectItem value="user">{t("admin.users.role.user")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={creating}>
              {creating ? t("admin.users.creating") : t("admin.users.createbtn")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.users.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.users.delete.msg")} <strong>{deleteTarget?.email}</strong>? {t("admin.users.delete.warn")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.users.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("admin.users.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{resetTarget?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!resetTarget) return;
            setResetting(true);
            try {
              await invokeManageUsers({ action: "reset_password", user_id: resetTarget.id, new_password: resetPassword });
              toast({ title: "Password Reset", description: `Password updated for ${resetTarget.email}` });
              setResetTarget(null);
              setResetPassword("");
            } catch (err: any) {
              const friendlyMessage = /weak|pwned|breach|compromised/i.test(err.message)
                ? "That password is too weak or exposed. Use a longer unique password."
                : err.message;
              toast({ title: "Error", description: friendlyMessage, variant: "destructive" });
            }
            setResetting(false);
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resetPw">New Password</Label>
              <div className="relative">
                <Input id="resetPw" type={showResetPassword ? "text" : "password"} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" className="pr-10" />
                <button type="button" tabIndex={-1} onClick={() => setShowResetPassword(!showResetPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {resetPassword && (() => {
                const s = getPasswordStrength(resetPassword);
                return (
                  <div className="space-y-1">
                    <Progress value={s.score} className="h-1.5" indicatorClassName={s.color} />
                    <p className="text-xs text-muted-foreground">{t(s.labelKey)} — {t("admin.users.pw.tip")}</p>
                  </div>
                );
              })()}
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={resetting}>
              {resetting ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
