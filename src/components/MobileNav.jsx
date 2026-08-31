import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { LayoutDashboard, Calendar, ListTodo, BookOpen, Quote, UserCircle, Menu, X } from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/thoughts", label: "Thoughts", icon: BookOpen },
  { to: "/quote", label: "Quote", icon: Quote },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 backdrop-blur px-5 py-3">
      <Link to="/" className="font-heading text-2xl font-semibold">Pace</Link>
      <button onClick={() => setOpen(v => !v)} className="rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent/50">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <nav className="absolute left-0 right-0 top-full border-b border-border bg-card px-5 py-3 flex flex-col gap-1 shadow-soft-lg">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
                }`
              }
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
