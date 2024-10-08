export enum TokenMetadata {
  TEMPLATE_ID = "TEMPLATE_ID",
  LEVEL = "LEVEL",
  RARITY = "RARITY",
  TRAITS = "TRAITS",
  GENES = "GENES",
  ROUND = "ROUND",
  NUMBERS = "NUMBERS",
  PRIZE = "PRIZE",
}

export enum GenesTokenMetadata {
  GENES = "GENES",
  MOTHER_ID = "MOTHER_ID",
  FATHER_ID = "FATHER_ID",
  PREGNANCY_TIMESTAMP = "PREGNANCY_TIMESTAMP",
  PREGNANCY_COUNTER = "PREGNANCY_COUNTER",
}

export enum TokenType {
  NATIVE = "0",
  ERC20 = "1",
  ERC721 = "2",
  ERC998 = "3",
  ERC1155 = "4"
}
