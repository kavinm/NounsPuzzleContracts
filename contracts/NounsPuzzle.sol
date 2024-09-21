// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NounsPuzzle is ERC721, Ownable {
    enum Trait {
        Head,
        Body,
        Accessory
    }

    struct PuzzleNFT {
        uint256 traitNumber;
        Trait trait;
        uint8 piecesUnlocked;
        bool minted;
    }

    mapping(uint256 => PuzzleNFT) public puzzleNFTs;
    mapping(address => uint256[]) public userTokens;
    uint256 private _nextTokenId;
    uint256 public constant MAX_PUZZLES_PER_USER = 3;

    event PuzzleInitialized(address indexed user, uint256 indexed tokenId);
    event PuzzlePieceUnlocked(uint256 indexed tokenId, uint8 piecesUnlocked);
    event NFTMinted(address indexed owner, uint256 indexed tokenId);

    constructor() ERC721("NounsPuzzleNFT", "NPZ") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    function initializePuzzleNFT(uint256 traitNumber, Trait trait) public {
        require(
            userTokens[msg.sender].length < MAX_PUZZLES_PER_USER,
            "Max puzzles per user reached"
        );
        uint256 tokenId = _nextTokenId++;

        puzzleNFTs[tokenId] = PuzzleNFT({
            traitNumber: traitNumber,
            trait: trait,
            piecesUnlocked: 1,
            minted: false
        });

        userTokens[msg.sender].push(tokenId);
        emit PuzzleInitialized(msg.sender, tokenId);
    }

    function unlockPuzzlePiece(uint256 tokenId) public onlyOwner {
        require(_puzzleExists(tokenId), "Puzzle does not exist");
        require(
            puzzleNFTs[tokenId].piecesUnlocked < 9,
            "All pieces already unlocked"
        );
        puzzleNFTs[tokenId].piecesUnlocked++;
        emit PuzzlePieceUnlocked(tokenId, puzzleNFTs[tokenId].piecesUnlocked);
    }

    function mintNFT(uint256 tokenId) public {
        require(
            _isTokenOwnedByUser(msg.sender, tokenId),
            "Not the token owner"
        );
        require(
            puzzleNFTs[tokenId].piecesUnlocked == 9,
            "Not all pieces unlocked"
        );
        require(!puzzleNFTs[tokenId].minted, "NFT already minted");
        _mint(msg.sender, tokenId);
        puzzleNFTs[tokenId].minted = true;
        emit NFTMinted(msg.sender, tokenId);
    }

    function getUnlockedPieces(uint256 tokenId) public view returns (uint8) {
        require(_puzzleExists(tokenId), "Puzzle does not exist");
        return puzzleNFTs[tokenId].piecesUnlocked;
    }

    function getUserTokens(
        address user
    ) public view returns (uint256[] memory) {
        return userTokens[user];
    }

    function getTraitNumber(uint256 tokenId) public view returns (uint256) {
        require(_puzzleExists(tokenId), "Puzzle does not exist");
        return puzzleNFTs[tokenId].traitNumber;
    }

    function getTrait(uint256 tokenId) public view returns (Trait) {
        require(_puzzleExists(tokenId), "Puzzle does not exist");
        return puzzleNFTs[tokenId].trait;
    }

    function _isTokenOwnedByUser(
        address user,
        uint256 tokenId
    ) internal view returns (bool) {
        uint256[] memory tokens = userTokens[user];
        for (uint i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenId) {
                return true;
            }
        }
        return false;
    }

    function _puzzleExists(uint256 tokenId) internal view returns (bool) {
        return
            puzzleNFTs[tokenId].piecesUnlocked > 0 ||
            puzzleNFTs[tokenId].minted;
    }
}
