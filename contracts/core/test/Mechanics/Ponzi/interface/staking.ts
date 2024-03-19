export interface IRule {
  deposit: IAsset;
  reward: IAsset;
  terms: {
    period: number;
    penalty: number;
    maxCycles: number;
  };
  active: boolean;
}

export interface IAsset {
  tokenType: number;
  token: string;
  tokenId: number;
  amount: number;
}
