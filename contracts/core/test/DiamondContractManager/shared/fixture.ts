import { ethers } from "hardhat";
import { FacetCutAction, getSelectors } from "../../shared/diamond";
import { BaseContract } from "ethers";

export async function deployDiamond(
  DiamondName = "Diamond",
  FacetNames: Array<string>,
  InitContractName: string,
  options?: Record<string, any>,
): Promise<BaseContract> {
  const { log, logSelectors } = options || {};
  const [owner] = await ethers.getSigners();

  // deploy DiamondCutFacet
  const diamondCutFacetFactory = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await diamondCutFacetFactory.deploy();
  await diamondCutFacet.waitForDeployment();
  if (log) console.info("DiamondCutFacet deployed:", await diamondCutFacet.getAddress());

  // deploy Diamond
  const diamondFactory = await ethers.getContractFactory(DiamondName);
  const diamond = await diamondFactory.deploy(owner.address, await diamondCutFacet.getAddress());
  await diamond.waitForDeployment();
  if (log) console.info("Diamond deployed:", await diamond.getAddress());

  // deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  // * diamondInit
  const diamondInitFactory = await ethers.getContractFactory(InitContractName);
  const diamondInit = await diamondInitFactory.deploy();
  await diamondInit.waitForDeployment();
  // if (log) console.info("DiamondInit deployed:", diamondInit.address);

  // * deploy facets
  if (log) console.info("");
  if (log) console.info("Deploying facets");

  const cut = [];
  for (const FacetName of FacetNames) {
    const facetFactory = await ethers.getContractFactory(FacetName);
    const facet = await facetFactory.deploy();
    await facet.waitForDeployment();
    if (log) console.info(`${FacetName} deployed: ${await facet.getAddress()}`);
    cut.push({
      facetAddress: await facet.getAddress(),
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet, { logSelectors }),
    });
  }

  // cut Facets & Init
  if (log) console.info("");
  if (log) console.info("Diamond Cut:", cut);
  const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
  // upgrade diamond with facets & call to init function
  const functionCall = diamondInit.interface.encodeFunctionData("init");
  const tx = await diamondCut.diamondCut(cut, await diamondInit.getAddress(), functionCall);
  // const tx = await diamondCut.diamondCut(cut, constants.AddressZero, "0x");
  if (log) console.info("Diamond cut tx: ", tx.hash);
  const receipt = await tx.wait();
  if (!receipt?.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  if (log) console.info("Completed diamond cut");
  return diamond;
}
