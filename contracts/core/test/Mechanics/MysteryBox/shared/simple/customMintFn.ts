import { BaseContract, Signer, ZeroAddress } from "ethers";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { amount } from "@gemunion/contracts-constants";

import { templateId } from "../../../../constants";

export const customMint = (
  contractInstance: any,
  signer: Signer,
  receiver: SignerWithAddress | BaseContract | string,
) => {
  return contractInstance.connect(signer).mintBox(receiver, templateId, [
    {
      tokenType: 0,
      token: ZeroAddress,
      tokenId: templateId,
      amount,
    },
  ]) as Promise<any>;
};
