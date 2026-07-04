import {
  GlobalIcon,
  InstagramIcon,
  Facebook01Icon,
  Linkedin01Icon,
  Link01Icon,
} from "@hugeicons/core-free-icons";

export const SOCIAL_PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: InstagramIcon, color: "text-pink-500" },
  { value: "facebook", label: "Facebook", icon: Facebook01Icon, color: "text-blue-600" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin01Icon, color: "text-blue-500" },
  { value: "tiktok", label: "TikTok", icon: GlobalIcon, color: "text-text-primary" },
  { value: "youtube", label: "YouTube", icon: GlobalIcon, color: "text-red-600" },
  { value: "twitter", label: "Twitter / X", icon: GlobalIcon, color: "text-text-primary" },
  { value: "whatsapp", label: "WhatsApp", icon: GlobalIcon, color: "text-green-500" },
  { value: "website", label: "Sitio web", icon: GlobalIcon, color: "text-text-secondary" },
  { value: "otro", label: "Otro", icon: Link01Icon, color: "text-text-secondary" },
];
