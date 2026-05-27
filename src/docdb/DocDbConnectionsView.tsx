import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, Plus, Search, Settings, RefreshCw, Trash2,
  AlertTriangle, CheckCircle2, XCircle, Play, LayoutGrid, X,
  ChevronRight, ChevronDown,
} from 'lucide-react';
import { ipc } from '../ipc';
import { AddConnectionForm } from '../components/AddConnectionForm';

// ── Types ──────────────────────────────────────────────────────────────────
interface DocDbConnectionsViewProps {
  connections: any[];
  selectedConnectionId: number | null;
  selectedDatabase: string | null;
  onSelectConnection: (id: number | null) => void;
  onConnectionsChange?: () => void;
  onSelectCollection?: (name: string) => void;
  onSwitchToQuery?: () => void;
}

// ── Field DNA colours ──────────────────────────────────────────────────────
const DNA_COLORS: Record<string, string> = {
  id: '#f59e0b', objectid: '#f59e0b',
  string: '#3b82f6', text: '#3b82f6', varchar: '#3b82f6',
  number: '#10b981', int: '#10b981', integer: '#10b981',
  float: '#10b981', double: '#10b981', decimal: '#10b981',
  date: '#8b5cf6', datetime: '#8b5cf6', timestamp: '#8b5cf6',
  boolean: '#94a3b8', bool: '#94a3b8',
  object: '#06b6d4', array: '#f97316', null: '#ef4444',
};
const dnaColor = (type: string) => DNA_COLORS[type?.toLowerCase()] ?? '#64748b';

const TYPE_LABEL: Record<string, string> = {
  id: 'id', objectid: 'ObjectId',
  string: 'String', text: 'String', varchar: 'String',
  number: 'Number', int: 'Int', integer: 'Int',
  float: 'Float', double: 'Double', decimal: 'Decimal',
  date: 'Date', datetime: 'Date', timestamp: 'Timestamp',
  boolean: 'Bool', bool: 'Bool',
  object: 'Object', array: 'Array', null: 'Null',
};
const typeLabel = (t: string) => TYPE_LABEL[t?.toLowerCase()] ?? t ?? 'Mixed';

// ── Format helpers ─────────────────────────────────────────────────────────
const fmtCount = (n?: number) => {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};
const fmtSize = (bytes?: number) => {
  if (bytes == null) return '—';
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
  return `${bytes} B`;
};

// ── Connection icon helper ─────────────────────────────────────────────────
function connChip(conn: any) {
  const n = conn.name?.toLowerCase() ?? '';
  const t = conn.type?.toLowerCase() ?? '';
  if (t === 'postgres' || n.includes('pg')) return { bg: 'rgba(59,130,246,0.14)', color: '#3b82f6', label: 'Pg' };
  if (t === 'mongo' || t === 'mongodb' || n.includes('mongo')) return { bg: 'rgba(16,185,129,0.14)', color: '#10b981', label: 'Mg' };
  if (n.includes('elastic') || t === 'elastic' || t === 'elasticsearch') return { bg: 'rgba(245,158,11,0.14)', color: '#f59e0b', label: 'Es' };
  if (n.includes('redis')) return { bg: 'rgba(239,68,68,0.14)', color: '#ef4444', label: 'Rd' };
  if (n.includes('cassandra') || n.includes('scylla')) return { bg: 'rgba(239,68,68,0.14)', color: '#ef4444', label: 'Sc' };
  if (n.includes('couch') || t === 'couchdb') return { bg: 'rgba(245,158,11,0.14)', color: '#f59e0b', label: 'Cd' };
  return { bg: 'rgba(16,185,129,0.14)', color: '#10b981', label: 'Mg' };
}

