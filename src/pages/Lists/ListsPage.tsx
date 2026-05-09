import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, FolderOpen, Users, Zap, Star } from 'lucide-react';
import { YourListsTab } from './YourListsTab';
import { SharedListsTab } from './SharedListsTab';
import { GlobalListsTab } from './GlobalListsTab';
import { ScoreDistributionChart } from '@/components/analytics/ScoreDistributionChart';
import { AnalyticsCandidate } from '@/types/analytics';

export default function ListsPage() {
  const [activeTab, setActiveTab] = useState<'yours' | 'shared' | 'global'>('yours');
  const yourListsRef = useRef<any>(null);
  const [isAnalyticsPanelOpen, setIsAnalyticsPanelOpen] = useState(true);
  const [allCandidates, setAllCandidates] = useState<AnalyticsCandidate[]>([]);

  const handleCreateList = () => {
    if (yourListsRef.current?.handleCreateClick) {
      yourListsRef.current.handleCreateClick();
    }
  };

  const [stats, setStats] = useState({
    totalLists: 0,
    totalCandidates: 0,
    avgDiversity: 0,
    allStarred: 0
  });

  const handleStatsUpdate = React.useCallback((newStats: typeof stats) => {
    setStats(newStats);
  }, []);

  const handleCandidatesUpdate = React.useCallback((candidates: AnalyticsCandidate[]) => {
    setAllCandidates(candidates);
  }, []);

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden pt-6">
      <div className="flex-shrink-0 bg-gray-50 pr-8 pb-4">
        <style>{`
          .wrap {
            --round: 10px;
            --p-x: 8px;
            --p-y: 4px;
            --w-label: 200px;
            --color-pure: #000;
            --color-primary: #e8e8e8;
            --color-secondary: #212121;
            --muted: #b8b8b8;
            display: flex;
            align-items: center;
            padding: var(--p-y) var(--p-x);
            position: relative;
            background: var(--color-primary);
            border-radius: var(--round);
            max-width: 100%;
            overflow-x: auto;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            top: 0;
            z-index: 1;
          }

          .wrap input {
            height: 0;
            width: 0;
            position: absolute;
            overflow: hidden;
            display: none;
            visibility: hidden;
          }

          .tab-label {
            cursor: pointer;
            outline: none;
            font-size: 0.875rem;
            letter-spacing: 0.05em;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--color-secondary);
            background: transparent;
            padding: 16px 20px;
            width: var(--w-label);
            min-width: var(--w-label);
            text-decoration: none;
            user-select: none;
            transition: color 0.25s ease;
            outline-offset: -6px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 2;
            -webkit-tap-highlight-color: transparent;
          }
          .tab-label span {
            overflow: hidden;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 1;
          }

          .wrap input:checked + label {
            color: var(--color-pure);
          }

          .bar {
            display: none;
          }

          .slidebar {
            position: absolute;
            height: calc(100% - (var(--p-y) * 4));
            width: var(--w-label);
            border-radius: calc(var(--round) - var(--p-y));
            background: var(--muted);
            transform-origin: 0 0 0;
            z-index: 0;
            transition: transform 0.5s cubic-bezier(0.33, 0.83, 0.99, 0.98);
          }

          .rd-1:checked ~ .bar,
          .rd-1:checked ~ .slidebar,
          .rd-1 + label:hover ~ .slidebar {
            transform: translateX(0) scaleX(1);
          }
          .rd-2:checked ~ .bar,
          .rd-2:checked ~ .slidebar,
          .rd-2 + label:hover ~ .slidebar {
            transform: translateX(100%) scaleX(1);
          }
          .rd-3:checked ~ .bar,
          .rd-3:checked ~ .slidebar,
          .rd-3 + label:hover ~ .slidebar {
            transform: translateX(200%) scaleX(1);
          }
        `}</style>

        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <div className="wrap">
            <input
              hidden
              className="rd-1"
              name="radio"
              id="rd-1"
              type="radio"
              checked={activeTab === 'yours'}
              onChange={() => setActiveTab('yours')}
            />
            <label className="tab-label" htmlFor="rd-1">
              <span>Your Pools</span>
            </label>

            <input
              hidden
              className="rd-2"
              name="radio"
              id="rd-2"
              type="radio"
              checked={activeTab === 'shared'}
              onChange={() => setActiveTab('shared')}
            />
            <label className="tab-label" htmlFor="rd-2">
              <span className="flex flex-col items-center gap-0.5">
                <span>Shared with You</span>
                <span className="text-[10px] text-muted-foreground font-normal">(READ ONLY)</span>
              </span>
            </label>

            <input
              hidden
              className="rd-3"
              name="radio"
              id="rd-3"
              type="radio"
              checked={activeTab === 'global'}
              onChange={() => setActiveTab('global')}
            />
            <label className="tab-label" htmlFor="rd-3">
              <span className="flex flex-col items-center gap-0.5">
                <span>Global Pools</span>
                <span className="text-[10px] text-muted-foreground font-normal">(ADMIN CONTROLLED)</span>
              </span>
            </label>

            <div className="bar"></div>
            <div className="slidebar"></div>
          </div>

          {activeTab === 'yours' && (
            <Button
              onClick={handleCreateList}
              className="bg-black hover:bg-slate-800 text-white rounded shadow-[0_2px_8px_rgba(0,0,0,0.08)] uppercase tracking-wider font-bold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Candidate Pool
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {activeTab === 'yours' && (
          <YourListsTab
            ref={yourListsRef}
            onStatsUpdate={handleStatsUpdate}
            onCandidatesUpdate={handleCandidatesUpdate}
          />
        )}
        {activeTab === 'shared' && <SharedListsTab />}
        {activeTab === 'global' && <GlobalListsTab />}
      </div>

      {/* Right Side Analytics Panel */}
      <div className={`fixed top-0 right-0 h-screen bg-background/90 backdrop-blur-lg border-l border-border/50 transition-all duration-300 z-50 shadow-2xl ${isAnalyticsPanelOpen ? 'w-[30%]' : 'w-[12px]'}`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsAnalyticsPanelOpen(!isAnalyticsPanelOpen)}
          className="absolute top-14 -left-10 h-10 w-10 bg-card border border-border rounded-lg hover:bg-accent/10 hover:border-primary/30 transition-all duration-300 flex items-center justify-center shadow-md group"
        >
          {isAnalyticsPanelOpen ? (
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </button>

        {isAnalyticsPanelOpen && (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col p-2 overflow-hidden">
              <div className="mb-3 text-center flex-shrink-0">
                <h3 className="text-base font-semibold text-foreground">Analytics</h3>
              </div>

              {/* Compact KPI Cards */}
              <div className="grid grid-cols-2 gap-2 mb-3 flex-shrink-0">
                <div className="p-2.5 rounded-lg bg-muted text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium">Candidate Pools</p>
                  </div>
                  <p className="text-xl font-bold text-foreground">{stats.totalLists}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs text-primary font-medium">Total</p>
                  </div>
                  <p className="text-xl font-bold text-primary">{stats.totalCandidates}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-accent/10 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Zap className="h-3.5 w-3.5 text-accent" />
                    <p className="text-xs text-accent font-medium">Diversity</p>
                  </div>
                  <p className="text-xl font-bold text-accent">{stats.avgDiversity}%</p>
                </div>
                <div className="p-2.5 rounded-lg bg-success/10 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-3.5 w-3.5 text-success" />
                    <p className="text-xs text-success font-medium">Starred</p>
                  </div>
                  <p className="text-xl font-bold text-success">{stats.allStarred}</p>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                <ScoreDistributionChart
                  candidates={allCandidates}
                  aiQuery="All Lists Overview"
                  totalCandidatesInLists={stats.totalCandidates}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
