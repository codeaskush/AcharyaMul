import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserCog, ClipboardList, Inbox, FileText, ShieldAlert, HandHeart, ChevronDown, ChevronRight, GitPullRequest, Settings } from 'lucide-react';
import UserManagement from './UserManagement';
import RequestQueue from './RequestQueue';
import DraftManagement from './DraftManagement';
import QuarantineManagement from './QuarantineManagement';
import ContributionRequests from './ContributionRequests';
import ActivityLog from './ActivityLog';
import PlatformSettings from './PlatformSettings';

const MENU = [
  {
    id: 'user_mgmt',
    icon: Users,
    labelKey: 'admin.menu_user_mgmt',
    children: [
      { id: 'access', icon: UserCog, labelKey: 'admin.tab_access' },
      { id: 'activity', icon: ClipboardList, labelKey: 'admin.tab_activity' },
    ],
  },
  {
    id: 'contrib_mgmt',
    icon: GitPullRequest,
    labelKey: 'admin.menu_contrib_mgmt',
    children: [
      { id: 'requests', icon: Inbox, labelKey: 'admin.tab_requests' },
      { id: 'drafts', icon: FileText, labelKey: 'admin.tab_drafts' },
      { id: 'quarantine', icon: ShieldAlert, labelKey: 'admin.tab_quarantine' },
      { id: 'eoi', icon: HandHeart, labelKey: 'admin.tab_eoi' },
    ],
  },
  {
    id: 'platform',
    icon: Settings,
    labelKey: 'admin.menu_platform',
    children: [
      { id: 'platform_settings', icon: Settings, labelKey: 'admin.tab_platform_settings' },
    ],
  },
];

export default function AdminPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('access');
  const [expandedMenus, setExpandedMenus] = useState(['user_mgmt', 'contrib_mgmt', 'platform']);

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev =>
      prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
    );
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/30 p-3 space-y-1 shrink-0 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 py-2">
          Admin
        </p>

        {MENU.map(group => {
          const GroupIcon = group.icon;
          const isExpanded = expandedMenus.includes(group.id);

          return (
            <div key={group.id}>
              <button
                onClick={() => toggleMenu(group.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-background/50 transition-colors"
              >
                <GroupIcon className="h-4 w-4" />
                <span className="flex-1 text-left">{t(group.labelKey)}</span>
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>

              {isExpanded && (
                <div className="ml-3 pl-3 border-l border-border/50 space-y-0.5 mt-0.5 mb-1">
                  {group.children.map(item => {
                    const ItemIcon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                          isActive
                            ? 'bg-background font-medium text-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background/50'
                        }`}
                      >
                        <ItemIcon className="h-3.5 w-3.5" />
                        {t(item.labelKey)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'access' && <UserManagement />}
        {activeTab === 'activity' && <ActivityLog />}
        {activeTab === 'requests' && <RequestQueue />}
        {activeTab === 'drafts' && <DraftManagement />}
        {activeTab === 'quarantine' && <QuarantineManagement />}
        {activeTab === 'eoi' && <ContributionRequests />}
        {activeTab === 'platform_settings' && <PlatformSettings />}
      </div>
    </div>
  );
}
