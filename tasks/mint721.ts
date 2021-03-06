import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-web3";

task("mint721", "Mint")
    .addParam("url", "tokenURI")
    .setAction(async (args) => {

        const market = await hre.ethers.getContractAt("Marketplace", process.env.MARKET_ADDRESS);
        await (await market.mint(process.env.ELEMS_ERC721_ADDRESS, args.url, 1, 1)).wait()
        console.log("You are mint NFT");
 
    });

export default  {};