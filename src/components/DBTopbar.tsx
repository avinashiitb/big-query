import React, { useState, useRef, useEffect } from "react";
import {
  Database,
  Bolt,
  Sun,
  Moon,
  Sparkles,
  Settings,
  Play,
  ChevronDown,
  Check,
  Folder,
} from "lucide-react";
import "./DBTopbar.css";

interface DBTopbarProps {
  connections: any[];
  selectedConnectionId: number | null;
  onSelectConnection: (id: number | null) => void;
  theme?: string;
  onToggleTheme?: () => void;
  view?: string;
  setView?: (v: string) => void;
  isExecuting?: boolean;
  onExecute?: () => void;
  fileName?: string;
  breadcrumbs?: { label: string; isFile?: boolean }[];
}

const DBTopbar: React.FC<DBTopbarProps> = ({
  connections,
  selectedConnectionId,
  onSelectConnection,
  theme = "light",
  onToggleTheme,
  view = "query",
  setView,
  isExecuting = false,
  onExecute,
  fileName = "Untitled",
  breadcrumbs = [],
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const safeConnections = Array.isArray(connections) ? connections : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedConnection =
    safeConnections.find((c) => c.id === selectedConnectionId) ??
    (safeConnections.length > 0 ? safeConnections[0] : null);
  const hostName = selectedConnection?.host
    ? selectedConnection.host.split("@").pop()
    : "localhost";

  return (
    <header className="header">
      {/* Breadcrumb path */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          fontSize: 12,
          overflow: "visible",
          flexWrap: "nowrap",
          userSelect: "none",
        }}
        aria-label="file path"
      >
        <Folder size={11} style={{ marginRight: 6, opacity: 0.7, color: "var(--fg-3)" }} />
        {(breadcrumbs.length > 0
          ? breadcrumbs
          : [{ label: fileName || "Untitled", isFile: true }]
        ).map((seg, idx) => (
          <React.Fragment key={idx}>
            {!seg.isFile && (
              <>
                <span
                  style={{
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--fg-3)",
                    cursor: "default",
                  }}
                  title={seg.label}
                >
                  {seg.label}
                </span>
                <span style={{ color: "var(--fg-3)", opacity: 0.5, margin: "0 4px", fontSize: 13, userSelect: "none" }}>›</span>
              </>
            )}
            {seg.isFile && (
              <span
                style={{
                  whiteSpace: "nowrap",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--fg)",
                  cursor: "default",
                }}
                title={seg.label}
              >
                {seg.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>

      <span className="vdiv"></span>
      <div className="seg" style={{ padding: "1px 2px", height: 26 }}>
        <button
          className={view === "query" ? "on" : ""}
          onClick={() => setView && setView("query")}
          style={{ height: 22, display: "flex", alignItems: "center", gap: 6 }}
        >
          <Bolt size={11} /> Query
        </button>
        <button
          className={view === "connections" ? "on" : ""}
          onClick={() => setView && setView("connections")}
          style={{ height: 22, display: "flex", alignItems: "center", gap: 6 }}
        >
          <Database size={11} /> Connections
        </button>
      </div>

      <div className="grow"></div>

      {selectedConnection && (
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <button
            className="chip"
            title="Select active connection"
            style={{
              padding: "0 8px",
              height: 26,
              cursor: "pointer",
              background: isDropdownOpen ? "var(--bg-3)" : "var(--bg-2)",
            }}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className="dot"></span>
            <span
              className="badge"
              style={{
                fontSize: 10,
                color: "var(--warn)",
                background: "rgba(245, 158, 11, 0.1)",
                padding: "1px 6px",
                borderRadius: 3,
                fontWeight: 600,
              }}
            >
              My
            </span>
            <b style={{ color: "var(--fg)", fontWeight: 600 }}>
              {selectedConnection.name}
            </b>
            <span className="dim">·</span>
            <span className="dim mono" style={{ fontSize: 10 }}>
              {hostName}
            </span>
            <ChevronDown
              size={12}
              style={{ marginLeft: 4, color: "var(--fg-3)" }}
            />
          </button>

          {isDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 6,
                width: 240,
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                boxShadow: "var(--shadow)",
                zIndex: 100,
                padding: 4,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {safeConnections.map((c) => {
                const cHost = c.host ? c.host.split("@").pop() : "localhost";
                return (
                  <button
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px",
                      borderRadius: 4,
                      background:
                        c.id === selectedConnection.id
                          ? "var(--accent-soft)"
                          : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      color:
                        c.id === selectedConnection.id
                          ? "var(--accent-fg)"
                          : "var(--fg)",
                      fontFamily: "var(--font-ui)",
                    }}
                    onClick={() => {
                      if (onSelectConnection) onSelectConnection(c.id);
                      setIsDropdownOpen(false);
                    }}
                    onMouseEnter={(e) => {
                      if (c.id !== selectedConnection.id)
                        e.currentTarget.style.background = "var(--bg-2)";
                    }}
                    onMouseLeave={(e) => {
                      if (c.id !== selectedConnection.id)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span
                      className="dot"
                      style={{
                        opacity: c.id === selectedConnection.id ? 1 : 0.2,
                      }}
                    ></span>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: "var(--fg-3)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {cHost}
                      </span>
                    </div>
                    {c.id === selectedConnection.id && (
                      <Check size={12} style={{ color: "var(--accent)" }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {view === "query" && (
        <React.Fragment>
          <button className="btn btn-ghost" style={{ marginLeft: 8 }}>
            <Sparkles size={11} /> Format
          </button>
          <button
            className="btn btn-primary"
            style={{ marginLeft: 8 }}
            onClick={onExecute}
            disabled={isExecuting}
          >
            <Play size={11} fill={isExecuting ? "none" : "currentColor"} />
            {isExecuting ? "Running..." : "Run"}
            <span
              className="kbd"
              style={{
                background: "rgba(0,0,0,0.15)",
                borderColor: "transparent",
                color: "#fff",
                marginLeft: 4,
              }}
            >
              ⌘↵
            </span>
          </button>
        </React.Fragment>
      )}

      {/* <button className="btn btn-ghost" style={{ marginLeft: 8 }}>
        <Share2 size={11} /> Share
      </button> */}

      {/* <button className="btn btn-primary" style={{ marginLeft: 8 }}>
        <Save size={11} /> Save
        <span
          className="kbd"
          style={{
            background: "rgba(0,0,0,0.15)",
            borderColor: "transparent",
            color: "#fff",
            marginLeft: 4,
          }}
        >
          ⌘S
        </span>
      </button> */}

      <span className="vdiv" style={{ margin: "0 8px" }}></span>

      <button className="btn btn-icon btn-ghost" onClick={onToggleTheme}>
        {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
      </button>

      <button className="btn btn-icon btn-ghost">
        <Settings size={12} />
      </button>
    </header>
  );
};

export default DBTopbar;
