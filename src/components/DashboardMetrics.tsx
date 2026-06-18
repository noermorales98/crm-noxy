import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default function DashboardMetrics() {
  return (
    <div className="grid grid-cols-12 gap-6 bg-transparent">
      
      {/* Bar Chart Section (Mocked) */}
      <div className="col-span-5 bg-transparent p-1 pl-4 flex flex-col justify-end h-40">
        <h3 className="text-text-primary font-semibold mb-4">New customers</h3>
        <div className="flex items-end h-24 gap-[10%]">
          {/* Mock Bars */}
          <div className="w-[12%] flex flex-col items-center gap-2">
            <div className="w-full h-16 bg-[#2d2d2d] rounded-sm"></div>
            <span className="text-xs font-semibold text-text-secondary">Mon</span>
          </div>
          <div className="w-[12%] flex flex-col items-center gap-2">
            <div className="w-full h-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#d1d5db_2px,#d1d5db_4px)] rounded-sm"></div>
            <span className="text-xs font-semibold text-text-secondary">Tue</span>
          </div>
          <div className="w-[12%] flex flex-col items-center gap-2">
            <div className="w-full h-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#d1d5db_2px,#d1d5db_4px)] rounded-sm"></div>
            <span className="text-xs font-semibold text-text-secondary">Wed</span>
          </div>
          <div className="w-[12%] flex flex-col items-center gap-2">
            <div className="w-full h-8 bg-[#2d2d2d] rounded-sm"></div>
            <span className="text-xs font-semibold text-text-secondary">Thu</span>
          </div>
          <div className="w-[12%] flex flex-col items-center gap-2">
            <div className="w-full h-[85px] bg-[#2d2d2d] rounded-sm relative">
                {/* Y-axis labels over background */}
                <div className="absolute -left-12 bottom-0 text-[10px] text-text-secondary font-medium">0</div>
                <div className="absolute -left-12 bottom-[50%] text-[10px] text-text-secondary font-medium">5</div>
                <div className="absolute -left-12 bottom-[80%] text-[10px] text-text-secondary font-medium">10</div>
            </div>
            <span className="text-xs font-semibold text-text-secondary">Fri</span>
          </div>
        </div>
      </div>

      {/* Radial Chart Section (Mocked) */}
      <div className="col-span-3 flex items-center justify-center p-4 relative">
        <svg viewBox="0 0 100 50" className="w-[80%] overflow-visible">
          {/* Background Arc */}
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e5e5e5" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 4" />
          {/* Foreground Arc */}
          <path d="M 10 50 A 40 40 0 0 1 75 14" fill="none" stroke="#2d2d2d" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <div className="absolute bottom-4 flex flex-col items-center">
          <div className="text-3xl font-bold text-text-primary">68%</div>
          <div className="text-xs text-text-secondary font-medium mt-1">Successful deals</div>
        </div>
      </div>

      {/* KPI 1 */}
      <div className="col-span-2 flex flex-col justify-end p-4 pb-0 h-40 group cursor-pointer">
        <div className="mb-auto">
          <div className="text-4xl font-bold text-text-primary mb-2">53</div>
          <div className="text-sm font-medium text-text-secondary">Tasks<br/>in progress</div>
        </div>
        <div className="mt-4 pb-2 text-text-secondary group-hover:text-text-primary transition-colors">
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
        </div>
      </div>

      {/* KPI 2 */}
      <div className="col-span-2 flex flex-col justify-end p-4 pb-0 h-40 group cursor-pointer">
        <div className="mb-auto">
          <div className="text-4xl font-bold text-text-primary mb-2">$ 15.890</div>
          <div className="text-sm font-medium text-text-secondary">Prepayments<br/>from customers</div>
        </div>
        <div className="mt-4 pb-2 text-text-secondary group-hover:text-text-primary transition-colors">
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
        </div>
      </div>

    </div>
  );
}
