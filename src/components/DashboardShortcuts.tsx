import Link from "next/link";
import { UserPlus, CalendarDays, CheckSquare, Megaphone, FolderKanban } from "lucide-react";

export function DashboardShortcuts() {
  const shortcuts = [
    {
      title: "Nuevo Lead",
      description: "Agrega y administra nuevos clientes",
      icon: UserPlus,
      href: "/contacts",
      color: "bg-blue-500",
    },
    {
      title: "Ver Citas",
      description: "Gestiona las reuniones de tu agenda",
      icon: CalendarDays,
      href: "/appointments",
      color: "bg-purple-500",
    },
    {
      title: "Mis Tareas",
      description: "Revisa y marca tareas pendientes",
      icon: CheckSquare,
      href: "/tasks",
      color: "bg-orange-500",
    },
    {
      title: "Nuevo Proyecto",
      description: "Inicia y colabora en nuevos proyectos",
      icon: FolderKanban,
      href: "/projects",
      color: "bg-emerald-500",
    },
    {
      title: "Campañas",
      description: "Envía emails y promociones",
      icon: Megaphone,
      href: "/campaigns",
      color: "bg-pink-500",
    },
  ];

  return (
    <section>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Accesos Directos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <Link
              key={shortcut.title}
              href={shortcut.href}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 group relative overflow-hidden"
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white mb-3 shadow-sm ${shortcut.color} group-hover:scale-110 transition-transform duration-300`}
              >
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-gray-900 font-semibold mb-1 text-center">{shortcut.title}</h3>
              <p className="text-xs text-gray-500 text-center leading-tight">
                {shortcut.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
