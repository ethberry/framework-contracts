import { expect } from "chai";
import { BaseContract, Signer } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { shouldBehaveLikeAccessControl, shouldBehaveLikeWhiteList } from "@gemunion/contracts-access";
import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { amount, DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@gemunion/contracts-constants";

import { deployERC1363 } from "./shared/fixtures";
import { shouldWhiteList } from "./shared/whitelist/whitelist";
import { shouldBehaveLikeERC20Whitelist } from "./shared/whitelist";

const getAddress = async (receiver: SignerWithAddress | BaseContract | string) => {
  if (receiver instanceof SignerWithAddress) {
    return receiver.address;
  } else if (receiver instanceof BaseContract) {
    return receiver.getAddress();
  }
  return receiver;
};

const customMint = async (
  contractInstance: any,
  signer: Signer,
  receiver: SignerWithAddress | BaseContract | string,
  value = amount,
): Promise<any> => {
  const tx = contractInstance.whitelist(receiver);
  await expect(tx)
    .to.emit(contractInstance, "Whitelisted")
    .withArgs(await getAddress(receiver));
  return contractInstance.connect(signer).mint(receiver, value) as Promise<any>;
};

describe("ERC20Whitelist", function () {
  const factory = () => deployERC1363(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);
  shouldBehaveLikeWhiteList(factory);
  shouldWhiteList(factory);

  shouldBehaveLikeERC20Whitelist(factory, {
    mint: customMint,
  });

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC20,
    InterfaceId.IERC1363,
  ]);
});
