import { useEffect, useState } from 'react';
import DbQueryPage from './views/DbQueryPage';
import DocDbPage from './docdb/DocDbPage';
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
              : (pinned && dbs.some(d => d === pinned || d.endsWith(`||${pinned}`))
                  ? dbs.find(d => d === pinned || d.endsWith(`||${pinned}`))
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

  const getIsDocDbRoute = () => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("route") === "docdb" || url.pathname.includes("/docdb")) {
        return true;
      }
      if (window.location.hash.includes("route=docdb") || window.location.hash.includes("/docdb")) {
        return true;
      }
    } catch (e) { }
    return false;
  };

  const [isDocDbRoute, setIsDocDbRoute] = useState(getIsDocDbRoute());

  useEffect(() => {
    const handleHashChange = () => {
      setIsDocDbRoute(getIsDocDbRoute());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const selectedConnection = connections.find(c => c.id === selectedConnectionId);
  const isDocDb = isDocDbRoute || selectedConnection?.type === 'mongodb' || selectedConnection?.type === 'mongo';

  return (
    <div className="plugin-container">
      {isDocDb ? (
        <DocDbPage
          fileId={fileId}
          connections={connections}
          selectedConnectionId={selectedConnectionId}
          setSelectedConnectionId={setSelectedConnectionId}
          selectedDatabase={selectedDatabase}
          setSelectedDatabase={setSelectedDatabase}
          onRefreshConnections={loadConnections}
          theme={localTheme}
          onToggleTheme={() => setLocalTheme(prev => prev === 'light' ? 'dark' : 'light')}
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
