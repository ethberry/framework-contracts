import { BaseContract, Contract, FunctionFragment, Interface } from "ethers";

export const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };

// get all function selectors from ABI
export function getSelectors(contract: BaseContract | Contract, options: Record<string, any> = {}): any[] {
  const { logSelectors } = options;
  const selectors: Array<string> = [];
  contract.interface.forEachFunction((func: FunctionFragment) => {
    if (
      func.name !== "init" &&
      func.name !== "eip712Domain"
      // func.name !== "addFactory" &&
      // func.name !== "removeFactory" &&
      // func.name !== "getManipulators" &&
      // func.name !== "getMinters"
    ) {
      selectors.push(func.selector);
    }
    if (logSelectors) console.info([func.name], func.selector);
  });

  // (selectors as any).contract = contract;
  // (selectors as any).remove = remove;
  // (selectors as any).get = get;
  return selectors;
}

// get function selector from function signature
export function getSelector(func: string): any {
  const abiInterface = new Interface([func]);
  const abiFunction = abiInterface.getFunction(func);
  return abiFunction?.selector || null;
}

// used with getSelectors to remove selectors from an array of selectors
// functionNames argument is an array of function signatures
export function remove(this: any, functionNames: string[]): any[] {
  // (selectors as any).contract = this.contract;
  // (selectors as any).remove = this.remove;
  // (selectors as any).get = this.get;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return this.filter((v: string) => {
    for (const functionName of functionNames) {
      if (v === this.contract.interface.getSighash(functionName)) {
        return false;
      }
    }
    return true;
  });
}

// used with getSelectors to get selectors from an array of selectors
// functionNames argument is an array of function signatures
export function get(this: any, functionNames: string[]): any[] {
  // (selectors as any).contract = this.contract;
  // (selectors as any).remove = this.remove;
  // (selectors as any).get = this.get;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return this.filter((v: string) => {
    for (const functionName of functionNames) {
      if (v === this.contract.interface.getSighash(functionName)) {
        return true;
      }
    }
    return false;
  });
}

// remove selectors using an array of signatures
export function removeSelectors(selectors: string[], signatures: string[]): string[] {
  const iface = new Interface(signatures.map(v => "function " + v));
  // const removeSelectors = signatures.map(v => iface.getSighash(v)); ethers v5
  const removeSelectors = signatures.map(v => iface.getFunction(v)?.selector);
  selectors = selectors.filter(v => !removeSelectors.includes(v));
  return selectors;
}

// find a particular address position in the return value of diamondLoupeFacet.facets()
export function findAddressPositionInFacets(facetAddress: string, facets: any[]): number | undefined {
  for (let i = 0; i < facets.length; i++) {
    if (facets[i].facetAddress === facetAddress) {
      return i;
    }
  }
  return undefined;
}

// Uncomment the export statements below if you want to export the functions
// exports.getSelectors = getSelectors;
// exports.getSelector = getSelector;
// exports.FacetCutAction = FacetCutAction;
// exports.remove = remove;
// exports.removeSelectors = removeSelectors;
// exports.findAddressPositionInFacets = findAddressPositionInFacets;
