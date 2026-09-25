import React, { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { MapPin, HelpCircle, Plus, Trash2, Edit2, MessageSquare } from 'lucide-react';
import { mapService } from '../services/mapService';

export const DestinationsPage: React.FC = () => {
  const { currentMap, loadActiveMap } = useMapStore();
  const [selectedLocId, setSelectedLocId] = useState<number>(0);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const destinations = currentMap?.locations.filter((l) => l.type === 'DESTINATION') || [];
  const activeDestination = destinations.find((d) => d.id === selectedLocId) || destinations[0];

  const handleAddQA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDestination || !newQuestion.trim() || !newAnswer.trim()) return;

    try {
      await mapService.addDestinationInfo(
        activeDestination.id,
        newQuestion.trim(),
        newAnswer.trim()
      );
      await loadActiveMap();
      setNewQuestion('');
      setNewAnswer('');
      setIsAdding(false);
    } catch (err: any) {
      alert(`Error adding Q&A: ${err.message}`);
    }
  };

  const handleDeleteQA = async (id: number) => {
    if (window.confirm('Delete this question and answer?')) {
      await mapService.deleteDestinationInfo(id);
      await loadActiveMap();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Destination Knowledge Base (Q&A)</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure natural language spoken questions and answers for each destination. The robot will answer these when it arrives.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Destination Selector Sidebar */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
            Destinations
          </p>
          {destinations.map((dest) => (
            <button
              key={dest.id}
              onClick={() => setSelectedLocId(dest.id)}
              className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                (activeDestination?.id === dest.id)
                  ? 'bg-campus-600/20 text-campus-400 border-campus-500/40 shadow-md'
                  : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{dest.name}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {dest.destinationInfo?.length || 0} Q&As
              </span>
            </button>
          ))}
        </div>

        {/* Q&A List & Editor */}
        <div className="md:col-span-3 space-y-4">
          {activeDestination ? (
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-sky-400" />
                    {activeDestination.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeDestination.description || 'No description provided.'}
                  </p>
                </div>
                <button
                  onClick={() => setIsAdding(!isAdding)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-campus-600 hover:bg-campus-500 text-white text-xs font-bold shadow-md shadow-campus-900/40 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  {isAdding ? 'Cancel' : 'Add Question'}
                </button>
              </div>

              {isAdding && (
                <form
                  onSubmit={handleAddQA}
                  className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3 animate-in fade-in"
                >
                  <h4 className="text-xs font-bold text-white">Add Spoken Question & Answer</h4>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Spoken Question / Keyword Trigger
                    </label>
                    <input
                      type="text"
                      required
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="e.g. What are the library timings?"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-campus-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Robot's Spoken Answer
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      placeholder="e.g. The library is open from 9 AM to 6 PM Monday through Saturday."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-campus-500 resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-campus-600 hover:bg-campus-500 text-white text-xs font-bold"
                    >
                      Save Q&A
                    </button>
                  </div>
                </form>
              )}

              {/* Q&A Cards */}
              <div className="space-y-3">
                {activeDestination.destinationInfo && activeDestination.destinationInfo.length > 0 ? (
                  activeDestination.destinationInfo.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start justify-between gap-4 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-campus-400 shrink-0" />
                          <p className="text-xs font-bold text-white">{item.question}</p>
                        </div>
                        <div className="flex items-start gap-2 pl-5 text-xs text-slate-300">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <p className="italic">"{item.answer}"</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteQA(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-xs text-slate-500">
                    No custom questions configured for this destination yet. Click "+ Add Question" to create one.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No destinations available on map.</p>
          )}
        </div>
      </div>
    </div>
  );
};
