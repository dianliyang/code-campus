import { create } from "zustand";

interface RoadmapState {
  selectedSemester: string;
  setSelectedSemester: (semester: string) => void;
}

export const useRoadmapStore = create<RoadmapState>((set) => ({
  selectedSemester: "all",
  setSelectedSemester: (selectedSemester) => set({ selectedSemester }),
}));
