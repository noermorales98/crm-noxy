const SPAM_KEYWORDS = [
  "gana dinero",
  "dinero fácil",
  "dinero rapido",
  "dinero rápido",
  "viagra",
  "cialis",
  "haz clic aquí",
  "haz click aqui",
  "click here now",
  "oferta exclusiva",
  "lottery",
  "you've won",
  "you have won",
  "free money",
  "act now",
  "cuenta bloqueada",
  "verifica tu cuenta",
  "limited time offer",
  "risk free",
  "work from home",
  "casino",
  "crypto giveaway",
  "nigerian prince",
];

const IMPERSONATED_BRANDS = [
  "paypal",
  "amazon",
  "microsoft",
  "netflix",
  "apple",
  "banco",
  "bank",
  "santander",
  "bbva",
  "bank of america",
  "wells fargo",
];

const GENERIC_FREEMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "live.com",
  "aol.com",
  "icloud.com",
];

function hasSpamKeyword(subject: string, bodyText: string | null): boolean {
  const haystack = `${subject} ${(bodyText ?? "").slice(0, 2000)}`.toLowerCase();
  return SPAM_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function hasSuspiciousSender(fromAddress: string, fromName: string | null): boolean {
  const [localPart, domain] = fromAddress.toLowerCase().split("@");
  const nameLower = (fromName ?? "").toLowerCase();

  const impersonatesBrand = IMPERSONATED_BRANDS.some((brand) => nameLower.includes(brand));
  const isGenericDomain = GENERIC_FREEMAIL_DOMAINS.includes(domain ?? "");
  if (impersonatesBrand && isGenericDomain) return true;

  const digitCount = (localPart?.match(/[0-9]/g) ?? []).length;
  if (localPart && localPart.length > 0 && digitCount / localPart.length > 0.5) return true;

  return false;
}

function hasExcessiveShouting(subject: string): boolean {
  if (/[!?]{3,}/.test(subject)) return true;

  const letters = subject.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  if (letters.length < 8) return false;

  const upperCount = (letters.match(/[A-ZÀ-Þ]/g) ?? []).length;
  return upperCount / letters.length > 0.6;
}

export function detectSpam(input: {
  subject: string;
  bodyText: string | null;
  fromAddress: string;
  fromName: string | null;
}): boolean {
  const signals = [
    hasSpamKeyword(input.subject, input.bodyText),
    hasSuspiciousSender(input.fromAddress, input.fromName),
    hasExcessiveShouting(input.subject),
  ];
  const trueSignalCount = signals.filter(Boolean).length;
  return trueSignalCount >= 2;
}
