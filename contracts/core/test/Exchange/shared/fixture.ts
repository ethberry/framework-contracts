import { ethers, network } from "hardhat";

import {
  amount,
  baseTokenURI,
  METADATA_ROLE,
  MINTER_ROLE,
  royalty,
  tokenName,
  tokenSymbol,
} from "@gemunion/contracts-constants";
import { getContractName } from "../../utils";

export async function deployErc20Base(name: string, exchangeInstance: any): Promise<any> {
  const erc20Factory = await ethers.getContractFactory(name);
  const erc20Instance: any = await erc20Factory.deploy(tokenName, tokenSymbol, amount * 10n);
  await erc20Instance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return erc20Instance;
}

export async function deployErc721Base(name: string, exchangeInstance: any): Promise<any> {
  const erc721Factory = await ethers.getContractFactory(getContractName(name, network.name));
  const erc721Instance: any = await erc721Factory.deploy(tokenName, tokenSymbol, royalty, baseTokenURI);
  await erc721Instance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
  await erc721Instance.grantRole(METADATA_ROLE, await exchangeInstance.getAddress());

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return erc721Instance;
}

export async function deployErc998Base(name: string, exchangeInstance: any): Promise<any> {
  const erc998Factory = await ethers.getContractFactory(getContractName(name, network.name));
  const erc998Instance: any = await erc998Factory.deploy(tokenName, tokenSymbol, royalty, baseTokenURI);
  await erc998Instance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
  await erc998Instance.grantRole(METADATA_ROLE, await exchangeInstance.getAddress());

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return erc998Instance;
}

export async function deployErc1155Base(name: string, exchangeInstance: any): Promise<any> {
  const erc1155Factory = await ethers.getContractFactory(name);
  const erc1155Instance: any = await erc1155Factory.deploy(royalty, baseTokenURI);
  await erc1155Instance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return erc1155Instance;
}
