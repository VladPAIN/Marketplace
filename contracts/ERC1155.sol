pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract Items is ERC1155, AccessControl {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint256 public constant AGILITY = 1;
    uint256 public constant INTELLIGENCE = 2;
    uint256 public constant STRENGTH = 3;

    constructor() public ERC1155("https://gateway.pinata.cloud/ipfs/QmfWUzLTijxfLieTqCiLqdHBBMMF8wX1fvn3qrGAyA5uS4/{id}.json") {

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);

        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BURNER_ROLE, ADMIN_ROLE);



    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }


    function mintNFT(address recipient, uint256 id, uint256 amount) public returns (bool) {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");

        _mint(recipient, id, amount, "");

        return true;
    }

    function burnNFT(address owner, uint256 id, uint256 amount) public returns (bool) {
        require(hasRole(BURNER_ROLE, msg.sender), "Caller is not a burner");
        require(balanceOf(owner, id) >= amount, "Owner dont have enough tokens");

        _burn(owner, id, amount);

        return true;
    }

}