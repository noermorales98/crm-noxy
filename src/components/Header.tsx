import { Search, SlidersHorizontal, ArrowDownUp, User, Plus } from "lucide-react";

export default function Header() {
  return (
    <header className="h-20 px-8 flex items-center justify-between border-b border-gray-100/0 bg-transparent flex-shrink-0">
      
      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative flex items-center w-full h-10 rounded-full bg-white/50 backdrop-blur-sm px-4 focus-within:ring-2 focus-within:ring-gray-200 transition-all">
          <Search size={18} className="text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search customer..." 
            className="w-full bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
          <ArrowDownUp size={16} />
          Sort by
        </button>
        
        <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
          <SlidersHorizontal size={16} />
          Filters
        </button>

        <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors ml-2">
          <User size={16} />
          Me
        </button>

        <button className="ml-4 flex items-center gap-2 bg-[#2d2d2d] hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-[#2d2d2d] focus:ring-offset-[#f5f4ef]">
          <Plus size={16} />
          Add customer
        </button>
      </div>

    </header>
  );
}
