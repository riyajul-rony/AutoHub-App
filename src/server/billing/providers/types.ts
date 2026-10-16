export interface CheckoutSessionOptions {
  userId: string;
  userEmail: string;
  userName?: string;
  planId: string;
  planSlug: string;
  planName: string;
  amount: number;
  currency: string;
  interval: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  sessionId: string;
  checkoutUrl?: string;
  provider: string;
  instructionHtml?: string;
  invoiceNumber?: string;
}

export interface WebhookResult {
  handled: boolean;
  eventType: string;
  eventId: string;
  subscriptionId?: string;
  userId?: string;
  paymentId?: string;
  status?: string;
  amount?: number;
  currency?: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly name: string;

  /**
   * Initialize a checkout session or pending payment for a plan
   */
  createCheckout(options: CheckoutSessionOptions): Promise<CheckoutResult>;

  /**
   * Handle incoming provider webhook with raw body verification
   */
  handleWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookResult>;

  /**
   * Cancel an active recurring subscription with the provider
   */
  cancelSubscription(providerSubscriptionId: string): Promise<boolean>;
}
