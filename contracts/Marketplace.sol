pragma solidity ^0.8.10;

import "./ERC721.sol";
import "./ERC1155.sol";


contract Marketplace is AccessControl {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    bytes4 private constant ERC721_INTERFACE = 0x80ac58cd;
    bytes4 private constant ERC1155_INTERFACE = 0xd9b67a26;

    enum OfferStatus { Active, Sold, Cancel }
    enum TokenStandart { ERC721, ERC1155 }

    uint256 _tokensIdOnSale;
    uint256 _auctionId;
    uint256 public auctionTime = 259200;
    uint256 public bidForEnding = 3;

    struct Listing {
        OfferStatus status;
        TokenStandart standart;
        address seller;
        address token;
        uint256 tokenId;
        uint256 price;
        uint256 amount;
    }

    struct Auction {
        OfferStatus auctionStatus;
        TokenStandart standart;
        address seller;
        address token;
        address buyer;
        uint256 tokenId;
        uint256 startPrice;
        uint256 amount;
        uint256 bid;
        uint256 numBid;
        uint256 startTime;
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Auction) public auctions;
    mapping(address => uint256) pendingReturns;

    event ListToken(uint256 listedTokenId, address seller, address token, uint256 tokenId, uint256 price, uint256 amount);
    event BuyToken(uint256 listedTokenId, address buyer, address token, uint256 tokenId, uint256 price, uint256 amount);
    event Cancel(address seller, uint256 tokenId, uint256 amount);

    event CreateAuction(uint256 auctionNumber, address seller, address token, uint256 tokenId, uint256 startPrice, uint256 amount, uint256 startTime);
    event MakeBid(uint256 auctionNumber, address buyer, uint256 newPrice, uint256 numBid);
    event CancelAuction(address seller, uint tokenId, uint amount);

    Elements public elemERC721;
    Items public itemsERC1155;

    constructor(address _elemERC721, address _itemsERC1155) {

        elemERC721 = Elements(_elemERC721);
        itemsERC1155 = Items(_itemsERC1155);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);

    }

    function mint(address token, string memory tokenURI, uint256 tokenId, uint256 amount) public {
        if(IERC165(token).supportsInterface(ERC721_INTERFACE)) {
            require(elemERC721.hasRole(MINTER_ROLE, msg.sender), "You dont have minter role");
            elemERC721.mintNFT(msg.sender, tokenURI);
        }

        else if(IERC165(token).supportsInterface(ERC1155_INTERFACE)) {
            require(itemsERC1155.hasRole(MINTER_ROLE, msg.sender), "You dont have minter role");
            itemsERC1155.mintNFT(msg.sender, tokenId, amount);
        }

        else {
            revert("Wrong address");
        }
    }

    function setAuctionTime(uint256 newAuctionTime) public returns(bool) {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        auctionTime = newAuctionTime;
        return true;
    }

    function setMinBid(uint256 minBid) public returns(bool) {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not a admin");
        bidForEnding = minBid;
        return true;
    }

    function listItem(address token, uint256 tokenId, uint256 price, uint256 amount) external {

        require(amount >= 1, "Error amount");

        _tokensIdOnSale++;

        if(IERC165(token).supportsInterface(ERC721_INTERFACE)) {
            require(amount == 1, "Amount should be equal to 1");
            ERC721(token).safeTransferFrom(msg.sender, address(this), tokenId);

            listings[_tokensIdOnSale] = Listing(OfferStatus.Active, TokenStandart.ERC721, msg.sender, token, tokenId, price, 1);
        }

        else if(IERC165(token).supportsInterface(ERC1155_INTERFACE)) {
            ERC1155(token).safeTransferFrom(msg.sender, address(this), tokenId, amount, '0x');

            listings[_tokensIdOnSale] = Listing(OfferStatus.Active, TokenStandart.ERC1155, msg.sender, token, tokenId, price, amount);
        }

        else {
            revert("Wrong address");
        }

        emit ListToken(_tokensIdOnSale, msg.sender, token, tokenId, price, amount);

    }

    function _safeTransferETH(address to, uint256 value) internal returns (bool) {
        (bool success, ) = to.call{value: value}(new bytes(0));
        return success;
    }

    function buyItem(uint256 listedTokenId, uint256 amountTokens) external payable {

        require(msg.sender != listings[listedTokenId].seller, "Seller cannot be buyer");
		require(listings[listedTokenId].status == OfferStatus.Active, "Listing is not active");
        require(listings[listedTokenId].amount >= amountTokens, "Dont have enough tokens");
        require(msg.value >= listings[listedTokenId].price*amountTokens, "You dont have enough ETH");

        if(listings[listedTokenId].standart == TokenStandart.ERC721) {
            listings[listedTokenId].status = OfferStatus.Sold;

            IERC721(listings[listedTokenId].token).safeTransferFrom(address(this), msg.sender, listings[listedTokenId].tokenId);
        }

        else if(listings[listedTokenId].standart == TokenStandart.ERC1155) {
            if((listings[listedTokenId].amount - amountTokens) == 0) { listings[listedTokenId].status = OfferStatus.Sold; }

            IERC1155(listings[listedTokenId].token).safeTransferFrom(address(this), msg.sender, listings[listedTokenId].tokenId, amountTokens, '0x');
        }

        emit BuyToken(listedTokenId, msg.sender, listings[listedTokenId].token, listings[listedTokenId].tokenId, listings[listedTokenId].price, amountTokens);

    }

    function cancel(uint256 listedTokenId, uint256 amountTokens) public {
        require(msg.sender == listings[listedTokenId].seller, "Only seller can cancel listing");
		require(listings[listedTokenId].status == OfferStatus.Active, "Listing is not active");
        require(listings[listedTokenId].amount >= amountTokens, "Dont have enough tokens");

        if(listings[listedTokenId].standart == TokenStandart.ERC721) {
            listings[listedTokenId].status = OfferStatus.Cancel;
            
            IERC721(listings[listedTokenId].token).safeTransferFrom(address(this), msg.sender, listings[listedTokenId].tokenId);
        }

        else if(listings[listedTokenId].standart == TokenStandart.ERC1155) {
            if((listings[listedTokenId].amount - amountTokens) == 0) { listings[listedTokenId].status = OfferStatus.Sold; }

            IERC1155(listings[listedTokenId].token).safeTransferFrom(address(this), msg.sender, listings[listedTokenId].tokenId, amountTokens, '0x');
            listings[listedTokenId].amount -= amountTokens;
        }

        emit Cancel(listings[listedTokenId].seller, listedTokenId, amountTokens);

    }

    function listItemOnAuction(address token, uint256 tokenId, uint256 startPrice, uint256 amount) public {
        
        require(amount >= 1, "Error amount");

        _auctionId++;

        
        if(IERC165(token).supportsInterface(ERC721_INTERFACE)) {
            require(amount == 1, "Amount should be equal to 1");
            ERC721(token).safeTransferFrom(msg.sender, address(this), tokenId);

            auctions[_auctionId] = Auction(OfferStatus.Active, TokenStandart.ERC721, msg.sender, token, address(0x0), tokenId, startPrice, 1, startPrice, 0, block.timestamp);
        }

        else if(IERC165(token).supportsInterface(ERC1155_INTERFACE)) {
            ERC1155(token).safeTransferFrom(msg.sender, address(this), tokenId, amount, '');

            auctions[_auctionId] = Auction(OfferStatus.Active, TokenStandart.ERC1155, msg.sender, token, address(0x0), tokenId, startPrice, amount, startPrice, 0, block.timestamp);
        }

        else {
            revert("Wrong address");
        }

        emit CreateAuction(_auctionId, msg.sender, token, tokenId, startPrice, amount, block.timestamp);
    }

    function makeBid(uint256 auctionId) external payable {
        require(msg.sender != auctions[auctionId].seller, "Seller cannot bid");
		require(auctions[auctionId].auctionStatus == OfferStatus.Active, "Auction is not active");
        require(auctions[auctionId].startTime + auctionTime > block.timestamp, "Auction is not active");
        require(msg.value > auctions[auctionId].bid, "New price cannot be lower then last bid price");

        if(auctions[auctionId].buyer != address(0)){
            pendingReturns[auctions[auctionId].buyer] += auctions[auctionId].bid;
        }
        
        auctions[auctionId].buyer = msg.sender;
        auctions[auctionId].bid = msg.value;
        auctions[auctionId].numBid++;

        

        _safeTransferETH(address(this), msg.value);

        emit MakeBid(auctionId, msg.sender, msg.value, auctions[auctionId].numBid);

    }

    function cancelAuction(uint256 auctionId) public {
        require(auctions[auctionId].seller == msg.sender, "Caller is not a seller");
        require(auctions[auctionId].numBid == 0, "Bet already placed");
        auctions[auctionId].auctionStatus == OfferStatus.Cancel;


        if(auctions[auctionId].standart == TokenStandart.ERC721) {
            IERC721(auctions[auctionId].token).safeTransferFrom(address(this), auctions[auctionId].seller, auctions[auctionId].tokenId);
        }

        else if(auctions[auctionId].standart == TokenStandart.ERC1155) {
            IERC1155(auctions[auctionId].token).safeTransferFrom(address(this), auctions[auctionId].seller, auctions[auctionId].tokenId, auctions[auctionId].amount, '0x');
        }

    }

    function finishAuction(uint256 auctionId) public {
        require(auctions[auctionId].seller == msg.sender || auctions[auctionId].buyer == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Caller is not a seller or buyer");
        require(block.timestamp > auctions[auctionId].startTime + auctionTime, "Auction hasnt ended");
        auctions[auctionId].auctionStatus == OfferStatus.Sold;

        if(auctions[auctionId].numBid >= bidForEnding) {
            pendingReturns[auctions[auctionId].seller] += auctions[auctionId].bid;
            if(auctions[auctionId].standart == TokenStandart.ERC721) {
                IERC721(auctions[auctionId].token).safeTransferFrom(address(this), auctions[auctionId].buyer, auctions[auctionId].tokenId);
            }

            else if(auctions[auctionId].standart == TokenStandart.ERC1155) {
                IERC1155(auctions[auctionId].token).safeTransferFrom(address(this), auctions[auctionId].buyer, auctions[auctionId].tokenId, auctions[auctionId].amount, '0x');
            }
        }

        else if(auctions[auctionId].numBid > 0 && auctions[auctionId].numBid < bidForEnding) {
            pendingReturns[auctions[auctionId].buyer] += auctions[auctionId].bid;
            if(auctions[auctionId].standart == TokenStandart.ERC721) {
                IERC721(auctions[auctionId].token).safeTransferFrom(address(this), auctions[auctionId].seller, auctions[auctionId].tokenId);
            }

            else if(auctions[auctionId].standart == TokenStandart.ERC1155) {
                IERC1155(auctions[auctionId].token).safeTransferFrom(address(this), auctions[auctionId].seller, auctions[auctionId].tokenId, auctions[auctionId].amount, '0x');
            }
        }

        else {
            if(auctions[auctionId].standart == TokenStandart.ERC721) {
                IERC721(auctions[auctionId].token).safeTransferFrom(address(this), auctions[auctionId].seller, auctions[auctionId].tokenId);
            }

            else if(auctions[auctionId].standart == TokenStandart.ERC1155) {
                IERC1155(auctions[auctionId].token).safeTransferFrom(address(this), auctions[auctionId].seller, auctions[auctionId].tokenId, auctions[auctionId].amount, '0x');
            }
        }
    }

    function getAuctionBid(uint256 auctionId) view public returns(uint256) {
        return auctions[auctionId].bid;
    }

    function withdraw() external payable {
        uint256 amount = pendingReturns[msg.sender];
        if (amount > 0) {
            pendingReturns[msg.sender] = 0;
            _safeTransferETH(msg.sender, amount);
        }

    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

}