// ── Schema field tree (recursive) ──────────────────────────────────────────
interface SchemaFieldProps {
  field: any;
  depth?: number;
  collectionName?: string;
}
const SchemaField: React.FC<SchemaFieldProps> = ({ field, depth = 0, collectionName }) => {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = (field.properties?.length ?? 0) > 0;
  const isId = field.name === '_id' || field.isPrimary || field.pk;
  const color = dnaColor(field.type);
  const label = typeLabel(field.type);

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', cursor: hasChildren ? 'pointer' : 'default',
          borderRadius: 4, fontSize: 12,
          background: 'transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (hasChildren) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-2)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
        onClick={() => hasChildren && setExpanded(v => !v)}
      >
        {/* Expand chevron */}
        <span style={{ width: 12, flexShrink: 0, display: 'inline-flex', alignItems: 'center', color: 'var(--fg-3)' }}>
          {hasChildren
            ? (expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />)
            : <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: 'var(--border)', margin: '0 4px' }} />
          }
        </span>

        {/* Key icon for _id */}
        {isId && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        )}

        {/* Field name */}
        <span style={{
          fontFamily: 'var(--font-mono, monospace)', fontSize: 12,
          color: isId ? '#f59e0b' : 'var(--fg)', fontWeight: isId ? 600 : 400, flex: 1,
        }}>
          {field.name}
        </span>

        {/* Type badge */}
        <span style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 3,
          background: `${color}18`,
          color: color,
          border: `1px solid ${color}30`,
          fontFamily: 'var(--font-mono, monospace)',
          fontWeight: 500, flexShrink: 0,
        }}>
          {label}
        </span>

        {/* Nullable dot */}
        {field.nullable !== 'NO' && !isId && (
          <span title="nullable" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--fg-3)', opacity: 0.4, flexShrink: 0 }} />
        )}
      </div>

      {/* Nested children */}
      {expanded && hasChildren && (
        <div style={{ borderLeft: '1px dashed var(--border)', marginLeft: 20, marginTop: 1, marginBottom: 1 }}>
          {field.properties.map((child: any) => (
            <SchemaField key={child.name} field={child} depth={depth + 1} collectionName={collectionName} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Schema drawer panel ─────────────────────────────────────────────────────
interface SchemaDrawerProps {
  col: any;
  onClose: () => void;
  onQuery: () => void;
}
const SchemaDrawer: React.FC<SchemaDrawerProps> = ({ col, onClose, onQuery }) => {
  const fields: any[] = col.columns ?? [];
  const refs = fields.filter((f: any) => f.name?.endsWith('_id') && f.name !== '_id');

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 380,
      background: 'var(--bg-1)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
      zIndex: 50,
      animation: 'slideInRight 0.18s ease',
    }}>
      {/* Drawer header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg-1)', flexShrink: 0,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--fg-2)', flexShrink: 0 }}>
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-mono, monospace)' }}>{col.name}</div>
          <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 1 }}>
            {fields.length} fields · {fmtCount(col.documentCount)} docs · {fmtSize(col.storageSize)}
          </div>
        </div>
        <button
          onClick={onQuery}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--fg-1)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
        >
          <Play size={10} />
          Query
        </button>
        <button onClick={onClose} style={{ padding: 4, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--fg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} />
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: 'DOCS', value: fmtCount(col.documentCount) },
          { label: 'SIZE', value: fmtSize(col.storageSize) },
          { label: 'AVG', value: fmtSize(col.avgObjSize) },
          { label: 'INDEXES', value: String(col.indexCount ?? 1) },
        ].map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: '8px 12px', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono, monospace)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Field DNA legend */}
      {fields.length > 0 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>FIELD DNA</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {fields.map((f: any) => (
              <div key={f.name} title={`${f.name}: ${typeLabel(f.type)}`} style={{ width: 14, height: 14, borderRadius: 3, background: dnaColor(f.type), opacity: 0.85, cursor: 'default' }} />
            ))}
          </div>
        </div>
      )}

      {/* Inferred references */}
      {refs.length > 0 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>INFERRED REFERENCES</div>
          {refs.map((r: any) => (
            <div key={r.name} style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono, monospace)', marginBottom: 3 }}>
              {col.name}.{r.name} → {r.name.replace(/_id$/, '')}
            </div>
          ))}
        </div>
      )}

      {/* Field section header */}
      <div style={{ padding: '8px 12px 4px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Fields ({fields.length})
        </span>
        <div style={{ display: 'flex', gap: 12, fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <span>Name</span>
          <span>Type</span>
        </div>
      </div>

      {/* Field list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {fields.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--fg-3)', fontSize: 12 }}>
            No schema information available.<br />
            <span style={{ fontSize: 11, opacity: 0.7 }}>Run a query to infer fields.</span>
          </div>
        ) : (
          fields.map((f: any) => (
            <SchemaField key={f.name} field={f} depth={0} collectionName={col.name} />
          ))
        )}
      </div>
    </div>
  );
};

// ── Collection card ────────────────────────────────────────────────────────
interface CollectionCardProps {
  col: any;
  schemaOpen: boolean;
  onQuery: () => void;
  onSchema: () => void;
}
const CollectionCard: React.FC<CollectionCardProps> = ({ col, schemaOpen, onQuery, onSchema }) => {
  const fields: any[] = col.columns ?? [];
  const dnaFields = fields.slice(0, 14);
  const refs = fields.filter((f: any) => f.name?.endsWith('_id') && f.name !== '_id');

  const badges: string[] = [];
  if (col.documentCount != null && col.documentCount > 10_000_000) badges.push('sharded');
  if (col.name?.startsWith('fs.')) badges.push('system');

  return (
    <div
      style={{
        background: 'var(--bg-1)',
        border: `1px solid ${schemaOpen ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: schemaOpen ? '0 0 0 2px rgba(16,185,129,0.15)' : 'none',
      }}
      onMouseEnter={e => { if (!schemaOpen) { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; } }}
      onMouseLeave={e => { if (!schemaOpen) { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; } }}
    >
      {/* Card header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--fg-2)', flexShrink: 0 }}>
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name}</span>
          {badges.map(b => (
            <span key={b} style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border)', color: 'var(--fg-3)', background: 'var(--bg-2)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{b}</span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 0', borderBottom: '1px solid var(--border)' }}>
        {[
          { label: 'DOCS', value: fmtCount(col.documentCount) },
          { label: 'SIZE', value: fmtSize(col.storageSize) },
          { label: 'INDEXES', value: String(col.indexCount ?? fields.filter((f: any) => f.isPrimary || f.pk).length + 1) },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono, monospace)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* AVG + REFS OUT */}
      <div style={{ padding: '8px 14px', display: 'flex', gap: 24, borderBottom: '1px solid var(--border)' }}>
        {[{ label: 'AVG', value: fmtSize(col.avgObjSize) }, { label: 'REFS OUT', value: String(refs.length) }].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 1 }}>{s.label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-mono, monospace)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Field DNA */}
      {dnaFields.length > 0 && (
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>FIELD DNA</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {dnaFields.map((f: any) => (
              <div key={f.name} title={`${f.name}: ${typeLabel(f.type)}`} style={{ width: 14, height: 14, borderRadius: 3, background: dnaColor(f.type), opacity: 0.85, cursor: 'default' }} />
            ))}
            {fields.length > 14 && (
              <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'var(--fg-3)', cursor: 'default' }}>+{fields.length - 14}</div>
            )}
          </div>
        </div>
      )}

      {/* Inferred references */}
      {refs.length > 0 && (
        <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>INFERRED REFERENCES</div>
          {refs.slice(0, 2).map((r: any) => (
            <div key={r.name} style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono, monospace)', marginBottom: 2 }}>
              {col.name}.{r.name} → {r.name.replace(/_id$/, '')}
            </div>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', padding: '6px 8px', gap: 4 }}>
        <button onClick={onQuery} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--fg-1)', fontSize: 11, fontWeight: 500, cursor: 'pointer', flex: 1, justifyContent: 'center', transition: 'background 0.12s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-2)')}>
          <Play size={10} style={{ flexShrink: 0 }} />Query
        </button>
        <button onClick={onSchema} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 4, border: `1px solid ${schemaOpen ? 'var(--accent)' : 'var(--border)'}`, background: schemaOpen ? 'rgba(16,185,129,0.1)' : 'var(--bg-2)', color: schemaOpen ? 'var(--accent)' : 'var(--fg-1)', fontSize: 11, fontWeight: 500, cursor: 'pointer', flex: 1, justifyContent: 'center', transition: 'background 0.12s' }} onMouseEnter={e => { if (!schemaOpen) e.currentTarget.style.background = 'var(--bg-3)'; }} onMouseLeave={e => { if (!schemaOpen) e.currentTarget.style.background = 'var(--bg-2)'; }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>
          Schema
        </button>
      </div>
    </div>
  );
};

