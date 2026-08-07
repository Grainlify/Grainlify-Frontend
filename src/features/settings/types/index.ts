// Tab types
export type SettingsTabType = 'profile' | 'notifications' | 'referrals' | 'rewards' | 'payout' | 'billing' | 'terms';

// Billing Profile types
export type BillingProfileStatus = 'verified' | 'missing-verification' | 'limit-reached';
export type BillingProfileType = 'individual' | 'self-employed' | 'organization';
export type ProfileDetailTabType = 'general' | 'payment' | 'invoices';

export interface BillingProfile {
  id: number;
  name: string;
  type: BillingProfileType;
  status: BillingProfileStatus;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  paymentMethods?: PaymentMethod[];
  invoices?: Invoice[];
}

// Payment Method types
export type CryptoType = 'usdc' | 'usdt' | 'xlm';
export type EcosystemType = 'stellar';

export interface PaymentMethod {
  id: number;
  ecosystem: EcosystemType;
  cryptoType: CryptoType;
  walletAddress: string;
  isDefault: boolean;
  createdAt: string;
}

// Invoice types
export type InvoiceStatus = 'paid' | 'pending' | 'overdue';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  description: string;
  billingPeriod: string;
}

// Payout types
export interface PayoutProject {
  id: number;
  initial: string;
  name: string;
  billingProfile: string | null;
}

// Notification types live in shared/api/client.ts (NotificationPreference) -
// preferences are a dynamic list keyed by backend notification type, not a
// fixed set of named boolean fields.

// Wallet types
export interface TokenWallets {
  usdc: string;
  usdt: string;
  xlm?: string;
}

export interface WalletAddresses {
  stellar: {
    usdc: string;
    usdt: string;
    xlm: string;
  };
}