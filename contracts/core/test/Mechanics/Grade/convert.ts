import { expect } from "chai";
import { stripZerosLeft, toUtf8Bytes, toUtf8String, zeroPadValue } from "ethers";

describe("upgrade", function () {
  it("should convert string", function () {
    const bytes32 = zeroPadValue(toUtf8Bytes("A"), 32);
    expect(bytes32).to.equal("0x0000000000000000000000000000000000000000000000000000000000000041");
  });

  it("should convert string that starts with zero", function () {
    const bytes32 = zeroPadValue(toUtf8Bytes("0A"), 32);
    expect(bytes32).to.equal("0x0000000000000000000000000000000000000000000000000000000000003041");
  });

  it("should convert long string", function () {
    const bytes32 = zeroPadValue(toUtf8Bytes("@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_"), 32);
    expect(bytes32).to.equal("0x404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f");
  });

  it("should decode without null termination characters", function () {
    const bytes32 = toUtf8String(stripZerosLeft("0x0000000000000000000000000000000000000000000000000000000000003041"));
    expect(bytes32).to.equal("0A");
  });

  it("should convert decode", function () {
    const bytes32 = toUtf8String(stripZerosLeft("0x404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f"));
    expect(bytes32).to.equal("@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_");
  });
});
