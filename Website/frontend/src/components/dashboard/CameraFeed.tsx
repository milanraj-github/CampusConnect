import React, { useState, useEffect } from 'react';
import { Camera, Eye, Video, RefreshCw, AlertCircle, ExternalLink, Settings2, CheckCircle2 } from 'lucide-react';
import { useRobotStore } from '../../store/robotStore';
import { rpiService } from '../../services/rpiService';

export const CameraFeed: React.FC = () => {
  const { rpiConfig, updateRpiConfig, rpiTelemetry } = useRobotStore();
  const [streamError, setStreamError] = useState(false);
  const [selectedPath, setSelectedPath] = useState(rpiConfig.streamPath || '/video_feed');
  const [showConfig, setShowConfig] = useState(false);
  const [customPathInput, setCustomPathInput] = useState(rpiConfig.streamPath);
  const [refreshKey, setRefreshKey] = useState(0);

  const streamUrl = `${rpiConfig.baseUrl.replace(/\/$/, '')}${selectedPath.startsWith('/') ? selectedPath : `/${selectedPath}`}`;

  useEffect(() => {
    setSelectedPath(rpiConfig.streamPath || '/video_feed');
  }, [rpiConfig.streamPath]);

  const handleReload = () => {
    setStreamError(false);
    setRefreshKey((k) => k + 1);
  };

  const handlePathChange = (path: string) => {
    setSelectedPath(path);
    updateRpiConfig({ streamPath: path });
    setStreamError(false);
    setRefreshKey((k) => k + 1);
  };

  const handleCustomPathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePathChange(customPathInput);
    setShowConfig(false);
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-campus-400" />
          <div>
            <h3 className="font-bold text-sm text-white">Raspberry Pi Live Camera Feed</h3>
            <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
              {rpiConfig.baseUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${
              !streamError
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
            }`}
          >
            <Video className={`w-3 h-3 ${!streamError ? 'animate-pulse' : ''}`} />
            {!streamError ? 'LIVE MJPEG' : 'STREAM OFFLINE'}
          </span>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Stream Path Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-slate-400 hover:text-campus-400 rounded hover:bg-slate-800 transition-colors"
            title="Open stream in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleReload}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Refresh stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Path Switcher / Config Drawer */}
      {showConfig && (
        <form onSubmit={handleCustomPathSubmit} className="p-3 mb-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-semibold">Select Camera Stream Endpoint:</span>
            <div className="flex gap-1.5">
              {['/video_feed', '/stream', '/'].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => {
                    setCustomPathInput(p);
                    handlePathChange(p);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    selectedPath === p ? 'bg-campus-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customPathInput}
              onChange={(e) => setCustomPathInput(e.target.value)}
              placeholder="e.g. /video_feed"
              className="flex-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-campus-500"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded bg-campus-600 hover:bg-campus-500 text-white font-semibold text-[11px]"
            >
              Apply
            </button>
          </div>
        </form>
      )}

      {/* Stream Display Area */}
      <div className="relative flex-1 min-h-[220px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
        {!streamError ? (
          <img
            key={refreshKey}
            src={streamUrl}
            alt="Raspberry Pi Camera Stream"
            onError={() => setStreamError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6 space-y-3">
            <AlertCircle className="w-9 h-9 text-amber-500 mx-auto" />
            <div>
              <p className="text-xs font-semibold text-slate-200">Camera Feed Not Detected</p>
              <p className="text-[11px] text-slate-400 font-mono mt-1 break-all max-w-sm mx-auto">
                Target: {streamUrl}
              </p>
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Ensure your Raspberry Pi Flask / MJPEG stream server is active on <code className="text-slate-400 font-mono">{rpiConfig.baseUrl}</code>.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={handleReload}
                className="px-3 py-1.5 rounded-lg bg-campus-600 hover:bg-campus-500 text-xs font-semibold text-white transition-colors"
              >
                Retry Stream
              </button>
              <button
                onClick={() => handlePathChange(selectedPath === '/video_feed' ? '/stream' : selectedPath === '/stream' ? '/' : '/video_feed')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                Try Alternate Path
              </button>
            </div>
          </div>
        )}

        {/* HUD Overlay */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/70 backdrop-blur border border-white/10 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
          <Eye className="w-3 h-3" />
          <span>Vision Tracking Active</span>
        </div>

        {rpiTelemetry?.connected && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 backdrop-blur border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Pi Online ({rpiTelemetry.latencyMs || 0}ms)</span>
          </div>
        )}
      </div>
    </div>
  );
};
