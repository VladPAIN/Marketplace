const { expect } = require('chai');

describe('Farm contract', () => {
    
    let Elems, elems, Items, items, Marketplace, market, owner, addr1, addr2;

    beforeEach(async () => {
        Elems = await hre.ethers.getContractFactory("Elems");
        Items = await hre.ethers.getContractFactory("Items");
        Marketplace = await hre.ethers.getContractFactory("Marketplace");

        elems = await Elems.deploy();
        items = await Items.deploy();
        market = await Marketplace.deploy();

        [owner, addr1, addr2] = await hre.ethers.getSigners();


    });

    describe("ERC721", function () {

        it("Should list item", async function () {
            await elems.mintNFT(addr1.address, "link");
            await elems.connect(addr1).approve(market.address, 1);

            await expect(market.connect(addr1).listItem(elems.address, 1, 100, 0)).to.be.revertedWith('Error amount');

            await market.connect(addr1).listItem(elems.address, 1, 100, 1);
            
            expect(await elems.balanceOf(addr1.address)).to.equal("0");
        });

        it("Should cancel after list", async function () {
            await elems.mintNFT(addr1.address, "link");
            await elems.connect(addr1).approve(market.address, 1);
            await market.connect(addr1).listItem(elems.address, 1, 100, 1);

            await expect(market.connect(addr2).cancel(elems.address, 1, 1)).to.be.revertedWith('Only seller can cancel listing');

            await market.connect(addr1).cancel(elems.address, 1, 1);

            await expect(market.connect(addr1).cancel(elems.address, 1, 1)).to.be.revertedWith('Listing is not active');

            expect(await elems.balanceOf(addr1.address)).to.equal("1");
        });

        // it("Should buy items", async function () {
        //     await elems.mintNFT(addr1.address, "link");
        //     await elems.connect(addr1).approve(market.address, 1);
        //     await market.connect(addr1).listItem(elems.address, 1, 100, 1);
        //     await market.connect(addr2).buyItem(elems.address, 1, 1);

        //     expect(await elems.balanceOf(addr2.address)).to.equal("1");
        // });


    });

    describe("ERC1155", function () {

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

            await expect(market.connect(addr2).cancel(items.address, 1, 1)).to.be.revertedWith('Only seller can cancel listing');
            await expect(market.connect(addr1).cancel(items.address, 1, 4)).to.be.revertedWith('Dont have enough tokens');

            await market.connect(addr1).cancel(items.address, 1, 2);
            expect(await items.balanceOf(addr1.address, 1)).to.equal("3");

            await market.connect(addr1).cancel(items.address, 1, 1);
            await expect(market.connect(addr1).cancel(items.address, 1, 1)).to.be.revertedWith('Listing is not active');
        });

    });

});