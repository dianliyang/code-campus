import Navbar from "@/components/layout/Navbar";

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      {children}
    </div>
  );
}
