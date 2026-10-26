/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TeamProvider, useTeam } from './context/TeamContext';
import { AppHeader } from './components/Header/AppHeader';
import { AppSidebar, type ActiveTab } from './components/Sidebar/AppSidebar';
import { LiveMap } from './components/Map/LiveMap';
import { RightPanel } from './components/RightPanel/RightPanel';
import { BottomActions } from './components/BottomControls/BottomActions';
import { EmergencyModal } from './components/Modals/EmergencyModal';
import { VoiceCallModal } from './components/Modals/VoiceCallModal';
import { CheckpointModal } from './components/Modals/CheckpointModal';
import { ChatModal } from './components/Modals/ChatModal';
import { AuthModal } from './components/Modals/AuthModal';
import { TeamView } from './components/Views/TeamView';
import { MissionsView } from './components/Views/MissionsView';
import { IntelAlertsView } from './components/Views/IntelAlertsView';
import { RoutePlannerView } from './components/Views/RoutePlannerView';
import { SettingsView } from './components/Views/SettingsView';
import { ActivityTimelineView } from './components/Views/ActivityTimelineView';

const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState<boolean>(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handleQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    if (tab === 'emergency') {
      setIsEmergencyModalOpen(true);
      return;
    }
    if (tab === 'checkpoints') {
      setActiveTab('map');
      setIsCheckpointModalOpen(true);
      return;
    }
    if (tab === 'messages') {
      setIsChatModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F8FAFC] text-slate-800 antialiased font-sans">
      {/* Google Maps Quota Warning Banner (Compliance & Recovery) */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm flex items-center justify-between">
          <span className="mx-auto">
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
          <button
            onClick={() => setQuotaExceeded(false)}
            className="text-amber-700 hover:text-amber-950 font-bold ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <AppHeader
        onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenProfile={() => setActiveTab('team')}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Workspace Split Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Central Workspace Area */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#F8FAFC]">
          {activeTab === 'map' && (
            <div className="flex flex-col lg:flex-row h-full min-h-0">
              {/* Central Map Column + Bottom Controls */}
              <div className="flex-1 flex flex-col p-4 space-y-4 min-w-0 overflow-y-auto">
                {/* Central Interactive Google Satellite Map */}
                <div className="flex-1 min-h-[480px] lg:min-h-[540px]">
                  <LiveMap />
                </div>

                {/* Bottom Quick Actions & Current Conditions */}
                <div className="shrink-0">
                  <BottomActions
                    onOpenCheckpointModal={() => setIsCheckpointModalOpen(true)}
                    onOpenRouteModal={() => setActiveTab('routes')}
                  />
                </div>
              </div>

              {/* Right Panel: Team Members, Status, Emergency Assist & Chat */}
              <RightPanel
                onOpenTeamModal={() => setActiveTab('team')}
                onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
                onOpenChatModal={() => setIsChatModalOpen(true)}
              />
            </div>
          )}

          {activeTab === 'team' && <TeamView onBackToMap={() => setActiveTab('map')} />}
          {activeTab === 'missions' && <MissionsView onBackToMap={() => setActiveTab('map')} />}
          {activeTab === 'intel' && <IntelAlertsView onBackToMap={() => setActiveTab('map')} />}
          {activeTab === 'routes' && <RoutePlannerView onBackToMap={() => setActiveTab('map')} />}
          {activeTab === 'settings' && <SettingsView onBackToMap={() => setActiveTab('map')} />}
        </main>
      </div>

      {/* Global Interactive Modals */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />
      <CheckpointModal
        isOpen={isCheckpointModalOpen}
        onClose={() => setIsCheckpointModalOpen(false)}
      />
      <ChatModal isOpen={isChatModalOpen} onClose={() => setIsChatModalOpen(false)} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <VoiceCallModal />
    </div>
  );
};

export default function App() {
  return (
    <TeamProvider>
      <MainAppContent />
    </TeamProvider>
  );
}
