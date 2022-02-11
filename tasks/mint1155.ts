import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-web3";

task("mint1155", "Mint")
    .addParam("tokenid", "Token id")
    .addParam("amount", "Amount tokens")
    .setAction(async (args) => {

        const market = await hre.ethers.getContractAt("Marketplace", process.env.MARKET_ADDRESS);
        await (await market.mint(process.env.ITEMS_ERC1155_ADDRESS, "", args.tokenid, args.amount)).wait()
        console.log("You are mint NFT");
 
    });

export default  {};