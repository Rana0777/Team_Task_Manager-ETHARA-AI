import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetProject,
  useUpdateProject,
  useDeleteProject,
  useAddProjectMember,
  useRemoveProjectMember,
  useCreateTask,
  useListUsers,
  getGetProjectQueryKey,
  getListProjectsQueryKey,
  getGetDashboardQueryKey,
  getListTasksQueryKey,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  X,
  Pencil,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { formatDate, isOverdue, initials } from "@/lib/format";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});
type TaskValues = z.infer<typeof taskSchema>;

export default function ProjectDetailPage() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const projectId = params?.id ? Number(params.id) : 0;
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const { data: project, isLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });
  const { data: allUsers } = useListUsers({
    query: { enabled: isAdmin, queryKey: getListUsersQueryKey() },
  });

  const updateMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const addMemberMutation = useAddProjectMember();
  const removeMemberMutation = useRemoveProjectMember();
  const createTaskMutation = useCreateTask();

  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const taskForm = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", priority: "medium", dueDate: "", assigneeId: "unassigned" },
  });

  const invalidateProject = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) }),
      qc.invalidateQueries({ queryKey: getListProjectsQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() }),
    ]);

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const startEdit = () => {
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    try {
      await updateMutation.mutateAsync({
        id: projectId,
        data: { name: editName, description: editDescription },
      });
      await invalidateProject();
      toast({ title: "Project updated" });
      setEditing(false);
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProjectMutation.mutateAsync({ id: projectId });
      await invalidateProject();
      toast({ title: "Project deleted" });
      setLocation("/projects");
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleAddMember = async (userId: number) => {
    try {
      await addMemberMutation.mutateAsync({ id: projectId, data: { userId } });
      await invalidateProject();
      toast({ title: "Member added" });
    } catch (e) {
      toast({ title: "Add member failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      await removeMemberMutation.mutateAsync({ id: projectId, userId });
      await invalidateProject();
      toast({ title: "Member removed" });
    } catch (e) {
      toast({ title: "Remove member failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const onCreateTask = async (values: TaskValues) => {
    try {
      await createTaskMutation.mutateAsync({
        data: {
          title: values.title,
          description: values.description || undefined,
          projectId,
          priority: values.priority,
          dueDate: values.dueDate || undefined,
          assigneeId: values.assigneeId === "unassigned" ? undefined : Number(values.assigneeId),
        },
      });
      await invalidateProject();
      toast({ title: "Task created" });
      setTaskCreateOpen(false);
      taskForm.reset({ title: "", description: "", priority: "medium", dueDate: "", assigneeId: "unassigned" });
    } catch (e) {
      toast({ title: "Create task failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const memberIds = new Set(project.members.map((m) => m.id));
  const addableUsers = allUsers?.filter((u) => !memberIds.has(u.id)) ?? [];

  const filteredTasks: Task[] = project.tasks.filter((t) => filter === "all" || t.status === filter);

  return (
    <div className="space-y-6">
      <Link href="/projects">
        <a className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-projects">
          <ArrowLeft className="h-4 w-4 mr-1" /> All projects
        </a>
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-3">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-2xl font-semibold h-auto py-2" data-testid="input-edit-project-name" />
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} data-testid="input-edit-project-description" />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending} data-testid="button-save-project">
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} data-testid="button-cancel-edit-project">Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-project-name">{project.name}</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl" data-testid="text-project-description">{project.description || "No description."}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Owner: {project.ownerName ?? "—"} · Created {formatDate(project.createdAt)}
              </p>
            </>
          )}
        </div>
        {isAdmin && !editing && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={startEdit} data-testid="button-edit-project"><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setConfirmDelete(true)} data-testid="button-delete-project"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Members ({project.members.length})</CardTitle>
            {isAdmin && (
              <Button size="sm" variant="ghost" onClick={() => setMemberPickerOpen(true)} data-testid="button-add-member">
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {project.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/60 group" data-testid={`row-member-${m.id}`}>
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                  {initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                </div>
                {m.role === "admin" && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">admin</span>
                )}
                {isAdmin && m.id !== project.ownerId && (
                  <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => handleRemoveMember(m.id)} data-testid={`button-remove-member-${m.id}`}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Tasks ({project.tasks.length})</CardTitle>
            <div className="flex items-center gap-3">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs h-6" data-testid="tab-filter-all">All</TabsTrigger>
                  <TabsTrigger value="todo" className="text-xs h-6" data-testid="tab-filter-todo">To Do</TabsTrigger>
                  <TabsTrigger value="in_progress" className="text-xs h-6" data-testid="tab-filter-in-progress">In Progress</TabsTrigger>
                  <TabsTrigger value="done" className="text-xs h-6" data-testid="tab-filter-done">Done</TabsTrigger>
                </TabsList>
              </Tabs>
              {isAdmin && (
                <Button size="sm" onClick={() => setTaskCreateOpen(true)} data-testid="button-new-task">
                  <Plus className="h-4 w-4 mr-1" /> New Task
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-10" data-testid="text-no-tasks">No tasks in this view.</div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-xs text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Title</th>
                      <th className="text-left font-medium px-3 py-2 hidden md:table-cell">Assignee</th>
                      <th className="text-left font-medium px-3 py-2">Priority</th>
                      <th className="text-left font-medium px-3 py-2">Status</th>
                      <th className="text-left font-medium px-3 py-2">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((t) => {
                      const overdue = isOverdue(t.dueDate, t.status);
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTaskId(t.id)}
                          data-testid={`row-task-${t.id}`}
                          className={`border-t border-border cursor-pointer hover:bg-secondary/40 transition-colors ${overdue ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}
                        >
                          <td className="px-3 py-2.5 font-medium">{t.title}</td>
                          <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">{t.assigneeName ?? "—"}</td>
                          <td className="px-3 py-2.5"><PriorityBadge priority={t.priority} /></td>
                          <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                          <td className={`px-3 py-2.5 ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                            {overdue && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                            {formatDate(t.dueDate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add member dialog */}
      <Dialog open={memberPickerOpen} onOpenChange={setMemberPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
          </DialogHeader>
          {addableUsers.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">All users are already members.</div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {addableUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={async () => {
                    await handleAddMember(u.id);
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-secondary text-left"
                  data-testid={`button-add-user-${u.id}`}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                    {initials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New task dialog */}
      <Dialog open={taskCreateOpen} onOpenChange={setTaskCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onCreateTask)} className="space-y-3">
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input data-testid="input-new-task-title" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea rows={3} data-testid="input-new-task-description" {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-new-task-priority"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due date</FormLabel>
                      <FormControl><Input type="date" data-testid="input-new-task-due" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={taskForm.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-new-task-assignee"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {project.members.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setTaskCreateOpen(false)} data-testid="button-cancel-new-task">Cancel</Button>
                <Button type="submit" disabled={createTaskMutation.isPending} data-testid="button-create-task">
                  {createTaskMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete project */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all of its tasks. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete-project" className="bg-red-600 hover:bg-red-700">
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedTaskId !== null && (
        <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
}
