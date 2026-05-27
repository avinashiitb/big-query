import React, { useState } from 'react';
import { Save, Activity, CheckCircle2, XCircle, Database } from 'lucide-react';
import { ipc } from '../ipc';

interface AddConnectionFormProps {
  onCancel: () => void;
  onSuccess?: (newId?: number) => void;
  initialValues?: any;  // pre-fill for editing
}

export const AddConnectionForm: React.FC<AddConnectionFormProps> = ({ onCancel, onSuccess, initialValues }) => {
  const [dbType] = useState('redash');
  const [name, setName] = useState(initialValues?.name || '');
  const [host, setHost] = useState(initialValues?.host || '');
  const [database, setDatabase] = useState(initialValues?.database || '');
  const [password, setPassword] = useState(initialValues?.password || '');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    details?: Record<string, string>;
  } | null>(null);

  const getFormData = () => ({
    ...(initialValues?.id ? { id: initialValues.id } : {}),
    name,
    type: dbType,
    host,
    port: '',
    database,
    username: '',
    password
  });

  const notify = (msg: string, type: string = 'info') => {
    const api = (window as any).pluginAPI;
    if (api?.notify) {
      api.notify(msg, type);
    } else {
      alert(msg);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const data = getFormData();
      const result = await ipc.invoke('test-connection', data);
      if (result?.success) {
        setTestResult({
          show: true, success: true,
          message: result.message || `Successfully connected to Redash`,
          details: {
            'Host / URL': host || '(not set)',
            ...(database ? { 'Data Source ID': database } : {}),
            'Type': 'Redash'
          }
        });
      } else {
        setTestResult({
          show: true, success: false,
          message: result?.message || 'Connection failed. Check your credentials.',
          details: {
            'Host / URL': host || '(not set)',
            'Type': 'Redash'
          }
        });
      }
    } catch (e: any) {
      setTestResult({
        show: true, success: false,
        message: e.message || 'Error testing connection',
        details: {
          'Host / URL': host || '(not set)',
          'Type': 'Redash'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name) return notify('Please enter a connection name', 'error');
    if (!host) return notify('Please enter the Redash Host/URL', 'error');
    if (!password) return notify('Please enter your API Key', 'error');
    setLoading(true);
    try {
      const data = getFormData();
      const result = await ipc.invoke('save-connection', data);
      if (result) {
        notify('Connection saved successfully', 'success');
        if (onSuccess) onSuccess(result.id || (typeof result === 'number' ? result : undefined));
        else onCancel();
      }
    } catch (e: any) {
      notify(e.message || 'Error saving connection', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'auto', position: 'relative' }}>

      {/* ── Test Connection Result Modal ─────────────────────────────── */}
      {testResult?.show && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
        }}
          onClick={() => setTestResult(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 340, borderRadius: 12,
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
              overflow: 'hidden',
              animation: 'fadeSlideIn 0.18s ease',
            }}
          >
            {/* Header strip */}
            <div style={{
              padding: '20px 20px 16px',
              borderBottom: '1px solid var(--border)',
              background: testResult.success ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              {/* Icon */}
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: testResult.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${testResult.success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}>
                {testResult.success
                  ? <CheckCircle2 size={26} style={{ color: 'rgb(16,185,129)' }} />
                  : <XCircle size={26} style={{ color: 'rgb(239,68,68)' }} />}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', lineHeight: 1.3 }}>
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                  <Database size={11} />
                  Redash · {host || 'localhost'}
                </div>
              </div>
            </div>

            {/* Details */}
            <div style={{ padding: '14px 20px' }}>
              <div style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 8, padding: '12px 14px',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Connection Info
                </div>
                {testResult.details && Object.entries(testResult.details).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid var(--border)', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 500, flexShrink: 0 }}>{k}</span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 600, overflow: 'auto', maxWidth: 200, whiteSpace: 'nowrap' }}>{v}</span>
                  </div>
                ))}
              </div>
              {/* Message */}
              <div style={{
                padding: '10px 12px', borderRadius: 6,
                background: testResult.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${testResult.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                fontSize: 12, color: testResult.success ? 'rgb(16,185,129)' : 'rgb(239,68,68)',
                lineHeight: 1.5,
              }}>
                {testResult.message}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '0 20px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                className="btn"
                onClick={() => setTestResult(null)}
                style={{
                  padding: '7px 28px',
                  background: testResult.success ? 'var(--accent)' : 'var(--bg-2)',
                  color: testResult.success ? 'var(--accent-fg)' : 'var(--fg)',
                  border: testResult.success ? 'none' : '1px solid var(--border)',
                  fontWeight: 600,
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ──────────────────────────────────────────────────────────────── */}

      <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--fg)' }}>
          {initialValues ? 'Edit Redash Connection' : 'New Redash Connection'}
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--fg-3)' }}>Configure a Redash connection to start querying.</p>
      </div>

      <div style={{ padding: '32px', maxWidth: 600 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', marginBottom: 6 }}>Connection Name</label>
            <input 
              type="text" 
              placeholder="e.g. Production Redash"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 13, outline: 'none' }} 
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', marginBottom: 6 }}>
              Host / URL
            </label>
            <input
              type="text"
              placeholder="https://redash.company.com"
              value={host}
              onChange={e => setHost(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 13, outline: 'none' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', marginBottom: 4 }}>
              Data Source ID
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: 'var(--fg-3)', fontStyle: 'italic' }}>(optional — leave blank to browse all data sources)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 1 (optional — leave blank to browse all)"
              value={database}
              onChange={e => setDatabase(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 13, outline: 'none' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', marginBottom: 6 }}>
              Password (User API Key)
            </label>
            <input
              type="password"
              placeholder="Your API Key"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)', fontSize: 13, outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn"
            onClick={handleSave}
            disabled={loading}
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', padding: '8px 16px', opacity: loading ? 0.7 : 1 }}
          >
            <Save size={14} style={{ marginRight: 6 }} />
            {loading ? 'Saving...' : 'Save Connection'}
          </button>
          <button
            className="btn"
            onClick={handleTest}
            disabled={loading}
            style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', opacity: loading ? 0.7 : 1 }}
          >
            <Activity size={14} style={{ marginRight: 6 }} />
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
          <div className="grow"></div>
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
