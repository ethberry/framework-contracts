import { task } from "hardhat/config";

task("calc-error-id", "Prints Errors enum").setAction(async (args, hre) => {
  // const linkFactory = await hre.ethers.getContractFactory("LinkToken");
  // const linkInstance = await linkFactory.deploy();
  // const linkAddress = await linkInstance.getAddress();
  //
  // const errFactory = await hre.ethers.getContractFactory("VRFCoordinatorV2Mock");
  // const errInstance = await errFactory.deploy(linkAddress);
  const errFactory = await hre.ethers.getContractFactory("ErrorsIdCalculator");
  const errInstance = await errFactory.deploy();

  console.info("export enum CustomErrors {");
  Object.entries(errInstance.interface.fragments.filter(frag => frag.type === "error")).map(([_val, fragment]) =>
    // @ts-ignore
    console.info(`"${hre.ethers.id(`${fragment.name}()`).slice(0, 10)}" = "${fragment.name}",`),
  );
  console.info("}");
});
// "0xd78b7d54" = "UnsupportedTokenType",
// "0x80cb55e2" = "NotActive",
// "0xcd7ee2ee" = "MethodNotSupported",
// "0xf0f16622" = "BalanceExceed",
