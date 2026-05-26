import './index.css';

import { navigateTo, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const ShieldIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const Splash = () => {
  return (
    <div className="min-h-screen bg-[#0e1111] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-600 to-red-600 shadow-2xl shadow-orange-700/30">
        <ShieldIcon />
      </div>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-red-400 to-purple-400 bg-clip-text text-transparent">
          Red Guardian AI
        </h1>
        <p className="text-sm text-gray-500 mt-1">AI-powered moderation assistant</p>
      </div>
      <button
        className="mt-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold px-8 py-3 rounded-full transition-all shadow-lg cursor-pointer active:scale-95"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Launch Dashboard
      </button>
      <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 text-xs text-gray-600">
        <button className="cursor-pointer hover:text-gray-400 transition-colors" onClick={() => navigateTo('https://developers.reddit.com/docs')}>Docs</button>
        <span>|</span>
        <button className="cursor-pointer hover:text-gray-400 transition-colors" onClick={() => navigateTo('https://discord.com/invite/R7yu2wh9Qz')}>Discord</button>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
