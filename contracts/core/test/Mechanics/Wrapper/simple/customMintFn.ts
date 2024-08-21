import { BaseContract, Signer, ZeroAddress } from "ethers";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { amount } from "@gemunion/contracts-constants";

import { templateId } from "../../../constants";

export async function customMintBoxERC721(
  contractInstance: any,
  signer: Signer,
  receiver: SignerWithAddress | BaseContract | string,
) {
  const content = [
    {
      tokenType: 0,
      token: ZeroAddress,
      tokenId: 0,
      amount,
    },
  ];
  return contractInstance.connect(signer).mintBox(receiver, templateId, content, { value: amount }) as Promise<any>;
}
