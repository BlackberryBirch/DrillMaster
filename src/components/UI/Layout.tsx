import { useState } from 'react';
import Filmstrip from '../Filmstrip/Filmstrip';
import Editor from '../Editor/Editor';
import Toolbar from './Toolbar';
import AnimationControls from '../Animation/AnimationControls';
import PropertiesPanel from './PropertiesPanel';

export default function Layout() {
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Top Toolbar */}
      <Toolbar 
        onTogglePropertiesPanel={() => setShowPropertiesPanel(!showPropertiesPanel)}
        showPropertiesPanel={showPropertiesPanel}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor (takes most space) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Editor />
        </div>

        {/* Properties Panel (right sidebar) */}
        {showPropertiesPanel && (
          <div className="w-64 flex-shrink-0 border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
            <PropertiesPanel />
          </div>
        )}
      </div>

      {/* Filmstrip (bottom) */}
      <div className="flex-shrink-0 border-t border-gray-300 dark:border-gray-700">
        <Filmstrip />
      </div>

      {/* Animation Controls (bottom) */}
      <div className="flex-shrink-0 border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
        <AnimationControls />
      </div>
    </div>
  );
}

