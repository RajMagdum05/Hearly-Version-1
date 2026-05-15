import { Modal } from '@/ui/shared/Modal';
import { Badge } from '@/ui/shared/Badge';

export interface RoadmapModalProps {
  open: boolean;
  onClose: () => void;
}

export function RoadmapModal({ open, onClose }: RoadmapModalProps) {
  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      labelledBy="roadmap-title"
      className="max-w-[340px] border-white/[0.07] bg-[#080808]/95 p-0 overflow-hidden"
    >
      <div className="relative flex flex-col p-6 pt-8">
        {/* Ambient Glow */}
        <div 
          className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-hearly-accent/[0.035] blur-[80px]" 
          aria-hidden 
        />
        
        {/* Close Button */}
        <button
          type="button"
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.025] text-hearly-tertiary transition-[background-color,border-color,color,transform] duration-300 hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-hearly-text active:scale-[0.99]"
          onClick={onClose}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1L11 11M1 11L11 1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <header className="relative mb-8 text-center">
          <Badge variant="accent" className="mb-3">Roadmap</Badge>
          <h2 id="roadmap-title" className="text-[22px] font-semibold leading-tight tracking-[-0.03em] text-white">
            Future of Hear<span className="text-hearly-accent">ly</span>
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-hearly-secondary">
            Building the next generation of focused listening.
          </p>
        </header>

        <div className="relative space-y-6">
          {/* Version 1.5 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-hearly-accent/80">Coming Soon</span>
              <div className="h-px flex-1 bg-gradient-to-r from-hearly-accent/20 to-transparent" />
              <span className="text-xs font-semibold text-white/90 tabular-nums">V1.5</span>
            </div>
            <ul className="space-y-2.5">
              <RoadmapItem title="Sharper voice filtering" description="Improved AI models for better isolation." />
              <RoadmapItem title="Cleaner transcripts" description="Formatted and readable text previews." />
              <RoadmapItem title="Enhanced controls" description="More granular listening session management." />
            </ul>
          </section>

          {/* Version 2.0 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Future Vision</span>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              <span className="text-xs font-semibold text-white/40 tabular-nums">V2.0</span>
            </div>
            <ul className="space-y-2.5 opacity-80">
              <RoadmapItem title="AI Conversation Insights" description="Automated summaries and key takeaways." />
              <RoadmapItem title="Smart Voice Profiles" description="Multi-user enrollment and tracking." />
              <RoadmapItem title="Cloud Sync & Multi-device" description="Your data, everywhere you go." />
            </ul>
          </section>
        </div>

        <button
          className="relative mt-8 w-full rounded-full border border-white/[0.08] bg-white/[0.035] py-3 text-[13px] font-semibold text-white transition-[background-color,border-color,color,transform] duration-300 hover:border-white/[0.14] hover:bg-white/[0.055] active:scale-[0.99]"
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}

function RoadmapItem({ title, description }: { title: string; description: string }) {
  return (
    <li className="group flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-hearly-accent/50 group-hover:bg-hearly-accent transition-colors" />
        <h4 className="text-[13px] font-medium text-white/90">{title}</h4>
      </div>
      <p className="pl-3 text-[11px] text-hearly-secondary/80 leading-relaxed">
        {description}
      </p>
    </li>
  );
}
