import { BaseContract, Signer } from "ethers";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

export const customMintConsecutive = (
  contractInstance: any,
  signer: Signer,
  receiver: SignerWithAddress | BaseContract | string,
  tokenId: bigint,
) => {
  return contractInstance.connect(signer).mintConsecutive(receiver, tokenId) as Promise<any>;
};
