export interface MarketAccount {
  florins: number;
  revision: number;
  honorMarks: number;
  bondingSeals: number;
  gear: Record<string, number>;
}

export interface BazaarListing {
  id: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  priceFlorins: number;
  canCancel?: boolean;
}

export const STARTING_MARKET_FLORINS = 220;
