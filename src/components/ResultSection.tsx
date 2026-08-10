import React, { useState, useMemo, useEffect } from "react";
import {
  Table,
  Download,
  Check,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import "./ResultSection.css";

interface ResultSectionProps {
  result: any;
  isExecuting: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250];

const ResultSection: React.FC<ResultSectionProps> = ({
  result,
  isExecuting,
}) => {
  const [viewMode, setViewMode] = useState<"table" | "json">("table");
  const [expandedJson, setExpandedJson] = useState<{
    title: string;
    data: any;
  } | null>(null);

  // Pagination & Filter States
  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterText, setFilterText] = useState<string>("");

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  let rawData: any[] = [];
  if (Array.isArray(result)) {
    rawData = result;
  } else if (result?.data) {
    rawData = result.data;
  }

  let columns = result?.columns || [];
  if (columns.length === 0 && rawData.length > 0) {
    columns = Object.keys(rawData[0]);
  }
  const executionTime = result?.executionTime || result?.duration || 0;
  const sizeFormatted = result?.size || "0 B";

  // Filter rows across all column values
  const filteredData = useMemo(() => {
    if (!filterText.trim()) return rawData;
    const q = filterText.toLowerCase();
    return rawData.filter((row: any) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [rawData, filterText]);

  const totalRows = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  // Reset to page 1 whenever results change, filter changes, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [result, filterText, pageSize]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(currentPage * pageSize, totalRows);
  const displayRows = filteredData.slice(startIndex, endIndex);

  const handleExportCSV = () => {
    if (!rawData || rawData.length === 0) return;
    const keys = columns.map((c: any) => (typeof c === "object" ? c.key : c));
    const headers = columns.map((c: any) => (typeof c === "object" ? c.label : c));
    const csvRows = [headers.join(",")];

    filteredData.forEach((row: any) => {
      const values = keys.map((key: string) => {
        let val = row[key];
        if (val === null || val === undefined) return '""';
        if (typeof val === "object") val = JSON.stringify(val);
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvRows.push(values.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bigquery_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!result && !isExecuting) {
    return (
      <div
        className="table-wrap"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-3)",
          height: "100%",
        }}
      >
        <p>Run a query to see results here.</p>
      </div>
    );
  }

  if (result?.error) {
    return (
      <div className="table-wrap" style={{ padding: 24, color: "var(--warn)", height: "100%" }}>
        <h4>Error executing query</h4>
        <p>{result.error}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Top Bar ────────────────────────────────────────────────── */}
      <div className="results-bar">
        <div className="seg">
          <button
            className={viewMode === "table" ? "on" : ""}
            onClick={() => setViewMode("table")}
          >
            <Table size={11} style={{ marginRight: 4 }} /> Table
          </button>
          <button
            className={viewMode === "json" ? "on" : ""}
            onClick={() => setViewMode("json")}
          >
            <span
              style={{ fontSize: 11, marginRight: 4, fontFamily: "monospace" }}
            >
              {"{}"}
            </span>{" "}
            JSON
          </button>
        </div>
        <span className="vdiv" style={{ margin: "0 6px" }} />

        {isExecuting ? (
          <span className="stat" style={{ color: "var(--accent)" }}>
            <span className="pulsing-dot" style={{ marginRight: 6 }} /> Running
            query...
          </span>
        ) : (
          <React.Fragment>
            <span className="stat">
              <b>{rawData.length}</b> rows
            </span>
            <span className="dim">·</span>
            <span className="stat">
              <b>{executionTime}</b> ms
            </span>
            <span className="dim">·</span>
            <span className="stat">
              <b>{sizeFormatted}</b>
            </span>
            <span className="dim">·</span>
            <span className="stat">
              <Check size={11} style={{ color: "var(--accent)" }} /> success
            </span>
          </React.Fragment>
        )}

        <div className="grow" />

        <div
          className="row gap-2"
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "2px 8px",
            height: 24,
          }}
        >
          <Filter size={11} style={{ color: "var(--fg-3)" }} />
          <input
            placeholder="Filter rows…"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              color: "var(--fg)",
              fontSize: 11,
              width: 130,
              fontFamily: "inherit",
            }}
          />
          {filterText && (
            <button
              onClick={() => setFilterText("")}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--fg-3)",
                cursor: "pointer",
                padding: 0,
                display: "flex",
              }}
            >
              <X size={11} />
            </button>
          )}
        </div>

        <button className="btn btn-ghost" onClick={handleExportCSV} title="Export as CSV">
          <Download size={11} style={{ marginRight: 4 }} /> Export
        </button>
      </div>

      {/* ── Table View ─────────────────────────────────────────────── */}
      {viewMode === "table" && rawData && columns.length > 0 && (
        <div className="table-wrap" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <table className="dt">
            <thead>
              <tr>
                <th className="row-num"></th>
                {columns.map((c: any, i: number) => {
                  const key = typeof c === "object" ? c.key : c;
                  const label = typeof c === "object" ? c.label : c;
                  const type = typeof c === "object" ? c.type : "";
                  return (
                    <th key={key || i}>
                      {label}
                      {type && <span className="col-type">{type}</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row: any, i: number) => (
                <tr
                  key={i}
                  className="row-in"
                  style={{ animationDelay: `${i * 4}ms` }}
                >
                  <td className="row-num">{startIndex + i + 1}</td>
                  {columns.map((c: any, j: number) => {
                    const key = typeof c === "object" ? c.key : c;
                    const label = typeof c === "object" ? c.label : c;
                    const val = row[key];
                    const isNum = typeof val === "number";
                    const isObj = val !== null && typeof val === "object";

                    let isJsonStr = false;
                    let parsedObj = val;

                    if (
                      typeof val === "string" &&
                      (val.trim().startsWith("{") || val.trim().startsWith("["))
                    ) {
                      try {
                        parsedObj = JSON.parse(val);
                        isJsonStr = true;
                      } catch (e) {}
                    }

                    const isComplex = isObj || isJsonStr;

                    let displayVal: string | React.ReactNode = "";
                    if (isNum) {
                      displayVal = val.toLocaleString("en-US", {
                        minimumFractionDigits: Number.isInteger(val) ? 0 : 2,
                        maximumFractionDigits: 2,
                      });
                    } else if (isComplex) {
                      const strPreview = JSON.stringify(parsedObj);
                      displayVal = (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: "pointer",
                            color: "var(--accent)",
                            width: "100%",
                            overflow: "hidden",
                          }}
                          onClick={() =>
                            setExpandedJson({
                              title: String(label || key),
                              data: parsedObj,
                            })
                          }
                        >
                          <span
                            style={{
                              opacity: 0.7,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {strPreview}
                          </span>
                        </div>
                      );
                    } else {
                      displayVal = String(
                        val === null || val === undefined ? "" : val,
                      );
                    }

                    return (
                      <td
                        key={j}
                        className={isNum ? "num" : "str"}
                        style={{
                          maxWidth: 300,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── JSON View ──────────────────────────────────────────────── */}
      {viewMode === "json" && rawData && (
        <div className="json-wrapper" style={{ flex: 1, minHeight: 0 }}>
          <Editor
            height="100%"
            defaultLanguage="json"
            theme={isDark ? "vs-dark" : "light"}
            value={JSON.stringify(filteredData, null, 2)}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: "var(--font-mono, monospace)",
              lineNumbers: "off",
              folding: true,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      )}

      {/* ── Pagination Bar ────────────────────────────────────────── */}
      {viewMode === "table" && rawData.length > 0 && (
        <div
          style={{
            height: 36,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            background: "var(--bg-1)",
            borderTop: "1px solid var(--border)",
            fontSize: 12,
            color: "var(--fg-2)",
            userSelect: "none",
          }}
        >
          {/* Row count range */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>
              Showing <b>{totalRows > 0 ? startIndex + 1 : 0}</b>–
              <b>{endIndex}</b> of <b>{totalRows}</b> rows
            </span>
            {filteredData.length !== rawData.length && (
              <span style={{ color: "var(--fg-3)", fontSize: 11 }}>
                (filtered from {rawData.length})
              </span>
            )}
          </div>

          {/* Controls: Page Size Options & Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Page Size Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                Rows per page:
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{
                  background: "var(--bg-2)",
                  color: "var(--fg)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} {opt === 100 ? "(Default)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Navigation buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                className="btn btn-icon btn-ghost"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                title="First Page"
                style={{ height: 24, width: 24, padding: 0 }}
              >
                <ChevronsLeft size={13} />
              </button>
              <button
                className="btn btn-icon btn-ghost"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Previous Page"
                style={{ height: 24, width: 24, padding: 0 }}
              >
                <ChevronLeft size={13} />
              </button>

              <span
                style={{
                  margin: "0 6px",
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                Page <b>{currentPage}</b> / <b>{totalPages}</b>
              </span>

              <button
                className="btn btn-icon btn-ghost"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Next Page"
                style={{ height: 24, width: 24, padding: 0 }}
              >
                <ChevronRight size={13} />
              </button>
              <button
                className="btn btn-icon btn-ghost"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Last Page"
                style={{ height: 24, width: 24, padding: 0 }}
              >
                <ChevronsRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── JSON Modal Detail ────────────────────────────────────── */}
      {expandedJson && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "80%",
              height: "80%",
              background: "var(--bg)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              border: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg-1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{ fontFamily: "monospace", color: "var(--accent)" }}
                >
                  {"{ }"}
                </span>
                {expandedJson.title}
              </h3>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => setExpandedJson(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ flex: 1, padding: 16 }}>
              <Editor
                height="100%"
                defaultLanguage="json"
                theme={isDark ? "vs-dark" : "light"}
                value={JSON.stringify(expandedJson.data, null, 2)}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultSection;
