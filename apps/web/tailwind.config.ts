import type { Config } from "tailwindcss";
import { webTailwindConfig } from "@acme/config/tailwind/web";

export default {
  ...webTailwindConfig,
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
} satisfies Config;
