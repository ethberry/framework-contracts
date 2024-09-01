import { task } from "hardhat/config";

task("calc-error-id", "Prints Errors enum").setAction(async (args, hre) => {
  const errFactory = await hre.ethers.getContractFactory("ErrorsIdCalculator");
  const errInstance = await errFactory.deploy();

  // used in eth-hooks
  console.info("export enum CustomErrors {");
  Object.entries(errInstance.interface.fragments.filter(frag => frag.type === "error")).map(([_val, fragment]) =>
    // @ts-ignore
    console.info(`"${hre.ethers.id(`${fragment.name}()`).slice(0, 10)}" = "${fragment.name}",`),
  );
  console.info("}");
});

// hardhat calc-error-id