// ── Main view ──────────────────────────────────────────────────────────────
const DocDbConnectionsView: React.FC<DocDbConnectionsViewProps> = ({
  connections, selectedConnectionId, selectedDatabase,
  onSelectConnection, onConnectionsChange,
  onSelectCollection, onSwitchToQuery,
}) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [schemaCollection, setSchemaCollection] = useState<any | null>(null); // which collection schema to show

  const safeConnections = Array.isArray(connections) ? connections : [];
  const selConn = safeConnections.find(c => c.id === selectedConnectionId);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCollections = useCallback(() => {
    if (!selectedConnectionId || isCreatingNew) return;
    setLoading(true);
    setConnectionStatus('connecting');
    setSchemaCollection(null);
    ipc.invoke('get-database-tables', { configId: selectedConnectionId, database: selectedDatabase })
      .then(result => {
        if (result && !result.error) { setCollections(Array.isArray(result) ? result : []); setConnectionStatus('connected'); }
        else { setCollections([]); setConnectionStatus('error'); }
      })
      .catch(() => { setCollections([]); setConnectionStatus('error'); })
      .finally(() => setLoading(false));
  }, [selectedConnectionId, selectedDatabase, isCreatingNew]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const handleReconnect = async () => {
    if (!selConn) return;
    setConnectionStatus('connecting');
    try {
      const result = await ipc.invoke('test-connection', selConn);
      if (result?.success) { setConnectionStatus('connected'); showToast('success', result.message || 'Connected'); fetchCollections(); }
      else { setConnectionStatus('error'); showToast('error', result?.message || 'Connection failed'); }
    } catch (err: any) { setConnectionStatus('error'); showToast('error', err?.message || 'Connection failed'); }
  };

  const handleDelete = async (e: React.MouseEvent, connId: number) => {
    e.stopPropagation();
    if (confirmDeleteId !== connId) { setConfirmDeleteId(connId); return; }
    setDeletingId(connId);
    try {
      await ipc.invoke('delete-connection', { id: connId });
      if (selectedConnectionId === connId) onSelectConnection(null);
      if (onConnectionsChange) onConnectionsChange();
    } catch { } finally { setDeletingId(null); setConfirmDeleteId(null); }
  };

  const filteredCollections = collections.filter(c =>
    c.name?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleSchemaClick = (col: any) => {
    setSchemaCollection((prev: any) => prev?.name === col.name ? null : col);
  };

  return (
    <React.Fragment>
      {/* Inject slide-in animation */}
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      {/* ── Left sidebar ── */}
      <aside style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--bg-1)' }}>
        <div className="sec-head">
          <Database size={11} className="i" style={{ strokeWidth: 1.6 }} />
          <span>Connections</span>
          <span className="tree-count">{safeConnections.length}</span>
          <span className="grow" />
          <button className="btn btn-icon btn-ghost" title="New connection" style={{ height: 22, width: 22 }} onClick={() => setIsCreatingNew(true)}>
            <Plus size={12} className="i" />
          </button>
        </div>
        <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
          <div className="row gap-2" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', height: 26 }}>
            <Search size={12} className="i" style={{ color: 'var(--fg-3)' }} />
            <input placeholder="Search connections…" style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--fg)', fontSize: 12, flex: 1, fontFamily: 'inherit' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {safeConnections.map(conn => {
            const isSelected = selectedConnectionId === conn.id;
            const chip = connChip(conn);
            return (
              <div key={conn.id} className={`conn-card ${isSelected && !isCreatingNew ? 'active' : ''}`} style={{ position: 'relative' }} onClick={() => { setConfirmDeleteId(null); setIsCreatingNew(false); onSelectConnection(conn.id); }}>
                {confirmDeleteId === conn.id && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#ef4444', fontWeight: 600 }}><AlertTriangle size={12} />Delete?</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(239,68,68,0.5)', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 600 }} disabled={deletingId === conn.id} onClick={e => handleDelete(e, conn.id)}>{deletingId === conn.id ? '…' : 'Delete'}</button>
                      <button style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--fg)', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}>Cancel</button>
                    </div>
                  </div>
                )}
                <span style={{ width: 28, height: 28, borderRadius: 6, background: chip.bg, color: chip.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, letterSpacing: '-0.02em', flexShrink: 0 }}>{chip.label}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? 'var(--accent-fg)' : 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.name}</div>
                  <div className="muted mono" style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.host}</div>
                </div>
                <button className="conn-delete-btn" title="Delete" onClick={e => handleDelete(e, conn.id)} style={{ padding: 3, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                {isSelected && connectionStatus === 'connected' && <span className="dot" style={{ background: 'var(--accent)' }} />}
                {isSelected && connectionStatus === 'connecting' && <RefreshCw size={10} className="spin" style={{ color: 'var(--accent)' }} />}
                {isSelected && connectionStatus === 'error' && <span className="dot" style={{ background: '#ef4444' }} />}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Right panel ── */}
      <div className="col" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        {/* Toast */}
        {toast && (
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 999, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 8, background: toast.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', minWidth: 220 }}>
            {toast.type === 'success' ? <CheckCircle2 size={16} style={{ color: 'rgb(16,185,129)', flexShrink: 0 }} /> : <XCircle size={16} style={{ color: 'rgb(239,68,68)', flexShrink: 0 }} />}
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>{toast.message}</span>
          </div>
        )}

        {isCreatingNew ? (
          <AddConnectionForm onCancel={() => setIsCreatingNew(false)} onSuccess={(newId) => { setIsCreatingNew(false); if (onConnectionsChange) onConnectionsChange(); if (newId && typeof newId === 'number') onSelectConnection(newId); }} />
        ) : isEditing && selConn ? (
          <AddConnectionForm initialValues={selConn} onCancel={() => setIsEditing(false)} onSuccess={() => { setIsEditing(false); if (onConnectionsChange) onConnectionsChange(); showToast('success', 'Connection updated successfully'); }} />
        ) : selConn ? (
          <React.Fragment>
            {/* Connection header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
              {(() => { const chip = connChip(selConn); return (<span style={{ width: 48, height: 48, borderRadius: 8, background: chip.bg, color: chip.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"JetBrains Mono", monospace', fontSize: 16, fontWeight: 700 }}>{chip.label}</span>); })()}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{selConn.name}</h2>
                  <span className={`chip ${connectionStatus === 'connected' ? 'chip-accent' : ''}`} style={connectionStatus === 'error' ? { color: '#ef4444', borderColor: '#ef4444', background: 'rgba(239,68,68,0.1)' } : {}}>
                    {connectionStatus === 'connecting' ? <RefreshCw size={10} className="spin" style={{ marginRight: 4 }} /> : <span className="dot" style={{ background: connectionStatus === 'connected' ? 'var(--accent)' : '#ef4444' }} />}
                    {connectionStatus === 'connecting' ? 'connecting…' : connectionStatus}
                  </span>
                  <span className="chip" style={{ textTransform: 'capitalize' }}>{selConn.type || 'mongo'}</span>
                </div>
                <div className="muted mono" style={{ fontSize: 11, marginTop: 4 }}>
                  {selConn.host}{selConn.port ? `:${selConn.port}` : ''} · user: {selConn.username || selConn.user || 'root'}
                  {selectedDatabase && <> · db: <span style={{ color: 'var(--accent)' }}>{selectedDatabase}</span></>}
                </div>
              </div>
              <span className="grow" />
              <div className="row gap-3">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Collections</span>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{loading ? '—' : collections.length}</span>
                </div>
              </div>
              <span className="vdiv" style={{ height: 28 }} />
              <button className="btn" onClick={() => setIsEditing(true)}><Settings size={12} className="i" style={{ strokeWidth: 1.6 }} /><span>Settings</span></button>
              <button className="btn" onClick={handleReconnect} disabled={connectionStatus === 'connecting'}><RefreshCw size={12} className={`i ${connectionStatus === 'connecting' ? 'spin' : ''}`} style={{ strokeWidth: 1.6 }} /><span>Reconnect</span></button>
            </div>

            {/* Tab bar */}
            <div className="tabs" style={{ flexShrink: 0 }}>
              <div className="tab active">
                <LayoutGrid size={12} className="i" style={{ strokeWidth: 1.6 }} />
                <span>Collections ({loading ? '—' : filteredCollections.length})</span>
              </div>
              <div className="grow" />
              {schemaCollection && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>
                  Schema: {schemaCollection.name}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', paddingRight: 8 }}>
                <div className="row gap-2" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', height: 24 }}>
                  <Search size={11} className="i" style={{ color: 'var(--fg-3)' }} />
                  <input placeholder="Filter collections…" value={searchFilter} onChange={e => setSearchFilter(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--fg)', fontSize: 11, width: 140, fontFamily: 'inherit' }} />
                </div>
              </div>
            </div>

            {/* Collections grid + schema drawer */}
            <div style={{ flex: 1, overflow: 'auto', padding: 20, position: 'relative' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--fg-3)', fontSize: 13, gap: 10 }}>
                  <RefreshCw size={16} className="spin" />Loading collections…
                </div>
              ) : filteredCollections.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--fg-3)', gap: 8 }}>
                  <Database size={32} style={{ opacity: 0.3 }} />
                  <span style={{ fontSize: 14 }}>{searchFilter ? 'No collections match your filter' : 'No collections found'}</span>
                  {selectedDatabase && <span style={{ fontSize: 12, opacity: 0.7 }}>Database: {selectedDatabase}</span>}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: schemaCollection ? 'repeat(auto-fill, minmax(220px, 1fr))' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, marginRight: schemaCollection ? 390 : 0, transition: 'margin-right 0.2s ease' }}>
                  {filteredCollections.map(col => (
                    <CollectionCard
                      key={col.name}
                      col={col}
                      schemaOpen={schemaCollection?.name === col.name}
                      onQuery={() => {
                        if (onSelectCollection) onSelectCollection(col.name);
                        if (onSwitchToQuery) onSwitchToQuery();
                      }}
                      onSchema={() => handleSchemaClick(col)}
                    />
                  ))}
                </div>
              )}

              {/* Schema drawer slides over the right side */}
              {schemaCollection && (
                <SchemaDrawer
                  col={schemaCollection}
                  onClose={() => setSchemaCollection(null)}
                  onQuery={() => {
                    if (onSelectCollection) onSelectCollection(schemaCollection.name);
                    if (onSwitchToQuery) onSwitchToQuery();
                  }}
                />
              )}
            </div>
          </React.Fragment>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)', flexDirection: 'column', gap: 12 }}>
            <Database size={40} style={{ opacity: 0.2 }} />
            <span style={{ fontSize: 14 }}>Select a connection to get started</span>
            <button className="btn" onClick={() => setIsCreatingNew(true)}><Plus size={12} className="i" /><span>New Connection</span></button>
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

export default DocDbConnectionsView;
