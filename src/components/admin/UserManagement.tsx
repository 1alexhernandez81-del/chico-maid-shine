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
import { UserPlus, RefreshCw, Trash2, Shield } from "lucide-react";

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
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const invokeManageUsers = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("manage-users", { body });
    if (error) throw new Error(error.message);
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder={t("admin.users.password.placeholder")} />
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
    </div>
  );
};

export default UserManagement;
