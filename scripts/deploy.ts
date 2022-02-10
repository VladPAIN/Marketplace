const hre = require("hardhat");

async function main() {

  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  //Token ERC721
  const Elems = await hre.ethers.getContractFactory("Elements");
  const elems = await Elems.deploy();
  await elems.deployed();
  console.log("Token1 contracts:", elems.address);

  //Token ERC1155
  const Items = await hre.ethers.getContractFactory("Items");
  const items = await Items.deploy();
  await items.deployed();
  console.log("Token1 contracts:", items.address);

  //Marketplace
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const market = await Marketplace.deploy();
  await market.deployed();
  console.log("Token1 contracts:", market.address);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });