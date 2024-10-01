import { deployERC721 } from "../../ERC721/shared/fixtures";

export async function deployERC998(name = "ERC998Simple") {
  return deployERC721(name);
}
