import type { PopupTabId } from './popupTabId';
import { IconClock, IconHome, IconSettings } from '@/ui/shared/icons';
import type { SVGAttributes } from 'react';

export interface TopNavBarProps {
  activeTab: PopupTabId;
  onTabChange: (tab: PopupTabId) => void;
}

const ITEMS: ReadonlyArray<{
  id: PopupTabId;
  label: string;
  Icon: (props: SVGAttributes<SVGSVGElement>) => JSX.Element;
}> = [
  { id: 'home', label: 'Home', Icon: IconHome },
  { id: 'history', label: 'History', Icon: IconClock },
  { id: 'settings', label: 'Settings', Icon: IconSettings },
];

/**
 * Top navigation — matte rail, soft active pill, lime accent + underline.
 */
export function TopNavBar({ activeTab, onTabChange }: TopNavBarProps) {
  return (
    <header className="shrink-0 border-b border-white/[0.06] bg-[#060606] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <nav className="flex gap-1.5 px-2.5 pb-2 pt-2.5" aria-label="Main">
        {ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-[background-color,color,box-shadow,transform] duration-300 ease-out active:scale-[0.99] ${
                isActive
                  ? 'bg-white/[0.06] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]'
                  : 'text-hearly-tertiary hover:bg-white/[0.035] hover:text-hearly-secondary'
              }`}
            >
              <Icon
                className={`shrink-0 transition-colors duration-300 ${
                  isActive
                    ? 'text-hearly-accent'
                    : 'text-hearly-tertiary group-hover:text-hearly-secondary'
                }`}
                width={17}
                height={17}
                strokeWidth={1.85}
                aria-hidden
              />
              <span
                className={`text-[11px] font-medium tracking-wide transition-colors duration-300 ${
                  isActive ? 'font-semibold text-white' : ''
                }`}
              >
                {item.label}
              </span>
              <span
                className={`pointer-events-none absolute bottom-1 left-1/2 h-[2px] w-9 max-w-[68%] -translate-x-1/2 rounded-full bg-hearly-accent shadow-[0_0_10px_rgba(181,240,61,0.24)] transition-all duration-300 ease-out ${
                  isActive ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </nav>
    </header>
  );
}
