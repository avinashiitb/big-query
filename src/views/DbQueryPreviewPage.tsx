import React, { useState, useEffect } from "react";
import QueryEditor from "../components/QueryEditor";
import ResultSection from "../components/ResultSection";
import { BigQueryIcon } from "../components/BigQueryIcon";
import { ipc } from "../ipc";
import "./DbQueryPreviewPage.css";

interface DbQueryPreviewPageProps {
  selectedConnectionId?: number | null;
  selectedDatabase?: string | null;
  previewData?: any;
  theme?: "light" | "dark";
  fileId?: string;
}

const DbQueryPreviewPage: React.FC<DbQueryPreviewPageProps> = ({
  selectedConnectionId: propConnId,
  selectedDatabase: propDatabase,
  previewData: propPreviewData,
  theme = "light",
  fileId,
}) => {
  const [query, setQuery] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(propConnId || null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(propDatabase || null);

  useEffect(() => {
    if (propPreviewData && typeof propPreviewData === 'object') {
      if (propPreviewData.query !== undefined) setQuery(propPreviewData.query);
      if (propPreviewData.result !== undefined) setResult(propPreviewData.result);
      if (propPreviewData.selectedConnectionId) setSelectedConnectionId(propPreviewData.selectedConnectionId);
      if (propPreviewData.selectedDatabase) setSelectedDatabase(propPreviewData.selectedDatabase);
    }
  }, [propPreviewData]);

  // Fallback state fetch if not passed directly via previewData
  useEffect(() => {
    if (propPreviewData) return;

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

        if (savedData && typeof savedData === 'object') {
          if (savedData.query !== undefined) setQuery(savedData.query);
          if (savedData.result !== undefined) setResult(savedData.result);
          if (savedData.selectedConnectionId) setSelectedConnectionId(savedData.selectedConnectionId);
          if (savedData.selectedDatabase) setSelectedDatabase(savedData.selectedDatabase);
        }
      } catch (e) {
        console.error("Failed to load preview data:", e);
      }
    };

    loadState();
  }, [fileId, propPreviewData]);

  // Send resize events to host DevScribe application
  useEffect(() => {
    const queryLines = (query || "").split('\n').length;
    let targetHeight = 450;
    if (result && Array.isArray(result.data) && result.data.length > 5) {
      targetHeight = Math.min(800, 300 + Math.min(result.data.length, 15) * 32);
    } else if (queryLines > 10) {
      targetHeight = 600;
    }
    (window as any).parent.postMessage({ type: 'RESIZE_PREVIEW', height: targetHeight }, '*');
  }, [query, result]);

  const handleRunQuery = async () => {
    if (!selectedConnectionId) {
      alert("No connection selected for query execution");
      return;
    }
    if (!query.trim()) return;

    setIsExecuting(true);
    try {
      const res = await ipc.invoke("execute-query", {
        configId: selectedConnectionId,
        query: query,
        database: selectedDatabase,
      });
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message || "Execution failed" });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="preview-container">
      <div className="preview-header">
        <div className="preview-header-title">
          <BigQueryIcon size={14} />
          <span>BigQuery Query</span>
          {selectedDatabase && (
            <span className="preview-header-db">· {selectedDatabase}</span>
          )}
        </div>
        {selectedConnectionId && (
          <button
            className="btn btn-primary btn-sm"
            onClick={handleRunQuery}
            disabled={isExecuting}
            style={{ padding: "3px 10px", fontSize: 11, gap: 4 }}
          >
            {isExecuting ? "Executing…" : "Run Query"}
          </button>
        )}
      </div>

      <div className="preview-body">
        <div className="preview-editor-wrapper">
          <QueryEditor
            value={query}
            onChange={setQuery}
            schemaTables={[]}
            selectedConnectionId={selectedConnectionId}
            selectedDatabase={selectedDatabase}
            readOnly={false}
            theme={theme}
          />
        </div>

        <div className="preview-results-wrapper">
          <ResultSection result={result} isExecuting={isExecuting} />
        </div>
      </div>
    </div>
  );
};

export default DbQueryPreviewPage;
