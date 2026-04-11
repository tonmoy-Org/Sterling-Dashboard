const TABS = ['LIVE UPDATES', 'HISTORY', 'REPORT ISSUE'];

export default function TabNavigation({ activeTab, onTabChange }) {
  return (
    <div className="border-b border-gray-200">
      <div className="max-w-5xl mx-auto">
        <nav className="flex justify-center gap-12">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`py-4 text-xs font-semibold tracking-wider border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#1565C0] text-[#1565C0]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
