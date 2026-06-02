import { useFilterStore } from '@/store/filterStore';

export function useVoiceFilter() {
  const isActive = useFilterStore((s) => s.isActive);
  const actions = useFilterStore((s) => s.actions);
  return { isActive, actions };
}
