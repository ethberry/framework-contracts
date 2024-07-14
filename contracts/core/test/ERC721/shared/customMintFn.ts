import { BaseContract, Signer, ZeroAddress } from "ethers";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { amount } from "@gemunion/contracts-constants";

import { templateId } from "../../constants";

export async function customMintCommonERC721(
  contractInstance: any,
  signer: Signer,
  receiver: SignerWithAddress | BaseContract | string,
) {
  return contractInstance.connect(signer).mintCommon(receiver, templateId) as Promise<any>;
}
