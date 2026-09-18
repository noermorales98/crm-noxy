export async function sendCallMeBotMessage(
  phone: string,
  apikey: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!phone || !apikey) {
    console.warn("WhatsApp notification skipped: Missing phone or apikey");
    return { ok: false, error: "Falta número o apikey de CallMeBot" };
  }

  try {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${apikey}`;

    const res = await fetch(url, { method: "GET" });
    const text = await res.text();

    if (res.ok && !text.includes("Error")) {
      console.log(`WhatsApp message sent successfully to ${phone}`);
      return { ok: true };
    }

    console.error(`WhatsApp CallMeBot API Error: ${text}`);
    return { ok: false, error: text.trim() || `CallMeBot respondió ${res.status}` };
  } catch (error) {
    console.error("Failed to send WhatsApp notification via CallMeBot", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo conectar con CallMeBot" };
  }
}

export async function sendWhatsAppNotification(phone: string, apikey: string, message: string) {
  const result = await sendCallMeBotMessage(phone, apikey, message);
  return result.ok;
}
