export interface IBlockchainAsset {
  tokenType: number;
  token: string;
  tokenId: number;
  amount: number;
}

export interface IStakingRule {
  deposit: IBlockchainAsset[];
  reward: IBlockchainAsset[];
  content: IBlockchainAsset[][];
  terms: {
    period: number;
    penalty: number;
    maxStake: number;
    recurrent: boolean;
    advance: boolean;
  };
  active: boolean;
}
