import React from 'react';
import { Database, FolderTree, Settings, Sun, Moon, Columns, Rows } from 'lucide-react';
import './DbStrip.css';

interface DbStripProps {
  activeSidebar: 'schema' | 'connections' | null;
  setActiveSidebar: (val: 'schema' | 'connections' | null) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  layout: 'top-bottom' | 'side-by-side';
  onToggleLayout: () => void;
}

const DbStrip: React.FC<DbStripProps> = ({ activeSidebar, setActiveSidebar, theme, onToggleTheme, layout, onToggleLayout }) => {
  const toggle = (val: 'schema' | 'connections') => {
    setActiveSidebar(activeSidebar === val ? null : val);
  };

  return (
    <div className="db-strip">
      <button 
        className={`strip-btn ${activeSidebar === 'schema' ? 'active' : ''}`}
        onClick={() => toggle('schema')}
        data-tooltip="Schema Explorer"
      >
        <FolderTree size={20} />
      </button>
      
      <button 
        className={`strip-btn ${activeSidebar === 'connections' ? 'active' : ''}`}
        onClick={() => toggle('connections')}
        data-tooltip="Connections"
      >
        <Database size={20} />
      </button>

      <div className="strip-spacer"></div>

      <button 
        className="strip-btn" 
        data-tooltip={`Switch to ${layout === 'top-bottom' ? 'side-by-side' : 'top-bottom'} view`}
        onClick={onToggleLayout}
      >
        {layout === 'top-bottom' ? <Columns size={20} /> : <Rows size={20} />}
      </button>

      <button 
        className="strip-btn" 
        data-tooltip={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        onClick={onToggleTheme}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <button className="strip-btn" data-tooltip="Settings">
        <Settings size={20} />
      </button>
    </div>
  );
};

export default DbStrip;
