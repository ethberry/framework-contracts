export interface IBlockchainAsset {
  tokenType: number;
  token: string;
  tokenId: number;
  amount: number;
}

export interface IRule {
  deposit: IBlockchainAsset;
  reward: IBlockchainAsset;
  terms: {
    period: number;
    penalty: number;
    maxCycles: number;
  };
  active: boolean;
}
