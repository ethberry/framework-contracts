import { expect } from "chai";
import { BaseContract, Signer } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { amount } from "@ethberry/contracts-constants";

export const customMint = async (
  contractInstance: any,
  signer: Signer,
  receiver: SignerWithAddress | BaseContract | string,
  value = amount,
): Promise<any> => {
  const tx = contractInstance.whitelist(receiver);
  await expect(tx).to.emit(contractInstance, "Whitelisted").withArgs(receiver);
  return contractInstance.connect(signer).mint(receiver, value) as Promise<any>;
};
