"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { ListEmptyState } from "@/components/dashboard/list-empty-state";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string;
  due: string;
  done: boolean;
};

export default function ClientTimelinePage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDue, setNewDue] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTasks = async () => {
    const res = await fetch("/api/timeline");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const items = json.items ?? [];
    return items.map(
      (t: {
        id: string;
        title: string;
        description: string | null;
        due_date: string | null;
        is_completed: boolean;
      }) => ({
        id: t.id,
        title: t.title,
        description: t.description ?? "",
        due: t.due_date ?? new Date().toISOString(),
        done: t.is_completed,
      })
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mapped = await loadTasks();
        if (!cancelled) setTasks(mapped);
      } catch {
        if (!cancelled) setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const addTask = async () => {
    if (!newTitle.trim()) {
      toast.error("Task title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          dueDate: newDue || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add task");
      const refreshed = await loadTasks();
      setTasks(refreshed);
      setNewTitle("");
      setNewDesc("");
      setNewDue("");
      setShowAdd(false);
      toast.success("Task added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add task");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 bg-charcoal/10" />
        <div className="h-64 border border-charcoal/8 bg-charcoal/5" />
      </div>
    );
  }

  const header = (
    <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className={dashLabel}>Planning</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Timeline</h2>
      </div>
      <button type="button" className={dashBtn} onClick={() => setShowAdd(!showAdd)}>
        {showAdd ? "Cancel" : "Add Task"}
      </button>
    </motion.div>
  );

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      {header}

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className={cn(dashCard, "mt-8 space-y-4")}>
              <div>
                <label htmlFor="task-title" className={dashLabel}>Title</label>
                <input
                  id="task-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-2 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
                  placeholder="e.g. Confirm photographer"
                />
              </div>
              <div>
                <label htmlFor="task-desc" className={dashLabel}>Description</label>
                <textarea
                  id="task-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="mt-2 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary resize-none"
                  placeholder="Optional details"
                />
              </div>
              <div>
                <label htmlFor="task-due" className={dashLabel}>Due Date</label>
                <input
                  id="task-due"
                  type="date"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  className="mt-2 w-full border border-charcoal/15 bg-ivory px-4 py-3 font-heading text-sm outline-none focus:border-gold-primary"
                />
              </div>
              <button type="button" className={dashBtn} onClick={addTask} disabled={saving}>
                {saving ? "Adding…" : "Add Task"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {tasks.length === 0 ? (
        <div className="mt-12">
          <ListEmptyState hint="Add tasks to plan your wedding timeline." />
        </div>
      ) : (
        <motion.div variants={fadeUp} className="relative mt-14">
          <div
            className="absolute bottom-0 left-[15px] top-0 w-px bg-gold-primary/50 md:left-1/2 md:-translate-x-px"
            aria-hidden
          />
          <ul className="relative list-none space-y-14 pl-0">
            {tasks.map((task, index) => {
              const isRight = index % 2 === 1;
              return (
                <motion.li key={task.id} variants={staggerItem} className="relative">
                  <div className="absolute left-[7px] top-3 z-10 flex h-8 w-8 items-center justify-center border border-gold-primary/60 bg-ivory md:left-1/2 md:-ml-4">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggle(task.id)}
                      className="h-4 w-4 border border-charcoal/30 accent-gold-primary"
                      aria-label={`Mark ${task.title} complete`}
                    />
                  </div>
                  <div
                    className={cn(
                      "pl-14 md:w-1/2",
                      isRight ? "md:ml-auto md:pl-16 md:text-right" : "md:pr-16"
                    )}
                  >
                    <div className={cn(dashCard, task.done && "opacity-55")}>
                      <div
                        className={cn(
                          "flex flex-wrap items-start justify-between gap-3 border-b border-charcoal/8 pb-3",
                          isRight && "md:flex-row-reverse"
                        )}
                      >
                        <h3 className="font-display text-lg text-charcoal">{task.title}</h3>
                        {task.done && (
                          <span className="border border-gold-primary/60 px-2 py-1 font-accent text-[10px] uppercase tracking-[0.15em] text-gold-dark">
                            <span className="inline-block align-middle" aria-hidden>
                              ✓
                            </span>{" "}
                            Done
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          "font-heading mt-4 text-sm font-light leading-relaxed",
                          task.done ? "text-slate" : "text-charcoal/80"
                        )}
                      >
                        {task.description || "—"}
                      </p>
                      <p className="font-accent mt-4 text-[10px] uppercase tracking-[0.2em] text-slate">
                        Due{" "}
                        {new Date(task.due).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
