import React, { useState } from 'react';
import { Table, Key } from 'lucide-react';

interface ErDiagramProps {
  tables?: any[];
}

export const ErDiagram: React.FC<ErDiagramProps> = ({ tables = [] }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  let schema: any[] = (tables && tables.length > 0)
    ? tables.filter(t => t.type === 'table' || t.type === 'view')
    : [];

  // Show empty state when no data is loaded yet
  if (schema.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--fg-3)', gap: 10 }}>
        <Table size={36} style={{ opacity: 0.25 }} />
        <span style={{ fontSize: 13 }}>No tables found — select a database and refresh</span>
      </div>
    );
  }

  const isReal = true;
  
  if (isReal) {
    // Topological Sort: Parents (referenced) should come before Children (referencing)
    const graph: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    
    schema.forEach(t => {
      if (!graph[t.name]) graph[t.name] = [];
      if (!(t.name in inDegree)) inDegree[t.name] = 0;
      
      (t.columns || []).forEach((c: any) => {
        if (c.fkTarget) {
          const parent = c.fkTarget;
          const child = t.name;
          if (!graph[parent]) graph[parent] = [];
          if (!(parent in inDegree)) inDegree[parent] = 0;
          
          graph[parent].push(child);
          inDegree[child] = (inDegree[child] || 0) + 1;
        }
      });
    });

    const queue: string[] = [];
    Object.keys(inDegree).forEach(node => {
      if (inDegree[node] === 0) queue.push(node);
    });

    const sortedNames: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      sortedNames.push(node);
      const readyNeighbors: string[] = [];
      (graph[node] || []).forEach(neighbor => {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) readyNeighbors.push(neighbor);
      });
      // Prioritize children by adding them to the front of the queue (DFS style)
      queue.unshift(...readyNeighbors);
    }

    schema.forEach(t => {
      if (!sortedNames.includes(t.name)) {
        sortedNames.push(t.name);
      }
    });

    schema = sortedNames.map(name => schema.find(t => t.name === name)).filter(Boolean) as any[];
  }

  const positions: Record<string, { x: number, y: number, w: number }> = {};
  let col = 0;
  let row = 0;
  schema.forEach((t) => {
    positions[t.name] = {
      x: 40 + col * 360,
      y: 40 + row * 400,
      w: 240
    };
    col++;
    if (col > 2) {
      col = 0;
      row++;
    }
  });

  let activeRelations: Array<{from: string, fromCol: string, to: string, toCol: string}> = [];
  if (isReal) {
    const rels: Array<{from: string, fromCol: string, to: string, toCol: string}> = [];
    schema.forEach(t => {
      (t.columns || []).forEach((c: any) => {
        if (c.fkTarget) {
          rels.push({
            from: c.fkTarget, // Parent
            fromCol: c.fkCol || 'id',
            to: t.name, // Child
            toCol: c.name
          });
        }
      });
    });
    activeRelations = rels;
  }

  const isHighlighted = (table: string) => {
    if (!hovered) return false;
    if (hovered === table) return true;
    return activeRelations.some(r => 
      (r.from === hovered && r.to === table) || 
      (r.to === hovered && r.from === table)
    );
  };

  return (
    <div className="er-wrap" style={{ flex: 1, position: 'relative', overflow: 'auto', background: 'var(--bg)' }}>
      <div style={{ position: 'relative', width: 920, height: 600, minWidth: '100%', minHeight: '100%' }}>
        
        {/* Edges layer */}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
          {activeRelations.map((r, i) => {
            const a = positions[r.from];
            const b = positions[r.to];
            if (!a || !b) return null;

            // Determine if tables overlap horizontally (e.g., same column)
            const overlapX = !(a.x + a.w < b.x || b.x + b.w < a.x);
            
            // Calculate Y coordinate based on column position
            const getColY = (tableName: string, colName: string) => {
              const table = schema.find(t => t.name === tableName);
              if (!table || !table.columns) return 60;
              const idx = table.columns.findIndex((c: any) => c.name === colName);
              // Header height ~34px, + 4px padding, + index * 24px row height + 12px half-row
              return (idx >= 0) ? (34 + 4 + (idx * 24) + 12) : 60;
            };

            const y1 = a.y + getColY(r.from, r.fromCol);
            const y2 = b.y + getColY(r.to, r.toCol);
            
            let x1, x2, path;
            
            if (overlapX) {
              // Same column, use a C-curve
              x1 = a.x + a.w;
              x2 = b.x + b.w;
              const cx = Math.max(x1, x2) + 60; // wider curve
              path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
            } else {
              // Different columns
              const aIsLeft = a.x < b.x;
              x1 = aIsLeft ? a.x + a.w : a.x;
              x2 = aIsLeft ? b.x : b.x + b.w;
              
              const cx = (x1 + x2) / 2;
              path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
            }

            const active = hovered === r.from || hovered === r.to;

            return (
              <g key={i}>
                <path 
                  d={path} 
                  fill="none"
                  stroke={active ? "var(--accent)" : "var(--fg-3)"}
                  strokeWidth={active ? 2 : 1.5}
                  strokeDasharray={active ? "none" : "4 2"}
                  style={{ transition: 'all 0.2s' }}
                />
                <circle cx={x1} cy={y1} r={3} fill={active ? "var(--accent)" : "var(--fg-3)"} />
                <circle cx={x2} cy={y2} r={3} fill={active ? "var(--accent)" : "var(--fg-3)"} />
              </g>
            );
          })}
        </svg>

        {/* Nodes layer */}
        {schema.map(t => {
          const pos = positions[t.name];
          if (!pos) return null;
          const hi = isHighlighted(t.name);
          const columns = t.columns || [];

          return (
            <div 
              key={t.name}
              onMouseEnter={() => setHovered(t.name)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: pos.w,
                background: 'var(--bg-1)',
                border: hi ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 6,
                boxShadow: hi ? '0 0 0 2px var(--accent-soft), var(--shadow)' : 'var(--shadow-sm)',
                transform: hi ? 'translateY(-2px)' : 'none',
                zIndex: hi ? 4 : 1,
                transition: 'all 0.2s',
                overflow: 'hidden'
              }}
            >
              <div style={{ 
                padding: '8px 12px', 
                borderBottom: '1px solid var(--border)', 
                background: 'var(--bg-2)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
                fontSize: 13,
                color: hi ? 'var(--accent-fg)' : 'var(--fg)'
              }}>
                <Table size={14} />
                {t.name}
              </div>
              <div style={{ padding: '4px 0' }}>
                {columns.map((c: any) => (
                  <div key={c.name} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '4px 12px',
                    fontSize: 12,
                    color: 'var(--fg-2)',
                    gap: 8,
                    height: 24,
                    boxSizing: 'border-box'
                  }}>
                    {c.pk || c.isPrimary ? <Key size={12} style={{ color: 'var(--warn)' }} /> : 
                     (c.fk || c.fkTarget) ? <Key size={12} style={{ color: 'var(--fg-3)' }} /> : 
                     <span style={{ width: 12 }}></span>}
                    <span style={{ flex: 1, color: (c.pk || c.isPrimary || c.fk || c.fkTarget) ? 'var(--fg)' : 'inherit' }}>{c.name}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{c.type}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
