import LoginForm from "./LoginForm";

// Fondos del lado derecho. Uno distinto en cada visita; para quitar uno, bórralo de la lista.
const BACKGROUNDS = ["/bg4.jpg", "/login-bg-2.webp"];

// Dinámica: si se prerenderizara, el fondo quedaría fijo desde la compilación.
export const dynamic = "force-dynamic";

function pickBackground(): string {
  return BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
}

export default function LoginPage() {
  return <LoginForm background={pickBackground()} />;
}
