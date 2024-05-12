export interface IStakingRule {
  deposit: IAsset[];
  reward: IAsset[];
  content: IAsset[][];
  terms: {
    period: number;
    penalty: number;
    maxStake: number;
    recurrent: boolean;
    advance: boolean;
  };
  active: boolean;
}

export interface IAsset {
  tokenType: number;
  token: string;
  tokenId: bigint;
  amount: bigint;
}
