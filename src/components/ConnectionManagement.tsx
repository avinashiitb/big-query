import React from 'react';
import { Database, Plus, Search, Settings, RefreshCw, Network, TableProperties, Key, ChevronDown, ChevronRight, Trash2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import './ConnectionManagement.css';
import { ErDiagram } from './ErDiagram';
import { AddConnectionForm } from './AddConnectionForm';
import { ipc } from '../ipc';

interface ConnectionManagementProps {
  connections: any[];
  selectedConnectionId: number | null;
  selectedDatabase?: string | null;
  onSelectDatabase?: (db: string | null) => void;
  onSelectConnection: (id: number | null) => void;
  onConnectionsChange?: () => void;
}

const ConnectionManagement: React.FC<ConnectionManagementProps> = ({ 
  connections,
  selectedConnectionId, 
  selectedDatabase,
  onSelectDatabase,
  onSelectConnection,
  onConnectionsChange
}) => {
  const [isCreatingNew, setIsCreatingNew] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('er');
  const [expandedTable, setExpandedTable] = React.useState<string | null>(null);
  const [tables, setTables] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [connectionStatus, setConnectionStatus] = React.useState<'idle'|'connecting'|'connected'|'error'>('idle');
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<number | null>(null);
  const [toast, setToast] = React.useState<{ type: 'success'|'error'; message: string } | null>(null);
  const [databases, setDatabases] = React.useState<string[]>([]);
  const safeConnections = Array.isArray(connections) ? connections : [];

  const showToast = (type: 'success'|'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDelete = async (e: React.MouseEvent, connId: number) => {
    e.stopPropagation();
    if (confirmDeleteId !== connId) {
      setConfirmDeleteId(connId);
      return;
    }
    setDeletingId(connId);
    try {
      await ipc.invoke('delete-connection', { id: connId });
      if (selectedConnectionId === connId) onSelectConnection(null);
      if (onConnectionsChange) onConnectionsChange();
    } catch (err) {
      console.error('Failed to delete connection:', err);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleReconnect = React.useCallback(async () => {
    if (!selectedConnectionId) return;
    const selConn = safeConnections.find(c => c.id === selectedConnectionId);
    if (!selConn) return;
    setConnectionStatus('connecting');
    try {
      const result = await ipc.invoke('test-connection', selConn);
      if (result?.success) {
        setConnectionStatus('connected');
        showToast('success', result.message || 'Connected successfully');
        fetchTables();
      } else {
        setConnectionStatus('error');
        showToast('error', result?.message || 'Connection failed');
      }
    } catch (err: any) {
      setConnectionStatus('error');
      showToast('error', err?.message || 'Connection failed');
    }
  }, [selectedConnectionId, safeConnections]);

  const fetchTables = React.useCallback(() => {
    if (selectedConnectionId && !isCreatingNew) {
      setLoading(true);
      setConnectionStatus('connecting');
      ipc.invoke('get-database-tables', { configId: selectedConnectionId, database: selectedDatabase })
        .then(result => {
          if (result && !result.error) {
            setTables(Array.isArray(result) ? result : []);
            setConnectionStatus('connected');
          } else {
            setTables([]);
            setConnectionStatus('error');
          }
        })
        .catch(err => {
          console.error(err);
          setTables([]);
          setConnectionStatus('error');
        })
        .finally(() => setLoading(false));
    }
  }, [selectedConnectionId, selectedDatabase, isCreatingNew]);

  React.useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  React.useEffect(() => {
    if (selectedConnectionId) {
      ipc.invoke('get-databases', { configId: selectedConnectionId })
        .then(dbs => {
          setDatabases(Array.isArray(dbs) ? dbs : []);
        })
        .catch(err => {
          console.error(err);
          setDatabases([]);
        });
    } else {
      setDatabases([]);
    }
  }, [selectedConnectionId]);

  const filteredConnections = safeConnections.filter(conn => 
    !conn.type || conn.type === 'bigquery' || conn.type === 'redash' || conn.name.toLowerCase().includes('bigquery') || conn.name.toLowerCase().includes('redash')
  );

  return (
    <React.Fragment>
      <aside className="sidebar" style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--bg-1)' }}>
        <div className="sec-head">
          <Database size={16} className="i" style={{ width: 11, height: 11, strokeWidth: 1.6 }} />
          <span>BigQuery Connections</span>
          <span className="tree-count">{safeConnections.length}</span>
          <span className="grow"></span>
          <button 
            className="btn btn-icon btn-ghost" 
            title="New connection" 
            style={{ height: 22, width: 22 }}
            onClick={() => setIsCreatingNew(true)}
          >
            <Plus size={12} className="i" />
          </button>
        </div>
        
        <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
          <div className="row gap-2" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', height: 26 }}>
            <Search size={12} className="i" style={{ color: 'var(--fg-3)' }} />
            <input 
              placeholder="Search connections…" 
              style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--fg)', fontSize: 12, flex: 1, fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {filteredConnections.map(conn => {
            const isSelected = selectedConnectionId === conn.id;
            let bg = 'rgba(66, 133, 244, 0.14)';
            let color = 'rgb(66, 133, 244)';
            let initial = 'BQ';

            return (
              <div 
                key={conn.id} 
                className={`conn-card ${isSelected && !isCreatingNew ? 'active' : ''}`}
                style={{ position: 'relative' }}
                onClick={() => {
                  setConfirmDeleteId(null);
                  setIsCreatingNew(false);
                  onSelectConnection(conn.id);
                }}
              >
                {/* Confirm-delete inline overlay */}
                {confirmDeleteId === conn.id && (
                  <div
                    style={{
                      position: 'absolute', inset: 0, zIndex: 10,
                      background: 'rgba(239,68,68,0.10)',
                      border: '1px solid rgba(239,68,68,0.4)',
                      borderRadius: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0 10px', gap: 6,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                      <AlertTriangle size={12} />
                      Delete connection?
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(239,68,68,0.5)', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                        disabled={deletingId === conn.id}
                        onClick={e => handleDelete(e, conn.id)}
                      >
                        {deletingId === conn.id ? '…' : 'Delete'}
                      </button>
                      <button
                        style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--fg)', cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <span 
                  style={{ 
                    width: 28, height: 28, borderRadius: 6, 
                    background: bg, color: color, 
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                    fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, letterSpacing: '-0.02em' 
                  }}
                >
                  {initial}
                </span>
                
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? 'var(--accent-fg)' : 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conn.name}
                  </div>
                  <div className="muted mono" style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conn.host || conn.projectId || 'BigQuery'}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  className="conn-delete-btn"
                  title="Delete connection"
                  onClick={e => handleDelete(e, conn.id)}
                  style={{
                    padding: '3px', borderRadius: 4, border: 'none',
                    background: 'transparent', cursor: 'pointer',
                    color: 'var(--fg-3)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Trash2 size={12} />
                </button>
                
                {isSelected && connectionStatus === 'connected' && <span className="dot" title="connected" style={{ background: 'var(--accent)' }}></span>}
                {isSelected && connectionStatus === 'connecting' && <RefreshCw size={10} className="spin" style={{ color: 'var(--accent)' }} />}
                {isSelected && connectionStatus === 'error' && <span className="dot" title="error" style={{ background: 'var(--warn, #ef4444)' }}></span>}
                {!isSelected && conn.id % 2 === 0 && <span className="dot amber" title="idle"></span>}
              </div>
            );
          })}
        </div>
      </aside>

      <div className="col" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>

        {/* Toast notification */}
        {toast && (
          <div style={{
            position: 'absolute', top: 16, right: 16, zIndex: 999,
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 8,
            background: toast.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            animation: 'fadeSlideIn 0.18s ease',
            minWidth: 220, maxWidth: 360,
          }}>
            {toast.type === 'success'
              ? <CheckCircle2 size={16} style={{ color: 'rgb(16,185,129)', flexShrink: 0 }} />
              : <XCircle size={16} style={{ color: 'rgb(239,68,68)', flexShrink: 0 }} />}
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', flex: 1 }}>{toast.message}</span>
          </div>
        )}

        {isCreatingNew ? (
          <AddConnectionForm
            onCancel={() => setIsCreatingNew(false)}
            onSuccess={(newId) => {
              setIsCreatingNew(false);
              if (onConnectionsChange) onConnectionsChange();
              if (newId && typeof newId === 'number') onSelectConnection(newId);
            }}
          />
        ) : isEditing && selectedConnectionId ? (() => {
          const editConn = safeConnections.find(c => c.id === selectedConnectionId);
          return (
            <AddConnectionForm
              initialValues={editConn}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => {
                setIsEditing(false);
                if (onConnectionsChange) onConnectionsChange();
                showToast('success', 'Connection updated successfully');
              }}
            />
          );
        })() : selectedConnectionId ? (() => {
          const selConn = safeConnections.find(c => c.id === selectedConnectionId);
          if (!selConn) return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)' }}>
              Select a connection
            </div>
          );
          return (
            <React.Fragment>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ 
                  width: 48, height: 48, borderRadius: 6, 
                  background: 'rgba(66, 133, 244, 0.14)', color: 'rgb(66, 133, 244)', 
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' 
                }}>
                  BQ
                </span>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                     <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{selConn.name}</h2>
                     <span className={`chip ${connectionStatus === 'connected' ? 'chip-accent' : ''}`} style={connectionStatus === 'error' ? { color: '#ef4444', borderColor: '#ef4444', background: 'rgba(239,68,68,0.1)' } : {}}>
                      {connectionStatus === 'connecting' ? (
                        <RefreshCw size={10} className="spin" style={{ marginRight: 4 }} />
                      ) : (
                        <span className="dot" style={{ background: connectionStatus === 'connected' ? 'var(--accent)' : '#ef4444' }}></span>
                      )}
                      {connectionStatus === 'connecting' ? 'connecting...' : connectionStatus}
                    </span>
                    <span className="chip" style={{ textTransform: 'capitalize' }}>BigQuery</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <div className="muted mono" style={{ fontSize: 11 }}>
                      {selConn.host || selConn.projectId || 'GCP BigQuery'}
                    </div>
                    {databases.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                        <span style={{ color: 'var(--fg-3)' }}>· dataset:</span>
                        <select
                          value={selectedDatabase || ''}
                          onChange={(e) => onSelectDatabase && onSelectDatabase(e.target.value || null)}
                          style={{
                            background: 'var(--bg-2)',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            color: 'var(--fg)',
                            fontSize: 11,
                            padding: '1px 6px',
                            outline: 'none',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono, monospace)'
                          }}
                        >
                          <option value="">Select dataset...</option>
                          {databases.map(db => (
                            <option key={db} value={db}>
                              {db.includes('||') ? db.split('||')[0] : db}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grow"></div>
                
                <div className="row gap-3">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tables/Views</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{loading ? '-' : tables.length}</span>
                  </div>
                </div>
                
                <span className="vdiv" style={{ height: 28 }}></span>
                
                <button className="btn" onClick={() => setIsEditing(true)}>
                  <Settings size={12} className="i" style={{ strokeWidth: 1.6 }} />
                  <span>Settings</span>
                </button>
                <button className={`btn`} onClick={handleReconnect} disabled={connectionStatus === 'connecting'}>
                  <RefreshCw size={12} className={`i ${connectionStatus === 'connecting' ? 'spin' : ''}`} style={{ strokeWidth: 1.6 }} />
                  <span>Reconnect</span>
                </button>
              </div>

              <div className="tabs">
                <div className={`tab ${activeTab === 'er' ? 'active' : ''}`} onClick={() => setActiveTab('er')}>
                  <Network size={12} className="i" style={{ strokeWidth: 1.6 }} />
                  <span>ER Diagram</span>
                </div>
                <div className={`tab ${activeTab === 'tables' ? 'active' : ''}`} onClick={() => setActiveTab('tables')}>
                  <TableProperties size={12} className="i" style={{ strokeWidth: 1.6 }} />
                  <span>Tables ({loading ? '-' : tables.filter((t: any) => t.type === 'table' || !t.type).length})</span>
                </div>

                <div className="grow"></div>
                <div className="row gap-2" style={{ paddingRight: 4 }}>
                  <span className="muted" style={{ fontSize: 11 }}>Auto-layout</span>
                  <button className="btn btn-ghost">
                    <RefreshCw size={11} className="i" style={{ strokeWidth: 1.6 }} />
                  </button>
                </div>
              </div>

              {activeTab === 'er' && <ErDiagram tables={tables} />}
              {activeTab === 'tables' && (
                <div style={{ flex: 1, padding: 24, overflow: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {tables.filter((t: any) => t.type === 'table' || !t.type).map((t: any) => {
                    const isExpanded = expandedTable === t.name;
                    return (
                      <div key={t.name} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                        <div 
                          onClick={() => setExpandedTable(isExpanded ? null : t.name)}
                          style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 12 }}
                        >
                          {isExpanded ? <ChevronDown size={14} className="muted" /> : <ChevronRight size={14} className="muted" />}
                          <TableProperties size={16} className="i" style={{ color: 'var(--accent)' }} />
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)', flex: 1 }}>{t.name}</div>
                          <div className="muted mono" style={{ fontSize: 11 }}>{t.columns ? `${t.columns.length} columns` : '0 columns'}</div>
                        </div>
                        
                        {isExpanded && t.columns && (
                          <div style={{ borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: 16, background: 'var(--bg)', overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '8px 12px', color: 'var(--fg-3)', fontWeight: 500 }}>Name</th>
                                    <th style={{ padding: '8px 12px', color: 'var(--fg-3)', fontWeight: 500 }}>Type</th>
                                    <th style={{ padding: '8px 12px', color: 'var(--fg-3)', fontWeight: 500 }}>Mode</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {t.columns.map((c: any) => (
                                    <tr key={c.name} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '8px 12px', color: 'var(--fg)', fontWeight: 500 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          {(c.isPrimary || c.pk) && <Key size={12} style={{ color: 'var(--warn)' }} />}
                                          {c.name}
                                        </div>
                                      </td>
                                      <td className="mono" style={{ padding: '8px 12px', color: 'var(--accent)' }}>{c.type}</td>
                                      <td className="mono" style={{ padding: '8px 12px', color: 'var(--fg-3)' }}>
                                        {c.mode || 'NULLABLE'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            <div style={{ background: '#1e1e1e', padding: 16, borderTop: '1px solid var(--border)' }}>
                              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888', marginBottom: 8 }}>BigQuery SQL DDL</div>
                              <pre className="mono" style={{ margin: 0, color: '#d4d4d4', fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
{`CREATE TABLE \`${selectedDatabase ? selectedDatabase + '.' : ''}${t.name}\` (
${t.columns.map((c: any) => `  \`${c.name}\` ${c.type}${c.mode === 'REQUIRED' ? ' NOT NULL' : ''}`).join(',\n')}
);`}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          );
        })() : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)' }}>
            Select a connection
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

export default ConnectionManagement;
