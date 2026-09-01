import React from "react";
import { NavLink, Link } from "react-router-dom";
import { LayoutDashboard, Calendar, ListTodo, BookOpen, Quote, UserCircle, Library } from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/thoughts", label: "Thoughts", icon: BookOpen },
  { to: "/quote", label: "Daily Quote", icon: Quote },
  { to: "/library", label: "Library", icon: Library },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar/60 backdrop-blur-sm px-5 py-8">
      <Link to="/" className="mb-10 px-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Pace
        </h1>
        <p className="mt-1 text-xs font-body text-muted-foreground tracking-wide">
          a quiet place for your day
        </p>
      </Link>

      <nav className="flex flex-col gap-1">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] transition-transform group-hover:scale-105" strokeWidth={1.6} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl bg-card/70 p-4 shadow-soft">
        <p className="font-heading text-sm italic text-muted-foreground leading-relaxed">
          "Slow is smooth, smooth is fast."
        </p>
      </div>
    </aside>
  );
}
