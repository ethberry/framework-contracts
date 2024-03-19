import { expect } from "chai";

import { deployContract } from "@gemunion/contracts-mocks";

describe("Rarity", function () {
  const factory = () => deployContract("Dispersion");

  describe("_getDispersion", function () {
    it("should get dispersion (legendary)", async function () {
      const contractInstance = await factory();

      const value = await contractInstance.getDispersion(1 - 1);
      expect(value).to.equal(5);
    });

    it("should get dispersion (epic)", async function () {
      const contractInstance = await factory();

      const value = await contractInstance.getDispersion(4 - 1);
      expect(value).to.equal(4);
    });

    it("should get dispersion (rare)", async function () {
      const contractInstance = await factory();

      const value = await contractInstance.getDispersion(12 - 1);
      expect(value).to.equal(3);
    });

    it("should get dispersion (uncommon)", async function () {
      const contractInstance = await factory();

      const value = await contractInstance.getDispersion(32 - 1);
      expect(value).to.equal(2);
    });

    it("should get dispersion (common)", async function () {
      const contractInstance = await factory();

      const value = await contractInstance.getDispersion(100 - 1);
      expect(value).to.equal(1);
    });
  });
});
