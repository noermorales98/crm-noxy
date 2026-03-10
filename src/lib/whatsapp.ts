export async function sendWhatsAppNotification(phone: string, apikey: string, message: string) {
  if (!phone || !apikey) {
    console.warn("WhatsApp notification skipped: Missing phone or apikey");
    return false;
  }

  try {
    // CallMeBot API requires the exact phone number format (with country code, usually starting + or 00 but they request numeric with + encoded as %2B if needed, though raw digits often work).
    // Let's ensure text is perfectly URL encoded.
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${apikey}`;

    const res = await fetch(url, { method: "GET" });
    const text = await res.text();

    if (res.ok && !text.includes("Error")) {
      console.log(`WhatsApp message sent successfully to ${phone}`);
      return true;
    } else {
      console.error(`WhatsApp CallMeBot API Error: ${text}`);
      return false;
    }
  } catch (error) {
    console.error("Failed to send WhatsApp notification via CallMeBot", error);
    return false;
  }
}
