import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { artistsQuery } from "@/lib/artists";
import { tableQuery } from "@/lib/modules";
import { Panel, Portrait } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AREAS: string[] = ["Music", "Live", "Content", "Brand", "Team"];
const DEV_STAGES = ["live_audition", "development", "negotiation", "signed"];

export function TasksTab({ initialArtistId }: { initialArtistId?: string | undefined }) {
  const { data: artists = [] } = useQuery(artistsQuery);
  const { data: tasks = [] } = useQuery(tableQuery("dev_tasks"));
  const qc = useQueryClient();

  const list = artists.filter(
    (a) => DEV_STAGES.includes(a.pipeline_stage) || tasks.some((t) => t.artist_id === a.id),
  );

  const [form, setForm] = useState({
    artist_id: initialArtistId ?? artists[0]?.id ?? "",
    area: "Music",
    title: "",
    due: "",
  });

  const inv = () => qc.invalidateQueries({ queryKey: ["dev_tasks"] });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("dev_tasks").insert({
        artist_id: form.artist_id,
        area: form.area,
        title: form.title.trim(),
        due: form.due || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ ...form, title: "", due: "" });
      toast.success("Task added to development roadmap");
      inv();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("dev_tasks").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });

  const sel = "h-9 rounded-lg border bg-panel px-2 text-sm";

  return (
    <div className="space-y-6">
      <Panel
        title="Artist Action Items & Tasks"
        sub="Track specific execution items across songwriting sessions, rehearsal dates, content delivery, and branding."
      >
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.title.trim()) add.mutate();
          }}
        >
          <select
            aria-label="Artist"
            className={sel}
            value={form.artist_id}
            onChange={(e) => setForm({ ...form, artist_id: e.target.value })}
          >
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Area"
            className={sel}
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
          >
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <Input
            aria-label="Task"
            className="min-w-48 flex-1 text-sm"
            placeholder="e.g. Vocal coaching session before studio recording"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            aria-label="Due date"
            type="date"
            className="w-40 text-sm"
            value={form.due}
            onChange={(e) => setForm({ ...form, due: e.target.value })}
          />
          <Button type="submit" disabled={!form.title.trim() || add.isPending}>
            Add task
          </Button>
        </form>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((a) => {
          const ts = tasks.filter((t) => t.artist_id === a.id);
          const done = ts.filter((t) => t.done).length;
          return (
            <Panel
              key={a.id}
              title={
                <Link
                  to="/artists/$id"
                  params={{ id: a.id }}
                  className="flex items-center gap-2 hover:text-lime"
                >
                  <Portrait
                    seed={a.portrait_seed}
                    name={a.name}
                    isDemo={a.is_demo}
                    className="size-7"
                  />
                  {a.name}
                </Link>
              }
              sub={`${done}/${ts.length} tasks completed`}
            >
              <div className="mb-3 h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-lime transition-all"
                  style={{ width: `${ts.length ? (done / ts.length) * 100 : 0}%` }}
                />
              </div>
              <ul className="space-y-2 text-xs">
                {ts.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 border-b pb-1.5"
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={(e) => toggle.mutate({ id: t.id, done: e.target.checked })}
                        className="accent-lime"
                      />
                      <span
                        className={
                          t.done
                            ? "text-muted-foreground line-through"
                            : "text-foreground font-medium"
                        }
                      >
                        {t.title}
                      </span>
                    </label>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5">{t.area}</span>
                      {t.due && <span>Due {new Date(t.due).toLocaleDateString()}</span>}
                    </div>
                  </li>
                ))}
                {ts.length === 0 && (
                  <li className="text-muted-foreground py-2 text-center">No tasks assigned yet.</li>
                )}
              </ul>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
