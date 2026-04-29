import { useState } from "react";
import { useGetDashboard } from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
import { FolderKanban, ListChecks, Loader2, AlertTriangle, CircleDot, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { formatDate, isOverdue } from "@/lib/format";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { useAuth } from "@/lib/auth";

function StatCard({ label, value, icon: Icon, accent, testId }: { label: string; value: number; icon: typeof FolderKanban; accent?: string; testId: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-6 pb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
          <div className={`h-8 w-8 rounded-md flex items-center justify-center ${accent ?? "bg-primary/10 text-primary"}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`row-task-${task.id}`}
      className={`w-full text-left p-3 rounded-md border transition-colors flex items-center gap-3 hover:bg-secondary/60 ${
        overdue ? "border-red-200 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20" : "border-border bg-card"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{task.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
          <span>{task.projectName}</span>
          <span>•</span>
          <span>{task.assigneeName ?? "Unassigned"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
        <span className={`text-xs ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
          {formatDate(task.dueDate)}
        </span>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useGetDashboard();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Welcome back, {user?.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's where your team stands today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Projects" value={data.totalProjects} icon={FolderKanban} testId="stat-total-projects" />
        <StatCard label="Total Tasks" value={data.totalTasks} icon={ListChecks} testId="stat-total-tasks" />
        <StatCard label="In Progress" value={data.tasksByStatus.in_progress} icon={CircleDot} accent="bg-blue-500/10 text-blue-600" testId="stat-in-progress" />
        <StatCard
          label="Overdue"
          value={data.overdueCount}
          icon={AlertTriangle}
          accent={data.overdueCount > 0 ? "bg-red-500/10 text-red-600" : "bg-secondary text-muted-foreground"}
          testId="stat-overdue"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.overdueTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center" data-testid="text-no-overdue">
                Nothing overdue. Nice work.
              </div>
            ) : (
              <div className="space-y-2" data-testid="list-overdue">
                {data.overdueTasks.map((t) => (
                  <TaskRow key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "todo", label: "To Do", count: data.tasksByStatus.todo, color: "bg-slate-400" },
              { key: "in_progress", label: "In Progress", count: data.tasksByStatus.in_progress, color: "bg-blue-500" },
              { key: "done", label: "Done", count: data.tasksByStatus.done, color: "bg-emerald-500" },
            ].map((row) => {
              const pct = data.totalTasks ? (row.count / data.totalTasks) * 100 : 0;
              return (
                <div key={row.key} data-testid={`breakdown-${row.key}`}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium tabular-nums">{row.count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${row.color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> My Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.myTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No tasks assigned to you.</div>
            ) : (
              <div className="space-y-2" data-testid="list-my-tasks">
                {data.myTasks.map((t) => (
                  <TaskRow key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No tasks yet.</div>
            ) : (
              <div className="space-y-2" data-testid="list-recent-tasks">
                {data.recentTasks.slice(0, 6).map((t) => (
                  <TaskRow key={t.id} task={t} onClick={() => setSelectedTaskId(t.id)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedTaskId !== null && (
        <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
}
