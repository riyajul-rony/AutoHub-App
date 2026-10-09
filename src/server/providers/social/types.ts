export type SocialAccountRecord = {
  id: string;
  user_id: string;
  provider: "facebook" | "instagram" | "linkedin";
  external_id: string;
  display_name: string | null;
  picture_url: string | null;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  token_expires_at: Date | null;
  scopes: string[];
  status: "active" | "needs_reconnect" | "disabled";
};

export type ConnectedAccount = {
  externalId: string;
  displayName: string;
  pictureUrl?: string;
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
  scopes: string[];
};

export type PostContent = {
  caption: string;
  imageUrl?: string;
  imageBuffer?: Buffer;
};

export type PublishResult = {
  externalId: string;
  url?: string;
};

export interface SocialProvider {
  id: "facebook" | "instagram" | "linkedin";
  limits: {
    captionMax: number;
    hashtagsMax?: number;
    aspectRatios: string[];
  };
  getAuthUrl(state: string, redirectUri: string): string;
  handleCallback(code: string, redirectUri: string): Promise<ConnectedAccount[]>;
  publish(accountToken: string, externalId: string, post: PostContent): Promise<PublishResult>;
}
