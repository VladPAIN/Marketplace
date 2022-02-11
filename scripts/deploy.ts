const hre = require("hardhat");

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  //Token ERC721
  // const Elems = await hre.ethers.getContractFactory("Elements");
  // const elems = await Elems.deploy();
  // await elems.deployed();
  // console.log("ERC721 contracts:", elems.address);

  // //Token ERC1155
  // const Items = await hre.ethers.getContractFactory("Items");
  // const items = await Items.deploy();
  // await items.deployed();
  // console.log("ERC1155 contracts:", items.address);

  //Marketplace
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const market = await Marketplace.deploy(process.env.ELEMS_ERC721_ADDRESS, process.env.ITEMS_ERC1155_ADDRESS);
  await market.deployed();
  console.log("Market contracts:", market.address);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });