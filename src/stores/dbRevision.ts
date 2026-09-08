import { create } from 'zustand';

type DbRevisionState = {
  revision: number;
  bump: () => void;
};

/**
 * Счётчик изменений базы. Любая запись через репозитории должна его увеличить —
 * на это подписаны все экраны и перечитывают данные.
 */
export const useDbRevision = create<DbRevisionState>((set) => ({
  revision: 0,
  bump: () => set((state) => ({ revision: state.revision + 1 })),
}));

export function bumpDbRevision(): void {
  useDbRevision.getState().bump();
}
