import { task } from "hardhat/config";
import { toUtf8Bytes, zeroPadValue } from "ethers";

task("calc-string-hash", "Prints Errors enum").setAction(async (args, hre) => {
  const errFactory = await hre.ethers.getContractFactory("StringHashCalculator");
  const errInstance = await errFactory.deploy();
  await errInstance.test();
  console.log("---");
  console.log(zeroPadValue(toUtf8Bytes("GENES"), 32));
  console.log(zeroPadValue(toUtf8Bytes("MOTHER_ID"), 32));
  console.log(zeroPadValue(toUtf8Bytes("FATHER_ID"), 32));
  console.log(zeroPadValue(toUtf8Bytes("PREGNANCY_COUNTER"), 32));
  console.log(zeroPadValue(toUtf8Bytes("PREGNANCY_TIMESTAMP"), 32));
  console.log(zeroPadValue(toUtf8Bytes("TRAITS"), 32));
});
