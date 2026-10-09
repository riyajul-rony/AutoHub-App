import type { SocialProvider } from "./types";
import { facebookProvider } from "./facebook";

const providers = new Map<string, SocialProvider>();
providers.set("facebook", facebookProvider);

export function getSocialProvider(id: string): SocialProvider {
  const p = providers.get(id);
  if (!p) throw new Error(`Unsupported social provider: ${id}`);
  return p;
}

export function registerSocialProvider(provider: SocialProvider) {
  providers.set(provider.id, provider);
}
