import { Card } from "@/components/ui/card";export default function ProfileLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 bg-gray-200" />
          <div className="space-y-2">
            <div className="h-6 w-52 bg-gray-200" />
            <div className="h-4 w-72 bg-gray-100" />
          </div>
        </div>
      </Card>

      <Card>
        <div className="h-20 border-r border-b lg:border-b-0 border-[#e5e5e5] bg-gray-100/60" />
        <div className="h-20 border-b lg:border-b-0 lg:border-r border-[#e5e5e5] bg-gray-100/60" />
        <div className="h-20 border-r border-[#e5e5e5] bg-gray-100/60" />
        <div className="h-20 bg-gray-100/60" />
      </Card>

      <Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <div className="h-5 w-52 bg-gray-200" />
            <div className="h-4 w-60 bg-gray-100" />
            <div className="h-12 border border-[#e5e5e5] bg-white" />
            <div className="h-12 border border-[#e5e5e5] bg-white" />
            <div className="h-12 border border-[#e5e5e5] bg-white" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-32 bg-gray-200" />
            <div className="h-4 w-40 bg-gray-100" />
            <div className="h-10 border border-[#e5e5e5] bg-white" />
            <div className="h-10 border border-[#e5e5e5] bg-white" />
            <div className="h-10 border border-[#e5e5e5] bg-white" />
          </div>
        </div>
      </Card>
    </div>);

}