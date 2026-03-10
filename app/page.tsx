import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import DashboardMetrics from "@/src/components/DashboardMetrics";
import { KanbanBoard } from "@/src/components/KanbanBoard";

export default function Home() {
  return (
    <div className="flex h-screen bg-[#f5f4ef] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-6 flex flex-col gap-6">
          <DashboardMetrics />
          
          <div className="mt-2" />
          
          <KanbanBoard />
        </main>
      </div>
    </div>
  );
}
