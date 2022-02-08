pragma solidity ^0.8.10;

import "./Elems.sol";
import "./Items.sol";
// import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
// import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";


contract Marketplace is AccessControl {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    bytes4 private constant ERC721_INTERFACE = 0x80ac58cd;
    bytes4 private constant ERC1155_INTERFACE = 0xd9b67a26;

    enum TokenStatus { Active, Sold, Cancel }

    uint256 _tokensIdOnSale;

    struct Listing {
        TokenStatus status;
        address seller;
        address token;
        uint256 tokenId;
        uint256 price;
        uint256 amount;
    }

    mapping(uint256 => Listing) private listings;

    event ListToken(uint256 listedTokenId, address seller, address token, uint256 tokenId, uint256 price, uint256 amount);
    event BuyToken(uint256 listedTokenId, address buyer, address token, uint256 tokenId, uint256 price, uint256 amount);
    event Cancel(address seller, uint256 tokenId, uint256 amount);

    constructor() {

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);

    }

    function listItem(address token, uint256 tokenId, uint256 price, uint256 amount) external {

        require(amount >= 1, "Error amount");

        if(IERC165(token).supportsInterface(ERC721_INTERFACE)) {
            ERC721(token).safeTransferFrom(msg.sender, address(this), tokenId);

            _tokensIdOnSale++;
            listings[_tokensIdOnSale] = Listing(TokenStatus.Active, msg.sender, token, tokenId, price, 1);
            emit ListToken(_tokensIdOnSale, msg.sender, token, tokenId, price, 1);
        }

        else if(IERC165(token).supportsInterface(ERC1155_INTERFACE)) {
            ERC1155(token).safeTransferFrom(msg.sender, address(this), tokenId, amount, '0x');

            _tokensIdOnSale++;
            listings[_tokensIdOnSale] = Listing(TokenStatus.Active, msg.sender, token, tokenId, price, amount);
            emit ListToken(_tokensIdOnSale, msg.sender, token, tokenId, price, amount);
        }

        else {
            revert("Wrong address");
        }

    }

    function getListItem(uint256 tokenSaleId) public view returns(Listing memory){
        return listings[tokenSaleId];
    }

    function buyItem(address token, uint256 listedTokenId, uint256 amountTokens) external payable {

        require(msg.sender != listings[listedTokenId].seller, "Seller cannot be buyer");
		require(listings[listedTokenId].status == TokenStatus.Active, "Listing is not active");
        require(listings[listedTokenId].amount >= amountTokens, "Dont have enough tokens");
        require(msg.value >= listings[listedTokenId].price*amountTokens, "You dont have enough ETH");

        if(IERC165(token).supportsInterface(ERC721_INTERFACE)) {
            listings[listedTokenId].status = TokenStatus.Sold;

            IERC721(listings[listedTokenId].token).safeTransferFrom(address(this), msg.sender, listings[listedTokenId].tokenId);
            payable(listings[listedTokenId].seller).transfer(listings[listedTokenId].price);

            emit BuyToken(listedTokenId, msg.sender, listings[listedTokenId].token, listings[listedTokenId].tokenId, listings[listedTokenId].price, 1);
        }

        else if(IERC165(token).supportsInterface(ERC1155_INTERFACE)) {
            if((listings[listedTokenId].amount - amountTokens) == 0) { listings[listedTokenId].status = TokenStatus.Sold; }

            IERC1155(listings[listedTokenId].token).safeTransferFrom(address(this), msg.sender, listings[listedTokenId].tokenId, amountTokens, '0x');
            payable(listings[listedTokenId].seller).transfer(listings[listedTokenId].price*amountTokens);

            emit BuyToken(listedTokenId, msg.sender, listings[listedTokenId].token, listings[listedTokenId].tokenId, listings[listedTokenId].price, amountTokens);
        }

    }

    function cancel(address token, uint256 listedTokenId, uint256 amountTokens) public {
        require(msg.sender == listings[listedTokenId].seller, "Only seller can cancel listing");
		require(listings[listedTokenId].status == TokenStatus.Active, "Listing is not active");
        require(listings[listedTokenId].amount >= amountTokens, "Dont have enough tokens");

        if(IERC165(token).supportsInterface(ERC721_INTERFACE)) {
            listings[listedTokenId].status = TokenStatus.Cancel;
            
            IERC721(listings[listedTokenId].token).safeTransferFrom(address(this), msg.sender, listings[listedTokenId].tokenId);

            emit Cancel(listings[listedTokenId].seller, listedTokenId, 1);
        }

        else if(IERC165(token).supportsInterface(ERC1155_INTERFACE)) {
            if((listings[listedTokenId].amount - amountTokens) == 0) { listings[listedTokenId].status = TokenStatus.Sold; }

            IERC1155(listings[listedTokenId].token).safeTransferFrom(address(this), msg.sender, listings[listedTokenId].tokenId, amountTokens, '0x');
            listings[listedTokenId].amount -= amountTokens;
            emit Cancel(listings[listedTokenId].seller, listedTokenId, amountTokens);
        }

    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

}