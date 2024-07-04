import { expect } from "chai";

import { deployPaymentSplitter } from "./fixture";
import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { InterfaceId } from "@gemunion/contracts-constants";

describe("PaymentSplitter", function () {
  const factory = () => deployPaymentSplitter();

  shouldSupportsInterface(factory)([InterfaceId.IERC165, InterfaceId.IERC1363Receiver, InterfaceId.IERC1363Spender]);

  describe("totalShares", function () {
    it("should get total shares", async function () {
      const contractInstance = await deployPaymentSplitter();

      const totalShares = await contractInstance.totalShares();
      expect(totalShares).to.equal(100);
    });
  });
});
