import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@ethberry/contracts-constants";
import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";

import { FrameworkInterfaceId, tokenId } from "../../constants";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { customMintBoxERC721 } from "./simple/customMintFn";
import { shouldBehaveLikeERC721WrapperBox } from "./simple/base";

describe("Wrapper", function () {
  const factory = () => deployERC721("ERC721Wrapper");

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);
  shouldBehaveLikeERC721Simple(factory, { mint: customMintBoxERC721, safeMint: customMintBoxERC721, tokenId });
  shouldBehaveLikeERC721WrapperBox(factory);
  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC1155Receiver,
    InterfaceId.IERC721Metadata,
    InterfaceId.IERC721Enumerable,
    InterfaceId.IRoyalty,
    InterfaceId.IERC1155Receiver,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});
