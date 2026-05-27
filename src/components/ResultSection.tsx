import React, { useState } from "react";
import {
  Table,
  Download,
  Check,
  Filter,
  MoreHorizontal,
  X,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import "./ResultSection.css";

interface ResultSectionProps {
  result: any;
  isExecuting: boolean;
}

const ResultSection: React.FC<ResultSectionProps> = ({
  result,
  isExecuting,
}) => {
  const [viewMode, setViewMode] = useState<"table" | "json">("table");
  const [expandedJson, setExpandedJson] = useState<{
    title: string;
    data: any;
  } | null>(null);
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  if (!result && !isExecuting) {
    return (
      <div
        className="table-wrap"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-3)",
        }}
      >
        <p>Run a query to see results here.</p>
      </div>
    );
  }

  if (result?.error) {
    return (
      <div className="table-wrap" style={{ padding: 24, color: "var(--warn)" }}>
        <h4>Error executing query</h4>
        <p>{result.error}</p>
      </div>
    );
  }

  let data = [];
  if (Array.isArray(result)) {
    data = result;
  } else if (result?.data) {
    data = result.data;
  }

  let columns = result?.columns || [];
  if (columns.length === 0 && data.length > 0) {
    columns = Object.keys(data[0]);
  }
  const executionTime = result?.executionTime || result?.duration || 0;

  return (
    <React.Fragment>
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
          <span className="stat" style={{ color: "var(--accent-color)" }}>
            <span className="pulsing-dot" style={{ marginRight: 6 }} /> Running
            query...
          </span>
        ) : (
          <React.Fragment>
            <span className="stat">
              <b>{data.length}</b> rows
            </span>
            <span className="dim">·</span>
            <span className="stat">
              <b>{executionTime}</b> ms
            </span>
            <span className="dim">·</span>
            <span className="stat">
              <b>4.2</b> KB
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
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              color: "var(--fg)",
              fontSize: 11,
              width: 140,
              fontFamily: "inherit",
            }}
          />
        </div>

        <button className="btn btn-ghost">
          <Download size={11} style={{ marginRight: 4 }} /> Export
        </button>
        <button className="btn btn-icon btn-ghost">
          <MoreHorizontal size={12} />
        </button>
      </div>
      {viewMode === "table" && data && columns.length > 0 && (
        <div className="table-wrap">
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
              {data.map((row: any, i: number) => (
                <tr
                  key={i}
                  className="row-in"
                  style={{ animationDelay: `${i * 8}ms` }}
                >
                  <td className="row-num">{i + 1}</td>
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

      {viewMode === "json" && data && (
        <div className="json-wrapper" style={{ height: "calc(100% - 42px)" }}>
          <Editor
            height="100%"
            defaultLanguage="json"
            theme={isDark ? "vs-dark" : "light"}
            value={JSON.stringify(data, null, 2)}
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
    </React.Fragment>
  );
};

export default ResultSection;
