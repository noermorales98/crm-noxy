export const ASSISTANT_NEW_COPY = {
  subtitle: "¿Qué tipo de referencias estás buscando?",
  promptLabel: "Describe las referencias que estás buscando",
  promptHint: "Presiona Enter para enviar o Shift + Enter para una nueva línea.",
  sendLabel: "Enviar mensaje",
  visualLabel: "Previsualizaciones de referencias de diseño",
  prompts: [
    "Crea el diseño de un dashboard financiero",
    "Diseña una identidad de marca con la letra M",
    "Crea un efecto de cristal líquido",
    "Diseña una animación de carga",
    "Crea una landing page para SaaS",
  ],
  cards: [
    "Referencia de composición editorial",
    "Referencia de interfaz de producto",
    "Referencia de identidad de marca",
  ],
  legalPrefix: "Al enviar un mensaje a ChatBot, aceptas nuestros",
  terms: "Términos",
  legalJoin: "y confirmas que leíste nuestra",
  privacy: "Política de privacidad",
} as const;

const TIME_GREETINGS = {
  morning: "Buenos días",
  afternoon: "Buenas tardes",
  evening: "Buenas noches",
} as const;

const EXTRA_GREETINGS = ["¿En qué te ayudo?", "¿Qué hacemos hoy?"] as const;

export function timeOfDayGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return TIME_GREETINGS.morning;
  if (hour >= 12 && hour < 19) return TIME_GREETINGS.afternoon;
  return TIME_GREETINGS.evening;
}

export function firstName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const [given] = trimmed.split(/\s+/);
  return given || null;
}

export function assistantGreetingOptions(name: string | null | undefined, hour: number): string[] {
  const given = firstName(name);
  const options = [timeOfDayGreeting(hour), ...EXTRA_GREETINGS];
  if (given) options.push(`Hola, ${given}`);
  return options;
}

export function pickAssistantGreeting(
  name: string | null | undefined,
  now: Date,
  random: () => number = Math.random,
): string {
  const options = assistantGreetingOptions(name, now.getHours());
  const index = Math.min(options.length - 1, Math.max(0, Math.floor(random() * options.length)));
  return options[index];
}
