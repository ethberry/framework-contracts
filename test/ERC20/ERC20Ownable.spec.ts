import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { InterfaceId } from "@ethberry/contracts-constants";
import { shouldBehaveLikeOwnable } from "@ethberry/contracts-access";

import { shouldBehaveLikeERC20Simple } from "./shared/simple";
import { deployERC1363 } from "./shared/fixtures";

describe("ERC20Ownable", function () {
  const factory = () => deployERC1363(this.title);

  shouldBehaveLikeOwnable(factory);
  shouldBehaveLikeERC20Simple(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IERC20,
    InterfaceId.IERC1363,
    InterfaceId.IERC20Metadata,
  ]);
});
