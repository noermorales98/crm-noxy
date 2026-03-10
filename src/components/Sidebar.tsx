"use client";
import { LayoutDashboard, CheckSquare, Activity, Users, Settings, Zap, TrendingUp, GitBranch, Megaphone, Plus, LogOut } from "lucide-react";
import Image from "next/image";
import { MEMBERS, PROJECTS } from "@/src/lib/mockData";
import { useSession, signOut } from "next-auth/react";

export default function Sidebar() {
  const { data: session } = useSession();

  return (
    <aside className="w-64 bg-white h-screen flex flex-col border-r border-gray-100 flex-shrink-0 overflow-hidden">
      {/* Brand (Fixed Top) */}
      <div className="p-6 flex items-center gap-2 shrink-0">
        <div className="text-xl font-bold tracking-tight text-gray-900">BizLink</div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {/* Main Nav */}
        <div className="px-4 py-2 flex flex-col gap-1">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem icon={<CheckSquare size={20} />} label="Tasks" badge={2} />
          <NavItem icon={<Activity size={20} />} label="Activity" />
          <NavItem icon={<Users size={20} />} label="Customers" active />
          <NavItem icon={<Settings size={20} />} label="Settings" />
        </div>

        {/* Projects */}
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Projects</h3>
          <div className="flex flex-col gap-3">
            {PROJECTS.map((project: { id: number, name: string, count: number, icon: string }) => (
              <div key={project.id} className="flex items-center justify-between text-gray-600 hover:text-gray-900 cursor-pointer group">
                <div className="flex items-center gap-2">
                  {project.icon === "zap" && <Zap size={18} className="text-gray-400 group-hover:text-gray-900" />}
                  {project.icon === "trending-up" && <TrendingUp size={18} className="text-gray-400 group-hover:text-gray-900" />}
                  {project.icon === "git-branch" && <GitBranch size={18} className="text-gray-400 group-hover:text-gray-900" />}
                  {project.icon === "megaphone" && <Megaphone size={18} className="text-gray-400 group-hover:text-gray-900" />}
                  <span className="text-sm font-medium">{project.name}</span>
                </div>
                {project.count > 0 && (
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{project.count}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Members */}
        {/* We keep members in the scrollable area so it doesn't take up fixed space */}
        <div className="px-6 pt-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Members</h3>
            <button className="text-gray-400 hover:text-gray-900">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {MEMBERS.map((member: { id: number, name: string, role: string, imageUrl: string }) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900 leading-none mb-1">{member.name}</span>
                  <span className="text-xs text-gray-400 leading-none truncate w-32">{member.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current User Logged In (Fixed Bottom) */}
      <div className="p-4 border-t border-gray-100 shrink-0 bg-white">
        <div className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-xl cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-[#2d2d2d] flex items-center justify-center text-white font-semibold text-sm">
                {session?.user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 leading-tight truncate max-w-[120px]">{session?.user?.name || "Loading..."}</span>
              <span className="text-xs text-gray-400 truncate max-w-[120px]">{session?.user?.email || ""}</span>
            </div>
          </div>
          <button onClick={() => signOut()} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active = false, badge }: { icon: React.ReactNode, label: string, active?: boolean, badge?: number }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${active ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      {badge && (
        <span className="text-xs font-semibold text-gray-500 bg-white shadow-xs border border-gray-100 w-5 h-5 flex items-center justify-center rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
}
