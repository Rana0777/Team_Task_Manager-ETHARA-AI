import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useListProjects, useCreateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { Plus, FolderKanban, Loader2, Users as UsersIcon, ListChecks, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";

const createSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
});
type CreateValues = z.infer<typeof createSchema>;

export default function ProjectsPage() {
  const { user } = useAuth();
  const { data: projects, isLoading } = useListProjects();
  const createMutation = useCreateProject();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", description: "" },
  });

  const onSubmit = async (values: CreateValues) => {
    try {
      await createMutation.mutateAsync({ data: values });
      await qc.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      toast({ title: "Project created" });
      setOpen(false);
      form.reset();
    } catch (e) {
      toast({ title: "Failed to create project", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">All projects you're a member of.</p>
        </div>
        {user?.role === "admin" && (
          <Button onClick={() => setOpen(true)} data-testid="button-new-project">
            <Plus className="h-4 w-4 mr-1.5" /> New Project
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !projects || projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <div className="font-medium" data-testid="text-empty-projects">No projects yet</div>
            <div className="text-sm text-muted-foreground mt-1">
              {user?.role === "admin" ? "Create your first project to get the team rolling." : "Ask an admin to add you to a project."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <a data-testid={`card-project-${p.id}`} className="group">
                <Card className="h-full hover:border-primary/40 hover:shadow-sm transition-all">
                  <CardContent className="pt-5 pb-5 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold tracking-tight group-hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                      {p.description || "No description."}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3 mt-auto">
                      <div className="flex items-center gap-1.5">
                        <UsersIcon className="h-3.5 w-3.5" />
                        <span data-testid={`text-member-count-${p.id}`}>{p.memberCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5" />
                        <span data-testid={`text-task-count-${p.id}`}>{p.taskCount}</span>
                      </div>
                      <div className="ml-auto">
                        {p.ownerName ?? "—"} · {formatDate(p.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="Q3 Launch" data-testid="input-project-name" {...field} /></FormControl>
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
                    <FormControl><Textarea rows={3} placeholder="What this project is about" data-testid="input-project-description" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} data-testid="button-cancel-project">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-project">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
