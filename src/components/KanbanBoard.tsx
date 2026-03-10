import { COLUMNS, DEALS } from "@/src/lib/mockData";
import { MoreVertical, Calendar, MessageSquare, Paperclip, ArrowDownUp } from "lucide-react";
import Image from "next/image";

export function KanbanBoard() {
  return (
    <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
      {COLUMNS.map((col: { id: string, title: string, count: number }) => (
        <div key={col.id} className="w-[300px] flex-shrink-0 flex flex-col">
          {/* Column Header */}
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#f5f4ef] z-10 py-2">
            <h3 className="font-semibold text-lg text-gray-900">{col.title}</h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white shadow-sm border border-gray-100/50">
              <span className="text-sm font-semibold text-gray-700">{col.count}</span>
              <ArrowDownUp size={14} className="text-gray-400" />
            </div>
          </div>
          
          {/* Cards Container */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-1">
            {DEALS.filter((d: { status: string }) => d.status === col.id).map((deal) => (
              <KanbanCard key={deal.id} deal={deal} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanCard({ deal }: { deal: { id: string, title: string, description: string, location?: string, email?: string, managerId?: number, date: string, comments: number, attachments: number, status: string, isHighlighted?: boolean } }) {
  const isDark = deal.isHighlighted;
  
  return (
    <div className={`p-5 rounded-2xl shadow-sm border transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing flex flex-col gap-4 ${isDark ? 'bg-[#222222] text-white border-transparent' : 'bg-white text-gray-900 border-gray-100'}`}>
      
      {/* Header */}
      <div className="flex items-start justify-between">
        <h4 className="font-bold text-base leading-snug">{deal.title}</h4>
        <button className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'} -mt-1 -mr-2 p-1`}>
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Description */}
      <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
        {deal.description}
      </p>

      {/* Dark Card Specific Info (Location/Email/Manager) */}
      {isDark && (
        <div className="flex flex-col gap-3 mt-2">
            <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2 text-xs text-gray-400">
                    <span className="mt-0.5">📍</span>
                    <span>{deal.location}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-400">
                    <span className="mt-0.5">✉️</span>
                    <span>{deal.email}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
                 <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://i.pravatar.cc/150?u=2" alt="Manager" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400">Manager</span>
                    <span className="text-xs font-semibold text-gray-200">Antony Cardenas</span>
                </div>
            </div>
        </div>
      )}

      {/* Footer Metrics */}
      <div className={`flex items-center justify-between mt-auto pt-2 ${isDark ? '' : 'border-t border-gray-50'}`}>
        {/* Date Badge */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${isDark ? 'bg-[#333333] border-gray-600 text-gray-300' : 'bg-white border-gray-200 text-gray-600'}`}>
          <Calendar size={12} />
          {deal.date}
        </div>
        
        {/* Action Counters */}
        <div className={`flex items-center gap-3 text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="flex items-center gap-1">
             <MessageSquare size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
             {deal.comments}
          </div>
          <div className="flex items-center gap-1">
             <Paperclip size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
             {deal.attachments}
          </div>
        </div>
      </div>
    </div>
  );
}
