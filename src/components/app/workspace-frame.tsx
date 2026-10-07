"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
const SidebarContext = createContext({ collapsed: false, toggle: () => {} });
export function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setCollapsed(localStorage.getItem("kept:sidebar") === "collapsed");
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  function toggle() {
    setCollapsed((v) => {
      try {
        localStorage.setItem("kept:sidebar", !v ? "collapsed" : "expanded");
      } catch {}
      return !v;
    });
  }
  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <div
        className="kept-workspace flex min-h-screen"
        data-sidebar={collapsed ? "collapsed" : "expanded"}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}
export function SidebarToggle() {
  const { collapsed, toggle } = useContext(SidebarContext);
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <button
      onClick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      aria-controls="workspace-sidebar"
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="hidden size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink-2 transition-colors hover:bg-paper-2 lg:flex"
    >
      <Icon className="size-[18px]" />
    </button>
  );
}
