import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Role, User } from '@dypai-ai/client-sdk'
import { useAuth, useDypaiClient } from '@dypai-ai/client-sdk/react'
import { Edit2, Loader2, MoreHorizontal, RefreshCw, Search, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type UserDialogMode = 'create' | 'edit'

interface UserFormState {
  email: string
  password: string
  role: string
}

const emptyForm: UserFormState = {
  email: '',
  password: '',
  role: '',
}

export function AdminUsers() {
  const client = useDypaiClient()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [rolesLoading, setRolesLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<UserDialogMode>('create')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [selfRoleChange, setSelfRoleChange] = useState<{ user: User; nextRole: string } | null>(null)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<UserFormState>(emptyForm)

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (a.email || '').localeCompare(b.email || '')),
    [users]
  )

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return sortedUsers

    return sortedUsers.filter((user) => {
      const email = user.email?.toLowerCase() ?? ''
      const role = user.role?.toLowerCase() ?? ''
      return email.includes(normalizedQuery) || role.includes(normalizedQuery)
    })
  }, [query, sortedUsers])

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  )

  const defaultRole = sortedRoles[0]?.name ?? ''

  const loadUsers = async () => {
    setLoading(true)
    const { data, error } = await client.users.list({ page: 1, per_page: 100 })
    setLoading(false)

    if (error) {
      toast.error(error.message ?? 'Could not load users')
      return
    }

    setUsers(data?.users ?? [])
  }

  const loadRoles = async () => {
    setRolesLoading(true)
    const { data, error } = await client.roles.list()
    setRolesLoading(false)

    if (error) {
      toast.error(error.message ?? 'Could not load roles')
      return
    }

    setRoles(data?.roles ?? [])
  }

  useEffect(() => {
    void loadUsers()
    void loadRoles()
  }, [])

  const openCreateDialog = () => {
    setDialogMode('create')
    setSelectedUser(null)
    setForm({ ...emptyForm, role: defaultRole })
    setDialogOpen(true)
  }

  const openEditDialog = (user: User) => {
    setDialogMode('edit')
    setSelectedUser(user)
    setForm({
      email: user.email ?? '',
      password: '',
      role: user.role ?? defaultRole,
    })
    setDialogOpen(true)
  }

  const closeUserDialog = () => {
    setDialogOpen(false)
    setSelectedUser(null)
    setForm({ ...emptyForm, role: defaultRole })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!form.email) {
      toast.error('Email is required')
      return
    }

    if (dialogMode === 'create' && !form.password) {
      toast.error('Temporary password is required')
      return
    }

    if (!form.role) {
      toast.error('Select a role')
      return
    }

    if (form.password && form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    const isEditingCurrentUser = dialogMode === 'edit' && selectedUser?.id === currentUser?.id
    const currentUserRoleChanged = isEditingCurrentUser && form.role !== selectedUser?.role
    const currentUserPasswordChanged = isEditingCurrentUser && !!form.password

    if (currentUserRoleChanged || currentUserPasswordChanged) {
      const confirmed = window.confirm('You are editing your own account. Continue?')
      if (!confirmed) return
    }

    setSaving(true)
    const result =
      dialogMode === 'create'
        ? await client.users.create({
            email: form.email,
            password: form.password,
            email_confirm: true,
            app_metadata: { role: form.role },
          })
        : await client.users.update(selectedUser!.id, {
            ...(form.email !== selectedUser?.email ? { email: form.email } : {}),
            ...(form.password ? { password: form.password } : {}),
            app_metadata: {
              ...(selectedUser?.app_metadata ?? {}),
              role: form.role,
            },
          })
    setSaving(false)

    if (result.error) {
      toast.error(result.error.message ?? 'Could not save user')
      return
    }

    toast.success(dialogMode === 'create' ? 'User created' : 'User updated')
    closeUserDialog()
    await loadUsers()
  }

  const handleRoleChange = async (targetUser: User, nextRole: string) => {
    if (targetUser.role === nextRole) return

    if (targetUser.id === currentUser?.id) {
      setSelfRoleChange({ user: targetUser, nextRole })
      return
    }

    await updateUserRole(targetUser, nextRole)
  }

  const updateUserRole = async (targetUser: User, nextRole: string) => {
    setUpdatingRoleId(targetUser.id)
    const { data, error } = await client.users.update(targetUser.id, {
      app_metadata: {
        ...(targetUser.app_metadata ?? {}),
        role: nextRole,
      },
    })
    setUpdatingRoleId(null)

    if (error) {
      toast.error(error.message ?? 'Could not update role')
      return
    }

    toast.success('Role updated')
    setUsers((current) =>
      current.map((user) => (user.id === targetUser.id ? { ...user, ...(data ?? {}), role: nextRole } : user))
    )
  }

  const confirmSelfRoleChange = async () => {
    if (!selfRoleChange) return
    const { user, nextRole } = selfRoleChange
    setSelfRoleChange(null)
    await updateUserRole(user, nextRole)
  }

  const handleDelete = async () => {
    if (!deleteUser) return

    const { error } = await client.users.delete(deleteUser.id)
    if (error) {
      toast.error(error.message ?? 'Could not delete user')
      return
    }

    toast.success('User deleted')
    setUsers((current) => current.filter((user) => user.id !== deleteUser.id))
    setDeleteUser(null)
  }

  return (
    <>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage accounts and roles for this application
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button size="sm" onClick={openCreateDialog} disabled={rolesLoading || sortedRoles.length === 0}>
              <UserPlus className="h-4 w-4" />
              New user
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users or roles"
              className="h-10 pl-9"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredUsers.length} of {users.length} users
          </div>
        </div>

        <div className="overflow-hidden border-y bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="w-[180px]">Role</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground">
                    No users yet
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground">
                    No matching users
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrentUser = currentUser?.id === user.id
                  const roleValue = user.role ?? ''

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{user.email}</span>
                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground">Current account</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={roleValue}
                          onValueChange={(nextRole) => handleRoleChange(user, nextRole)}
                          disabled={rolesLoading || updatingRoleId === user.id || sortedRoles.length === 0}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={rolesLoading ? 'Loading roles' : 'Select role'} />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedRoles.map((roleOption) => (
                              <SelectItem key={roleOption.id} value={roleOption.name}>
                                {roleOption.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.confirmed_at ? 'secondary' : 'outline'}>
                          {user.confirmed_at ? 'Confirmed' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Manage ${user.email}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteUser(user)}
                              disabled={isCurrentUser}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeUserDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Create user' : 'Edit user'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? 'Create an account with an initial role.'
                : 'Update account details, role, or password.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="admin-user-email" className="text-sm font-medium leading-none">
                Email
              </label>
              <Input
                id="admin-user-email"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                autoComplete="email"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-user-password" className="text-sm font-medium leading-none">
                {dialogMode === 'create' ? 'Temporary password' : 'New password'}
              </label>
              <Input
                id="admin-user-password"
                type="password"
                placeholder={dialogMode === 'create' ? 'Min. 8 characters' : 'Leave empty to keep current password'}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                autoComplete="new-password"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-user-role" className="text-sm font-medium leading-none">
                Role
              </label>
              <Select
                value={form.role}
                onValueChange={(nextRole) => setForm((current) => ({ ...current, role: nextRole }))}
                disabled={rolesLoading || sortedRoles.length === 0}
              >
                <SelectTrigger id="admin-user-role" className="h-10">
                  <SelectValue placeholder={rolesLoading ? 'Loading roles' : 'Select role'} />
                </SelectTrigger>
                <SelectContent>
                  {sortedRoles.map((roleOption) => (
                    <SelectItem key={roleOption.id} value={roleOption.name}>
                      {roleOption.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeUserDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || rolesLoading || sortedRoles.length === 0}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {dialogMode === 'create' ? 'Create user' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteUser?.email}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!selfRoleChange} onOpenChange={(open) => !open && setSelfRoleChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change your own role?</AlertDialogTitle>
            <AlertDialogDescription>
              This can remove your access to this admin area. You may need another admin to restore it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSelfRoleChange}>
              Change role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
