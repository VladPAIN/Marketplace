// import "@nomiclabs/hardhat-ethers";
// import { task } from "hardhat/config";
// import "@nomiclabs/hardhat-web3";

// task("mint721", "Mint")
//     .addParam("to", "Address")
//     .addParam("url", "tokenURI")
//     .setAction(async (args) => {

//         const elems = await hre.ethers.getContractAt("Elems", process.env.ELEMS_ADDRESS);
//         await (await elems.mintNFT(args.to, args.url)).wait()
//         console.log("You are mint NFT");
 
//     });

// export default  {};