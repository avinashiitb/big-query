import { useEffect, useState, useMemo } from 'react';
import DbQueryPage from './views/DbQueryPage';
import DbQueryPreviewPage from './views/DbQueryPreviewPage';
import { ipc } from './ipc';

interface AppProps {
  fileId?: string;
  data?: any;
  onDataChange?: (data: any) => void;
  envVariables?: Array<{key: string, value: string}>;
  theme?: "dark" | "light";
  layout?: "side-by-side" | "top-bottom";
}

function App({
  fileId: fileIdProp = "demo-file",
  theme = "light",
  layout = "top-bottom",
}: AppProps) {
  const isPreview = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      let p = url.searchParams.get("preview");
      if (!p && window.location.hash.includes("?")) {
        const hashParams = new URLSearchParams(window.location.hash.split("?")[1]);
        p = hashParams.get("preview");
      }
      return p === "true";
    } catch (e) {
      return false;
    }
  }, []);

  const [previewData, setPreviewData] = useState<any>(null);

  // Listen for initial load and messages in preview mode
  useEffect(() => {
    if (!isPreview) return;

    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return;

      if (e.data.type === 'LOAD_PREVIEW') {
        const savedData = e.data.data;
        setPreviewData(savedData);
        if (savedData && typeof savedData === 'object') {
          if (savedData.selectedConnectionId) setSelectedConnectionId(savedData.selectedConnectionId);
          if (savedData.selectedDatabase) setSelectedDatabase(savedData.selectedDatabase);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    // Notify parent frame that preview is ready
    (window as any).parent?.postMessage({ type: 'PREVIEW_READY' }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, [isPreview]);

  const getFileId = () => {
    let id = (window as any).pluginAPI?.context?.fileId;
    if (id) return id;
    try {
      const url = new URL(window.location.href);
      id = url.searchParams.get("fileId");
      if (!id && window.location.hash.includes("?")) {
        const hashParams = new URLSearchParams(window.location.hash.split("?")[1]);
        id = hashParams.get("fileId");
      }
    } catch (e) { }
    return id || fileIdProp;
  };

  const fileId = getFileId();

  const [localTheme, setLocalTheme] = useState<"dark" | "light">(theme);
  const [localLayout, setLocalLayout] = useState<"top-bottom" | "side-by-side">(layout);

  // Lifted connection states
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadConnections = async () => {
    try {
      const result = await ipc.invoke("getConfiguredTools");
      const safeResult = Array.isArray(result) ? result : [];
      setConnections(safeResult);
      if (safeResult.length === 0) {
        setSelectedConnectionId(null);
        setSelectedDatabase(null);
      }
    } catch (e) {
      console.error("Failed to load connections:", e);
    }
  };

  useEffect(() => {
    const loadState = async () => {
      try {
        let savedData: any = null;
        const api = (window as any).pluginAPI;
        if (api && fileId && api.getDocumentsByParentFile) {
          const docs = await api.getDocumentsByParentFile(fileId);
          if (docs && docs.length > 0) {
            let parsed = docs[0]?.blocks?.[0]?.data;
            if (typeof parsed === "string") {
              try { parsed = JSON.parse(parsed); } catch (e) {}
            }
            savedData = parsed;
          }
        } else {
          savedData = await ipc.invoke("load-data");
        }

        if (savedData) {
          if (savedData.selectedConnectionId) setSelectedConnectionId(savedData.selectedConnectionId);
          if (savedData.selectedDatabase) setSelectedDatabase(savedData.selectedDatabase);
        }
      } catch (e) {}
      await loadConnections();
      setIsLoaded(true);
    };
    loadState();
  }, [fileId]);

  useEffect(() => {
    if (isLoaded && connections.length > 0 && !selectedConnectionId) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [isLoaded, connections, selectedConnectionId]);

  useEffect(() => {
    if (selectedConnectionId) {
      ipc.invoke('get-databases', { configId: selectedConnectionId })
        .then(dbs => {
          if (Array.isArray(dbs) && dbs.length > 0) {
            const selConn = connections.find(c => c.id === selectedConnectionId);
            const pinned = selConn?.database;
            const alreadyValid = selectedDatabase && dbs.includes(selectedDatabase);
            const defaultDb = alreadyValid
              ? selectedDatabase
              : (pinned && dbs.some(d => {
                  const parts = d.split('||');
                  return parts[0] === pinned || parts[1] === pinned;
                })
                  ? dbs.find(d => {
                      const parts = d.split('||');
                      return parts[0] === pinned || parts[1] === pinned;
                    })
                  : dbs[0]);
            setSelectedDatabase(defaultDb);
          } else {
            setSelectedDatabase(null);
          }
        })
        .catch(() => {
          setSelectedDatabase(null);
        });
    } else {
      setSelectedDatabase(null);
    }
  }, [selectedConnectionId, connections]);

  useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);

  useEffect(() => {
    setLocalLayout(layout);
  }, [layout]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', localTheme);
  }, [localTheme]);

  return (
    <div className="plugin-container">
      {isPreview ? (
        <DbQueryPreviewPage
          selectedConnectionId={selectedConnectionId}
          selectedDatabase={selectedDatabase}
          previewData={previewData}
          theme={localTheme}
          fileId={fileId}
        />
      ) : (
        <DbQueryPage
          fileId={fileId}
          connections={connections}
          selectedConnectionId={selectedConnectionId}
          setSelectedConnectionId={setSelectedConnectionId}
          selectedDatabase={selectedDatabase}
          setSelectedDatabase={setSelectedDatabase}
          onRefreshConnections={loadConnections}
          theme={localTheme}
          onToggleTheme={() => setLocalTheme(prev => prev === 'light' ? 'dark' : 'light')}
          layout={localLayout}
          onToggleLayout={() => setLocalLayout(prev => prev === 'top-bottom' ? 'side-by-side' : 'top-bottom')}
        />
      )}
    </div>
  );
}

export default App;
