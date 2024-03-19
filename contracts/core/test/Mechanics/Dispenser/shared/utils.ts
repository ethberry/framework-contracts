import { TransactionResponse } from "ethers";

export async function checkIfInLogs(
  tx: Promise<TransactionResponse>,
  contractInstance: any,
  eventName: string,
  args: Array<any>,
) {
  const receipt = await (await tx).wait();
  for (const log of receipt!.logs) {
    const parseLog = contractInstance.interface.parseLog(log);

    // Args.length have to be equal to Log.args.length
    if (parseLog.name === eventName && args.length === parseLog.args.length) {
      let count = 0;
      // Check all args with Log.args, and calculate matches
      for (let i = 0; i < args.length; i++) {
        // If log.arg is BigNumber
        // TODO fixme
        if (parseLog.args[i]) {
          if (Number(parseLog.args[i]) !== args[i]) {
            // If values are not equal break for
            break;
          }
        } else if (parseLog.args[i] !== args[i]) {
          // If values are not equal break for
          break;
        }
        // arg === log.arg
        count++;
      }
      // if count === args.length: this is the log that we was looking for
      if (count === args.length) {
        return true;
      }
    }
  }
  // Don't find log by EventName and args
  return false;
}
