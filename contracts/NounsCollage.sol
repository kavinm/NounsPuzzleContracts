// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface INounsPuzzle {
    function balanceOf(address owner) external view returns (uint256);
}

contract NounsCollage is ERC721, ERC721URIStorage, Ownable {
    INounsPuzzle public nounsPuzzleContract;
    uint256 public constant REQUIRED_PUZZLE_PIECES = 3;
    uint256 private _nextTokenId;
    event CollageNFTMinted(address recipient, uint256 tokenId, string tokenURI);

    constructor(
        address _nounsPuzzleAddress
    ) ERC721("NounsCollage", "NCLG") Ownable(msg.sender) {
        nounsPuzzleContract = INounsPuzzle(_nounsPuzzleAddress);
        _nextTokenId = 1;
    }

    function mintCollage(string memory _tokenURI) public {
        require(
            nounsPuzzleContract.balanceOf(msg.sender) == REQUIRED_PUZZLE_PIECES,
            "Must have exactly 3 NounsPuzzle NFTs to mint a Collage"
        );
        uint256 newTokenId = _nextTokenId;
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        _nextTokenId++;
        emit CollageNFTMinted(msg.sender, newTokenId, _tokenURI);
    }

    function setNounsPuzzleAddress(
        address _nounsPuzzleAddress
    ) public onlyOwner {
        nounsPuzzleContract = INounsPuzzle(_nounsPuzzleAddress);
    }

    // The following functions are overrides required by Solidity.
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
