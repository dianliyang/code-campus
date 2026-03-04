import { Card } from "@/components/ui/card";export default function StudyPlanLoading() {
  return (
    <main className="w-full animate-pulse">
      <div className="flex flex-col gap-4">
        {/* Sticky Stats strip — mirrors StudyPlanHeader */}
        <Card>
          <Card>
            <Card>
              <div className="h-3 w-20 bg-[#f0f0f0]" />
              <div className="h-7 w-12 bg-[#e8e8e8] mt-2" />
            </Card>
            <Card>
              <div className="h-3 w-20 bg-[#f0f0f0]" />
              <div className="h-7 w-12 bg-[#e8e8e8] mt-2" />
            </Card>
            <Card>
              <div className="h-3 w-20 bg-[#f0f0f0]" />
              <div className="h-7 w-12 bg-[#e8e8e8] mt-2" />
            </Card>
            <div className="px-4 py-3">
              <div className="h-3 w-20 bg-[#f0f0f0]" />
              <div className="h-7 w-12 bg-[#e8e8e8] mt-2" />
            </div>
          </Card>
        </Card>

        {/* Calendar section */}
        <Card>
          <div className="h-4 w-40 bg-[#f0f0f0]" />
          <div className="h-48 bg-[#f5f5f5]" />
        </Card>

        {/* AI Learning Planner section */}
        <Card>
          <div className="h-4 w-36 bg-[#f0f0f0]" />
          <div className="h-3 w-52 bg-[#f5f5f5]" />
          <div className="h-20 bg-[#f5f5f5] mt-1" />
        </Card>

        {/* Active courses section */}
        <Card>
          <div className="h-4 w-32 bg-[#f0f0f0]" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="h-28 bg-[#f5f5f5]" />
            <div className="h-28 bg-[#f5f5f5]" />
          </div>
        </Card>
      </div>
    </main>);

}