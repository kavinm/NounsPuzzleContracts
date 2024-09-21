// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NounsPuzzle is ERC721, Ownable {
    uint256 private _nextTokenId;

    struct PuzzlePiece {
        uint256 tokenId;
        bool isQuestion; // Indicates whether the piece is a question
        bool isSolved; // Indicates whether the question is solved
        string metadata; // Metadata for puzzle piece (image or question)
    }

    // Mapping token ID to puzzle piece
    mapping(uint256 => PuzzlePiece) public puzzlePieces;
    mapping(address => uint256[]) public userPuzzlePieces; // Store collected pieces by users

    event PuzzlePieceMinted(address user, uint256 tokenId, string metadata);
    event QuestionSolved(address user, uint256 tokenId);
    event PuzzleCompleted(address user, string artworkMetadata);

    constructor() ERC721("NounsPuzzleNFT", "NPZ") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    // Function to mint new puzzle pieces
    function mintPuzzlePiece(address recipient, bool isQuestion, string memory metadata) public onlyOwner {
        uint256 newItemId = _nextTokenId++;
        _mint(recipient, newItemId);
        puzzlePieces[newItemId] = PuzzlePiece({
            tokenId: newItemId,
            isQuestion: isQuestion,
            isSolved: !isQuestion, // If not a question, it's automatically marked solved
            metadata: metadata
        });
        userPuzzlePieces[recipient].push(newItemId);
        emit PuzzlePieceMinted(recipient, newItemId, metadata);
    }

    // Function to solve a question puzzle piece
    function solveQuestion(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "You do not own this puzzle piece");
        require(puzzlePieces[tokenId].isQuestion == true, "This is not a question piece");
        require(puzzlePieces[tokenId].isSolved == false, "Question already solved");
        puzzlePieces[tokenId].isSolved = true;
        emit QuestionSolved(msg.sender, tokenId);
    }

    // Function to check if user completed the puzzle
    function checkPuzzleCompletion(address user) public view returns (bool) {
        uint256[] memory pieces = userPuzzlePieces[user];
        if (pieces.length != 27) {
            return false; // Require all 27 pieces
        }
        uint256 solvedCount = 0;
        for (uint256 i = 0; i < pieces.length; i++) {
            if (puzzlePieces[pieces[i]].isSolved) {
                solvedCount++;
            }
        }
        return solvedCount == 27; // Require all pieces solved
    }

    // Function to mint artwork upon puzzle completion
    function mintArtwork(address user, string memory artworkMetadata) public onlyOwner {
        require(checkPuzzleCompletion(user), "Puzzle not yet completed");
        uint256 newItemId = _nextTokenId++;
        _mint(user, newItemId);
        puzzlePieces[newItemId] = PuzzlePiece({
            tokenId: newItemId,
            isQuestion: false,
            isSolved: true,
            metadata: artworkMetadata
        });
        emit PuzzleCompleted(user, artworkMetadata);
    }

    // Get user progress on the puzzle
    function getUserProgress(address user) public view returns (uint256 totalPieces, uint256 solvedPieces) {
        uint256[] memory pieces = userPuzzlePieces[user];
        uint256 solvedCount = 0;
        for (uint256 i = 0; i < pieces.length; i++) {
            if (puzzlePieces[pieces[i]].isSolved) {
                solvedCount++;
            }
        }
        return (pieces.length, solvedCount);
    }
}