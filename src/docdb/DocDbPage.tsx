import React, { useState, useEffect, useRef, useCallback } from "react";
import DBTopbar from "../components/DBTopbar";
import DocDbSidebar from "./DocDbSidebar";
import DocDbEditor from "./DocDbEditor";
import ResultSection from "../components/ResultSection";
import DocDbConnectionsView from "./DocDbConnectionsView";
import { ipc } from "../ipc";
import "./DocDbPage.css";

interface DocDbPageProps {
  theme: string;
  onToggleTheme: () => void;
  fileId?: string;
  connections: any[];
  selectedConnectionId: number | null;
  setSelectedConnectionId: (id: number | null) => void;
  selectedDatabase: string | null;
  setSelectedDatabase: (db: string | null) => void;
  onRefreshConnections: () => void;
}

const DocDbPage: React.FC<DocDbPageProps> = ({
  theme,
  onToggleTheme,
  fileId,
  connections,
  selectedConnectionId,
  setSelectedConnectionId,
  selectedDatabase,
  setSelectedDatabase: _setSelectedDatabase,
  onRefreshConnections,
}) => {
  const [query, setQuery] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [executionTime, setExecutionTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [view, setView] = useState("query");
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [contentDoc, setContentDoc] = useState<any>(null);
  const [fileName, setFileName] = useState("Untitled MongoDB Query");
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; isFile?: boolean }[]>([]);

  const mainRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);
  const [editorHeight, setEditorHeight] = useState(50);

  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const isDraggingRight = useRef(false);

  // Resize handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const newHeightPercent = ((e.clientY - rect.top) / rect.height) * 100;
    if (newHeightPercent > 15 && newHeightPercent < 85) {
      setEditorHeight(newHeightPercent);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "default";
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "row-resize";
  }, [handleMouseMove, handleMouseUp]);

  const handleRightMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRight.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 180 && newWidth <= 520) setRightPanelWidth(newWidth);
  }, []);

  const handleRightMouseUp = useCallback(() => {
    isDraggingRight.current = false;
    document.removeEventListener("mousemove", handleRightMouseMove);
    document.removeEventListener("mouseup", handleRightMouseUp);
    document.body.style.cursor = "default";
  }, [handleRightMouseMove]);

  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRight.current = true;
    document.addEventListener("mousemove", handleRightMouseMove);
    document.addEventListener("mouseup", handleRightMouseUp);
    document.body.style.cursor = "col-resize";
  }, [handleRightMouseMove, handleRightMouseUp]);

  // Load and save state
  useEffect(() => {
    const loadState = async () => {
      try {
        let savedData: any = null;
        const api = (window as any).pluginAPI;
        if (api) {
          if (fileId && api.getFileDetailsById) {
            const fileInfo = await api.getFileDetailsById(fileId);
            if (fileInfo && fileInfo.title) {
              setFileName(fileInfo.title);
            }
            // Fetch breadcrumb path
            if (api.getNestedPath) {
              api.getNestedPath({ fileId }).then((result: any) => {
                if (result) {
                  setBreadcrumbs([
                    ...result.folders.map((f: any) => ({ label: f.name, isFile: false })),
                    ...(result.file ? [{ label: result.file.title, isFile: true }] : []),
                  ]);
                }
              }).catch(() => {});
            }
          }
          if (fileId && api.getDocumentsByParentFile) {
            const data = await api.getDocumentsByParentFile(fileId);
            if (data && data.length > 0) {
              const document = data[0];
              setContentDoc(document);
              let parsed = document?.blocks?.[0]?.data;
              if (typeof parsed === "string") {
                try {
                  parsed = JSON.parse(parsed);
                } catch (e) {}
              }
              savedData = parsed;
            }
          } else {
            savedData = await ipc.invoke("load-data");
          }
        } else {
          savedData = await ipc.invoke("load-data");
        }

        if (savedData && Object.keys(savedData).length > 0) {
          if (savedData.query) setQuery(savedData.query);
          if (savedData.results) setResults(savedData.results);
          if (savedData.executionTime) setExecutionTime(savedData.executionTime);
        } else {
          setQuery("// Query MongoDB using JavaScript syntax\ndb.orders.find({ status: 'fulfilled' }).limit(10);");
        }
      } catch (e) {
        console.error("Failed to load state", e);
        setQuery("// Query MongoDB using JavaScript syntax\ndb.orders.find({ status: 'fulfilled' }).limit(10);");
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, [fileId]);

  useEffect(() => {
    if (!isLoaded) return;
    const timeoutId = setTimeout(async () => {
      const payloadData = { query, results, executionTime, selectedConnectionId, selectedDatabase };
      const api = (window as any).pluginAPI;
      if (api && api.updateDocument && fileId) {
        const updatedContents = {
          version: "1.0.0",
          time: Date.now(),
          blocks: [{ type: "data-bridge", data: payloadData }],
          parent_file: fileId,
          _id: contentDoc?._id,
        };
        try {
          await api.updateDocument(fileId, [updatedContents]);
        } catch (e) {
          console.error(e);
        }
      } else {
        try {
          await ipc.invoke("save-data", payloadData);
        } catch (e) {
          console.error(e);
        }
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query, results, executionTime, selectedConnectionId, selectedDatabase, isLoaded, fileId, contentDoc]);

  // Fetch MongoDB collections/schema
  const loadCollections = async () => {
    if (!selectedConnectionId) return;
    try {
      const cols = await ipc.invoke("get-database-tables", {
        configId: selectedConnectionId,
        database: selectedDatabase,
      });
      setCollections(Array.isArray(cols) ? cols : []);
    } catch (e) {
      console.error("Failed to fetch MongoDB collections", e);
      setCollections([]);
    }
  };

  useEffect(() => {
    loadCollections();
  }, [selectedConnectionId, selectedDatabase]);

  const handleSelectCollection = (colName: string) => {
    setSelectedCollection(colName);
    // Auto-populate initial simple query in editor
    setQuery(`db.${colName}.find({}).limit(10);`);
  };

  const handleRunQuery = async () => {
    if (!selectedConnectionId || isExecuting) return;
    setIsExecuting(true);
    setError(null);
    const start = performance.now();
    try {
      const res = await ipc.invoke("execute-query", {
        configId: selectedConnectionId,
        query,
        database: selectedDatabase,
      });
      const end = performance.now();
      setExecutionTime(end - start);
      if (res && res.error) {
        setError(res.error);
        setResults([]);
      } else {
        setResults(Array.isArray(res) ? res : [res]);
      }
    } catch (err: any) {
      const end = performance.now();
      setExecutionTime(end - start);
      setError(err?.message || "Failed to execute query.");
      setResults([]);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="docdb-container">
      <DBTopbar
        connections={connections}
        selectedConnectionId={selectedConnectionId}
        onSelectConnection={setSelectedConnectionId}
        theme={theme}
        onToggleTheme={onToggleTheme}
        view={view}
        setView={setView}
        isExecuting={isExecuting}
        onExecute={handleRunQuery}
        fileName={fileName}
        breadcrumbs={breadcrumbs}
      />

      <div className="docdb-main-layout">
        {view === "connections" ? (
          <main className="db-main" style={{ display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
            <DocDbConnectionsView
              connections={connections}
              selectedConnectionId={selectedConnectionId}
              selectedDatabase={selectedDatabase}
              onSelectConnection={setSelectedConnectionId}
              onConnectionsChange={onRefreshConnections}
              onSelectCollection={handleSelectCollection}
              onSwitchToQuery={() => setView("query")}
            />
          </main>
        ) : (
          <React.Fragment>
            <main className="db-main" ref={mainRef}>
              <div
                className="editor"
                style={{
                  height: `${editorHeight}%`,
                  minHeight: "100px",
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--bg-1)",
                }}
              >
                <DocDbEditor value={query} onChange={setQuery} collections={collections} />
              </div>

              {/* Horizontal divider row resize */}
              <div
                style={{
                  height: 4,
                  background: "var(--border)",
                  cursor: "row-resize",
                  width: "100%",
                  zIndex: 20,
                  transition: "background 0.2s",
                }}
                onMouseDown={handleMouseDown}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--border)")}
              />

              <ResultSection
                result={results.length > 0 || error ? { data: results, error, executionTime } : null}
                isExecuting={isExecuting}
              />
            </main>

            {/* Vertical divider panel resize */}
            <div
              style={{
                width: 4,
                background: "var(--border)",
                cursor: "col-resize",
                height: "100%",
                zIndex: 20,
                transition: "background 0.2s",
              }}
              onMouseDown={handleRightMouseDown}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--border)")}
            />

            <div style={{ width: rightPanelWidth }}>
              <DocDbSidebar
                collections={collections}
                onSelectCollection={handleSelectCollection}
                selectedCollection={selectedCollection}
                connection={connections.find((c) => c.id === selectedConnectionId)}
                database={selectedDatabase}
                onSelectDatabase={_setSelectedDatabase}
                onRefresh={loadCollections}
              />
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

export default DocDbPage;
