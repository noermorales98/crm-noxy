export type Sexo = "MASCULINO" | "FEMENINO";

export function isSexo(value: unknown): value is Sexo {
  return value === "MASCULINO" || value === "FEMENINO";
}

export function parseSexo(value: unknown, fallback: Sexo = "MASCULINO"): Sexo {
  return isSexo(value) ? value : fallback;
}

export function userAvatarSrc(sexo?: Sexo | null): string {
  return sexo === "FEMENINO" ? "/femenino.svg" : "/avt.webp";
}

export function welcomeGreeting(sexo?: Sexo | null): string {
  return sexo === "FEMENINO" ? "Bienvenida" : "Bienvenido";
}
