import { task } from "hardhat/config";

task("calc-interface-id", "Prints interface enum").setAction(async (args, hre) => {
  const errFactory = await hre.ethers.getContractFactory("InterfaceIdCalculator");
  const errInstance = await errFactory.deploy();
  await errInstance.test();
});
// 0xbf290e49
// 0x1b7abe93
// 0x32034d27
// 0xf0f47261
// 0x358f9be9
// 0xe58a4fe8
// 0x1f120210
