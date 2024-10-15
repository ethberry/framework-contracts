import { task } from "hardhat/config";
import { id } from "ethers";

task("calc-error-id", "Prints Errors enum").setAction(async (_, hre) => {
  const errFactory = await hre.ethers.getContractFactory("ErrorsIdCalculator");
  const errInstance = await errFactory.deploy();

  // used in eth-hooks
  console.info("export enum CustomErrors {");
  Object.entries(errInstance.interface.fragments.filter(frag => frag.type === "error")).map(([_val, fragment]) =>
    // @ts-ignore
    console.log(`"${id(`${fragment.name}(${fragment.inputs.map(i => i.type).join(",")})`).slice(0, 10)}" = "${fragment.name}",`,),
  );
  console.info("}");
});

// hardhat calc-error-id
