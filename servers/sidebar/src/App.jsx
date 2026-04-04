import { useState } from 'react';
import { DeployPage } from '@/pages/DeployPage/DeployPage.jsx';
import { InteractPage } from '@/pages/InteractPage/InteractPage.jsx';
import { GetStartedPage } from '@/pages/GetStartedPage/GetStartedPage.jsx';
import { useApp } from '@/App.logic.js';

export const App = () => {
  const logic = useApp();
  const [activeTab, setActiveTab] = useState('tab-interact');

  const tabs = [
    { id: 'tab-interact', label: 'Interact', component: <InteractPage vscode={logic.vscode} resourceManager={logic.resourceManager} /> },
    { id: 'tab-deploy', label: 'Deploy', component: <DeployPage vscode={logic.vscode} resourceManager={logic.resourceManager} /> },
  ];

  return (
    <div className="min-h-screen bg-background text-zinc-100 flex flex-col font-sans">
      <GetStartedPage vscode={logic.vscode} />
      <div className="flex border-b border-zinc-800/60 bg-surface/50 backdrop-blur-md px-4 pt-4 shrink-0 shadow-sm sticky top-0 z-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-all duration-200 relative outline-none ${
              activeTab === tab.id
                ? 'text-primary'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-t-md'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-6 relative">
        <div className="max-w-4xl mx-auto w-full animate-in fade-in duration-300">
          {tabs.find((t) => t.id === activeTab)?.component}
        </div>
      </div>
    </div>
  );
};
