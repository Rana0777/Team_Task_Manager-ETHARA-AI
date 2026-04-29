import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetTask,
  useUpdateTask,
  useDeleteTask,
  useGetProject,
  getGetTaskQueryKey,
  getListTasksQueryKey,
  getGetProjectQueryKey,
  getGetDashboardQueryKey,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { Loader2, Trash2, AlertTriangle, User, Calendar, FolderKanban } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { PriorityBadge } from "@/components/priority-badge";
import { formatDate, isOverdue } from "@/lib/format";

const editSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});
type EditValues = z.infer<typeof editSchema>;

export function TaskDetailModal({ taskId, onClose }: { taskId: number; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: task, isLoading } = useGetTask(taskId, { query: { queryKey: getGetTaskQueryKey(taskId) } });
  const { data: project } = useGetProject(task?.projectId ?? 0, {
    query: { enabled: !!task?.projectId, queryKey: getGetProjectQueryKey(task?.projectId ?? 0) },
  });
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const isAdmin = user?.role === "admin";
  const isAssignedToMe = task?.assigneeId === user?.id;

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { title: "", description: "", status: "todo", priority: "medium", dueDate: "", assigneeId: "unassigned" },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ?? "",
        assigneeId: task.assigneeId != null ? String(task.assigneeId) : "unassigned",
      });
    }
  }, [task, form]);

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) }),
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
      qc.invalidateQueries({ queryKey: getListProjectsQueryKey() }),
      task?.projectId
        ? qc.invalidateQueries({ queryKey: getGetProjectQueryKey(task.projectId) })
        : Promise.resolve(),
    ]);
  };

  const onSubmit = async (values: EditValues) => {
    if (!task) return;
    try {
      if (isAdmin) {
        await updateMutation.mutateAsync({
          id: task.id,
          data: {
            title: values.title,
            description: values.description ?? null,
            status: values.status,
            priority: values.priority,
            dueDate: values.dueDate ? values.dueDate : null,
            assigneeId: values.assigneeId === "unassigned" ? null : Number(values.assigneeId),
          },
        });
      } else if (isAssignedToMe) {
        await updateMutation.mutateAsync({ id: task.id, data: { status: values.status } });
      }
      await invalidate();
      toast({ title: "Task updated" });
      onClose();
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const onDelete = async () => {
    if (!task || !isAdmin) return;
    try {
      await deleteMutation.mutateAsync({ id: task.id });
      await invalidate();
      toast({ title: "Task deleted" });
      onClose();
    } catch (e) {
      toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const overdue = task ? isOverdue(task.dueDate, task.status) : false;
  const canEdit = isAdmin || isAssignedToMe;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading || !task ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl pr-8" data-testid="text-task-title">{task.title}</DialogTitle>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <PriorityBadge priority={task.priority} />
                {overdue && (
                  <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium" data-testid="text-overdue-warning">
                    <AlertTriangle className="h-3 w-3" /> Overdue
                  </span>
                )}
              </div>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground border-y border-border py-3">
              <div className="flex items-center gap-1.5"><FolderKanban className="h-3.5 w-3.5" />{task.projectName}</div>
              <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{task.assigneeName ?? "Unassigned"}</div>
              <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(task.dueDate)}</div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input disabled={!isAdmin} data-testid="input-task-title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea rows={3} disabled={!isAdmin} data-testid="input-task-description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-status"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!isAdmin}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-priority"><SelectValue /></SelectTrigger>
                          </FormControl>
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
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" disabled={!isAdmin} data-testid="input-task-due-date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!isAdmin || !project}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-assignee"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {project?.members.map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="gap-2 sm:justify-between">
                  <div>
                    {isAdmin && (
                      <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700" onClick={onDelete} disabled={deleteMutation.isPending} data-testid="button-delete-task">
                        <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={onClose} data-testid="button-cancel-task">Close</Button>
                    {canEdit && (
                      <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-task">
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
