const { expect } = require('chai');
//const { ethers } = require("ethers");
const { ethers, waffle} = require("hardhat");
const { expectRevert, time } = require('@openzeppelin/test-helpers');

describe('Farm contract', () => {
    
    let Elements, elems, Items, items, Marketplace, market, owner, addr1, addr2;
    const provider = waffle.provider;

    beforeEach(async () => {

        [owner, addr1, addr2] = await hre.ethers.getSigners();

        Elements = await hre.ethers.getContractFactory("Elements");
        Items = await hre.ethers.getContractFactory("Items");
        Marketplace = await hre.ethers.getContractFactory("Marketplace");

        elems = await Elements.deploy();
        items = await Items.deploy();        

        market = await Marketplace.deploy(elems.address, items.address);

    });

    describe("Admins func", function () {
        it("Should change auction time", async function () {
            await expect(market.connect(addr1).setAuctionTime(100)).to.be.revertedWith('Caller is not a admin');
            await market.grantRole("0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775", addr1.address);
            await market.connect(addr1).setAuctionTime(100);
            expect(await market.auctionTime()).to.equal("100");
        });

        it("Should change auction min bid", async function () {
            await expect(market.connect(addr1).setMinBid(5)).to.be.revertedWith('Caller is not a admin');
            await market.grantRole("0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775", addr1.address);
            await market.connect(addr1).setMinBid(5);
            expect(await market.bidForEnding()).to.equal("5");
        });
    });

    describe("ERC721", function () {

        it("Should mint item", async function () {
            await elems.grantRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", market.address);
            await expect(market.connect(addr1).mint(elems.address, "link", 1, 1)).to.be.revertedWith('You dont have minter role');
            await elems.grantRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", addr1.address);

            await market.connect(addr1).mint(elems.address, "link", 1, 1);
            expect(await elems.balanceOf(addr1.address)).to.equal("1");
        });

        it("Should list item", async function () {
            await elems.mintNFT(addr1.address, "link");
            await elems.connect(addr1).approve(market.address, 1);

            await expect(market.connect(addr1).listItem(elems.address, 1, 100, 0)).to.be.revertedWith('Error amount');

            await expect(market.connect(addr1).listItem(elems.address, 1, 100, 2)).to.be.revertedWith('Amount should be equal to 1');
            await market.connect(addr1).listItem(elems.address, 1, 100, 1);
            
            expect(await elems.balanceOf(addr1.address)).to.equal("0");
        });

        it("Should cancel after list", async function () {
            await elems.mintNFT(addr1.address, "link");
            await elems.connect(addr1).approve(market.address, 1);
            await market.connect(addr1).listItem(elems.address, 1, 100, 1);

            await expect(market.connect(addr2).cancel(1, 1)).to.be.revertedWith('Only seller can cancel listing');

            await market.connect(addr1).cancel(1, 1);

            await expect(market.connect(addr1).cancel(1, 1)).to.be.revertedWith('Listing is not active');

            expect(await elems.balanceOf(addr1.address)).to.equal("1");
        });

        it("Should buy items", async function () {
            await elems.mintNFT(addr1.address, "link");
            await elems.connect(addr1).approve(market.address, 1);
            
            await market.connect(addr1).listItem(elems.address, 1, 100, 1);
            await expect(market.connect(addr1).buyItem(1, 1, {value: hre.ethers.utils.parseEther("100")})).to.be.revertedWith('Seller cannot be buyer');
            await expect(market.connect(addr2).buyItem(1, 1)).to.be.revertedWith('You dont have enough ETH');

            await market.connect(addr2).buyItem(1, 1, {value: hre.ethers.utils.parseEther("100")});

            expect(await elems.balanceOf(addr2.address)).to.equal("1");

            await expect(market.connect(addr2).buyItem(1, 1, {value: hre.ethers.utils.parseEther("100")})).to.be.revertedWith('Listing is not active');
        });


    });

    describe("ERC721 auction", function () {
        it("Should create auction", async function () {
            await elems.mintNFT(addr1.address, "link");
            await elems.connect(addr1).approve(market.address, 1);

            await expect(market.connect(addr1).listItemOnAuction(elems.address, 1, 100, 0)).to.be.revertedWith('Error amount');

            await market.connect(addr1).listItemOnAuction(elems.address, 1, 10, 1);
            
            expect(await elems.balanceOf(addr1.address)).to.equal("0");
            expect(await elems.balanceOf(market.address)).to.equal("1");
        });

        it("Should make bid", async function () {
            await elems.mintNFT(owner.address, "link");
            await elems.connect(owner).approve(market.address, 1);

            await market.connect(owner).listItemOnAuction(elems.address, 1, 10, 1);
            await market.connect(addr2).makeBid(1, {value: hre.ethers.utils.parseEther("20")});
            await market.connect(addr1).makeBid(1, {value: hre.ethers.utils.parseEther("30")});
            
            expect(await market.getAuctionBid(1)).to.equal("30000000000000000000");
            await market.connect(addr2).withdraw();

        });

        it("Should cancel auction", async function () {
            await elems.mintNFT(addr1.address, "link");
            await elems.connect(addr1).approve(market.address, 1);

            await market.connect(addr1).listItemOnAuction(elems.address, 1, 10, 1);

            await expect(market.connect(addr2).cancelAuction(1)).to.be.revertedWith('Caller is not a seller');

            await market.connect(addr1).cancelAuction(1);
            
            expect(await elems.balanceOf(addr1.address)).to.equal("1");
            expect(await elems.balanceOf(market.address)).to.equal("0");

            await elems.connect(addr1).approve(market.address, 1);
            await market.connect(addr1).listItemOnAuction(elems.address, 1, 10, 1);
            await market.connect(addr2).makeBid(1, {value: hre.ethers.utils.parseEther("20")});
            await expect(market.connect(addr1).cancelAuction(1)).to.be.revertedWith('Bet already placed');
        });

        it("Should finish auction", async function () {
            await elems.mintNFT(owner.address, "link");
            await elems.connect(owner).approve(market.address, 1);

            await market.connect(owner).listItemOnAuction(elems.address, 1, 10, 1);

            await market.connect(addr2).makeBid(1, {value: hre.ethers.utils.parseEther("20")});
            await market.connect(addr1).makeBid(1, {value: hre.ethers.utils.parseEther("30")});
            await market.connect(addr2).makeBid(1, {value: hre.ethers.utils.parseEther("40")});
            await market.connect(addr1).makeBid(1, {value: hre.ethers.utils.parseEther("50")});
            //console.log(await market.connect(addr2).getWithdraw());
            //console.log(await market.connect(addr1).getWithdraw());

            // console.log(await provider.getBalance(owner.address));
            // console.log(await provider.getBalance(addr1.address));
            // console.log(await provider.getBalance(addr2.address));
            // console.log(await provider.getBalance(market.address));
            
            await expect(market.connect(owner).finishAuction(1)).to.be.revertedWith('Auction hasnt ended');

            await time.increase(259300);

            await expect(market.connect(addr2).finishAuction(1)).to.be.revertedWith('Caller is not a seller or buyer');

            await market.connect(addr1).finishAuction(1);

            await market.connect(addr1).withdraw();
            await market.connect(addr2).withdraw();
            await market.connect(owner).withdraw();

            // console.log(await provider.getBalance(owner.address));
            // console.log(await provider.getBalance(addr1.address));
            // console.log(await provider.getBalance(addr2.address));
            // console.log(await provider.getBalance(market.address));
            
            expect(await elems.balanceOf(owner.address)).to.equal("0");
            expect(await elems.balanceOf(addr1.address)).to.equal("1");
        });

        it("Should finish auction with 1 bid", async function () {
            await elems.mintNFT(owner.address, "link");
            await elems.connect(owner).approve(market.address, 1);

            await market.connect(owner).listItemOnAuction(elems.address, 1, 10, 1);

            await market.connect(addr2).makeBid(1, {value: hre.ethers.utils.parseEther("20")});

            await time.increase(259300);

            await market.connect(addr2).finishAuction(1);

            await market.connect(addr2).withdraw();
            
            expect(await elems.balanceOf(owner.address)).to.equal("1");
            expect(await elems.balanceOf(addr2.address)).to.equal("0");
        });

        it("Should finish auction with 0 bid", async function () {
            await elems.mintNFT(owner.address, "link");
            await elems.connect(owner).approve(market.address, 1);

            await market.connect(owner).listItemOnAuction(elems.address, 1, 10, 1);

            await time.increase(259300);

            await market.connect(owner).finishAuction(1);
            
            expect(await elems.balanceOf(owner.address)).to.equal("1");
            expect(await elems.balanceOf(market.address)).to.equal("0");
        });
    });

    describe("ERC1155", function () {

        it("Should mint item", async function () {
            await items.grantRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", market.address);
            await expect(market.connect(addr1).mint(items.address, "", 1, 4)).to.be.revertedWith('You dont have minter role');
            await items.grantRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", addr1.address);

            await market.connect(addr1).mint(items.address, "", 1, 4);
            expect(await items.balanceOf(addr1.address, 1)).to.equal("4");
        });

        it("Should list item", async function () {
            await items.mintNFT(addr1.address, 1, 4);
            await items.connect(addr1).setApprovalForAll(market.address, true);

            await expect(market.connect(addr1).listItem(items.address, 1, 100, 0)).to.be.revertedWith('Error amount');

            await market.connect(addr1).listItem(items.address, 1, 100, 2);

            expect(await items.balanceOf(addr1.address, 1)).to.equal("2");
        });

        it("Should cancel after list", async function () {
            await items.mintNFT(addr1.address, 1, 4);
            await items.connect(addr1).setApprovalForAll(market.address, true);
            await market.connect(addr1).listItem(items.address, 1, 100, 3);

            await expect(market.connect(addr2).cancel(1, 1)).to.be.revertedWith('Only seller can cancel listing');
            await expect(market.connect(addr1).cancel(1, 4)).to.be.revertedWith('Dont have enough tokens');

            await market.connect(addr1).cancel(1, 2);
            expect(await items.balanceOf(addr1.address, 1)).to.equal("3");

            await market.connect(addr1).cancel(1, 1);
            await expect(market.connect(addr1).cancel(1, 1)).to.be.revertedWith('Listing is not active');
        });

        it("Should buy item", async function () {
            await items.mintNFT(addr1.address, 1, 4);
            await items.connect(addr1).setApprovalForAll(market.address, true);

            await expect(market.connect(addr1).listItem(items.address, 1, 100, 0)).to.be.revertedWith('Error amount');

            await market.connect(addr1).listItem(items.address, 1, 100, 2);
            await expect(market.connect(addr1).buyItem(1, 1, {value: hre.ethers.utils.parseEther("100")})).to.be.revertedWith('Seller cannot be buyer');
            await expect(market.connect(addr2).buyItem(1, 1)).to.be.revertedWith('You dont have enough ETH');

            await expect(market.connect(addr2).buyItem(1, 3, {value: hre.ethers.utils.parseEther("300")})).to.be.revertedWith('Dont have enough tokens');
            await market.connect(addr2).buyItem(1, 2, {value: hre.ethers.utils.parseEther("200")});
            expect(await items.balanceOf(addr2.address, 1)).to.equal("2");

            await expect(market.connect(addr2).buyItem(1, 1, {value: hre.ethers.utils.parseEther("100")})).to.be.revertedWith('Listing is not active');
        });

    });

    describe("ERC1155 auction", function () {

        it("Should create auction", async function () {
            await items.mintNFT(addr1.address, 1, 4);
            await items.connect(addr1).setApprovalForAll(market.address, true);

            await expect(market.connect(addr1).listItemOnAuction(items.address, 1, 100, 0)).to.be.revertedWith('Error amount');

            await market.connect(addr1).listItemOnAuction(items.address, 1, 100, 2);

            expect(await items.balanceOf(addr1.address, 1)).to.equal("2");
            expect(await items.balanceOf(market.address, 1)).to.equal("2");
        });

        it("Should cancel auction", async function () {
            await items.mintNFT(addr1.address, 1, 4);
            await items.connect(addr1).setApprovalForAll(market.address, true);

            await market.connect(addr1).listItemOnAuction(items.address, 1, 10, 2);
            await expect(market.connect(addr2).cancelAuction(1)).to.be.revertedWith('Caller is not a seller');
            await market.connect(addr1).cancelAuction(1);

            expect(await items.balanceOf(addr1.address, 1)).to.equal("4");
            expect(await items.balanceOf(market.address, 1)).to.equal("0");

            await items.connect(addr1).setApprovalForAll(market.address, true);
            await market.connect(addr1).listItemOnAuction(items.address, 1, 10, 2);
            await market.connect(addr2).makeBid(1, {value: hre.ethers.utils.parseEther("20")});
            await expect(market.connect(addr1).cancelAuction(1)).to.be.revertedWith('Bet already placed');
        });

        it("Should finish auction", async function () {
            await items.mintNFT(owner.address, 1, 4);
            await items.connect(owner).setApprovalForAll(market.address, true);

            await expect(market.connect(addr1).listItemOnAuction(items.address, 1, 100, 0)).to.be.revertedWith('Error amount');

            await market.connect(owner).listItemOnAuction(items.address, 1, 10, 2);

            await market.connect(addr2).makeBid(1, {value: hre.ethers.utils.parseEther("20")});
            await market.connect(addr1).makeBid(1, {value: hre.ethers.utils.parseEther("30")});
            await market.connect(addr2).makeBid(1, {value: hre.ethers.utils.parseEther("40")});
            await market.connect(addr1).makeBid(1, {value: hre.ethers.utils.parseEther("50")});

            await expect(market.connect(addr1).finishAuction(1)).to.be.revertedWith('Auction hasnt ended');

            await time.increase(259300);

            await expect(market.connect(addr2).finishAuction(1)).to.be.revertedWith('Caller is not a seller or buyer');

            await market.connect(addr1).finishAuction(1);

            await market.connect(addr1).withdraw();
            await market.connect(addr2).withdraw();
            await market.connect(owner).withdraw();

            expect(await items.balanceOf(addr1.address, 1)).to.equal("2");
            expect(await items.balanceOf(owner.address, 1)).to.equal("2");
        });

        it("Should finish auction with 2 bid", async function () {
            await items.mintNFT(owner.address, 1, 4);
            await items.connect(owner).setApprovalForAll(market.address, true);

            await market.connect(owner).listItemOnAuction(items.address, 1, 10, 2);

            
            await market.connect(addr2).makeBid(1, {value: hre.ethers.utils.parseEther("20")});
            await market.connect(addr1).makeBid(1, {value: hre.ethers.utils.parseEther("30")});

            await time.increase(259300);

            await market.connect(addr1).finishAuction(1);

            await market.connect(addr1).withdraw();
            await market.connect(addr2).withdraw();

            expect(await items.balanceOf(owner.address, 1)).to.equal("4");
            expect(await items.balanceOf(market.address, 1)).to.equal("0");
        });

        it("Should finish auction with 0 bid", async function () {
            await items.mintNFT(owner.address, 1, 4);
            await items.connect(owner).setApprovalForAll(market.address, true);

            await market.connect(owner).listItemOnAuction(items.address, 1, 10, 2);

            await time.increase(259300);

            await market.connect(owner).finishAuction(1);

            expect(await items.balanceOf(owner.address, 1)).to.equal("4");
            expect(await items.balanceOf(market.address, 1)).to.equal("0");
        });

    });

});