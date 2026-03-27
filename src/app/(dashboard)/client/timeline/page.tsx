"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/animations/variants";
import { dashBtn, dashCard, dashLabel } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string;
  due: string;
  done: boolean;
};

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Finalize guest list export",
    description: "Share CSV with planner for transport matrix.",
    due: "2025-04-01",
    done: true,
  },
  {
    id: "2",
    title: "Sangeet run-of-show",
    description: "Confirm cue sheet with DJ and emcee.",
    due: "2025-04-15",
    done: false,
  },
  {
    id: "3",
    title: "Final attire pickup",
    description: "Bridal lehenga and groom sherwani trials.",
    due: "2025-05-01",
    done: false,
  },
  {
    id: "4",
    title: "Welcome dinner seating",
    description: "Approve table plan and dietary flags.",
    due: "2025-05-20",
    done: false,
  },
];

export default function ClientTimelinePage() {
  const [tasks, setTasks] = useState(initialTasks);

  const toggle = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={dashLabel}>Planning</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-charcoal">Timeline</h2>
        </div>
        <button type="button" className={dashBtn}>
          Add Task
        </button>
      </motion.div>

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
                <div
                  className="absolute left-[7px] top-3 z-10 flex h-8 w-8 items-center justify-center border border-gold-primary/60 bg-ivory md:left-1/2 md:-ml-4"
                >
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
                    isRight ? "md:ml-auto md:pl-16 md:text-right" : "md:pr-16",
                  )}
                >
                  <div className={cn(dashCard, task.done && "opacity-55")}>
                    <div
                      className={cn(
                        "flex flex-wrap items-start justify-between gap-3 border-b border-charcoal/8 pb-3",
                        isRight && "md:flex-row-reverse",
                      )}
                    >
                      <h3 className="font-display text-lg text-charcoal">{task.title}</h3>
                      {task.done ? (
                        <span className="border border-gold-primary/60 px-2 py-1 font-accent text-[10px] uppercase tracking-[0.15em] text-gold-dark">
                          <span className="inline-block align-middle" aria-hidden>
                            ✓
                          </span>{" "}
                          Done
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "font-heading mt-4 text-sm font-light leading-relaxed",
                        task.done ? "text-slate" : "text-charcoal/80",
                      )}
                    >
                      {task.description}
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
    </motion.div>
  );
}
