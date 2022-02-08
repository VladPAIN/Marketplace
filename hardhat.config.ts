import '@nomiclabs/hardhat-waffle';
import "@nomiclabs/hardhat-etherscan";
import 'solidity-coverage';
import 'dotenv/config';
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-ethers";

//import "./tasks/index";

export default {
  solidity: "0.8.10",
  networks: {
    rinkeby: {
      url: `${process.env.RINKEBY_API_KEY}`,
      accounts: [`${process.env.PRIVATE_KEY}`]
    }
  },
  etherscan: {
    apiKey: `${process.env.YOUR_ETHERSCAN_API_KEY}`
  }
};