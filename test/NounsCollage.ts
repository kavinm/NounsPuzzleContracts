import { expect } from "chai";
import { ethers } from "hardhat";

describe("NounsPuzzle", function () {
  async function deployNounsPuzzle() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const NounsPuzzle = await ethers.getContractFactory("NounsPuzzle");
    const nounsPuzzle = await NounsPuzzle.deploy();
    await nounsPuzzle.waitForDeployment();
    return { nounsPuzzle, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { nounsPuzzle, owner } = await deployNounsPuzzle();
      expect(await nounsPuzzle.owner()).to.equal(owner.address);
    });
  });

  describe("Puzzle Initialization", function () {
    it("Should initialize a new puzzle", async function () {
      const { nounsPuzzle, addr1 } = await deployNounsPuzzle();
      const pieceUrls = Array(9).fill("https://example.com/piece.jpg");
      const fullUrl = "https://example.com/full.jpg";

      await expect(
        nounsPuzzle.connect(addr1).initializePuzzleNFT(pieceUrls, fullUrl)
      )
        .to.emit(nounsPuzzle, "PuzzleInitialized")
        .withArgs(addr1.address, 1); // Assuming the first tokenId is 1

      const userTokens = await nounsPuzzle.getUserTokens(addr1.address);
      expect(userTokens.length).to.equal(1);

      const tokenId = userTokens[0];
      const unlockedPieces = await nounsPuzzle.getUnlockedPieces(tokenId);
      expect(unlockedPieces).to.equal(1);
    });

    it("Should not allow more than MAX_PUZZLES_PER_USER", async function () {
      const { nounsPuzzle, addr1 } = await deployNounsPuzzle();
      const pieceUrls = Array(9).fill("https://example.com/piece.jpg");
      const fullUrl = "https://example.com/full.jpg";

      for (let i = 0; i < 3; i++) {
        await nounsPuzzle
          .connect(addr1)
          .initializePuzzleNFT(pieceUrls, fullUrl);
      }

      await expect(
        nounsPuzzle.connect(addr1).initializePuzzleNFT(pieceUrls, fullUrl)
      ).to.be.revertedWith("Max puzzles per user reached");
    });
  });

  describe("Unlocking pieces", function () {
    it("Should allow owner to unlock pieces", async function () {
      const { nounsPuzzle, owner, addr1 } = await deployNounsPuzzle();
      const pieceUrls = Array(9).fill("https://example.com/piece.jpg");
      const fullUrl = "https://example.com/full.jpg";

      await nounsPuzzle.connect(addr1).initializePuzzleNFT(pieceUrls, fullUrl);
      const userTokens = await nounsPuzzle.getUserTokens(addr1.address);
      const tokenId = userTokens[0];

      await expect(nounsPuzzle.connect(owner).unlockPuzzlePiece(tokenId))
        .to.emit(nounsPuzzle, "PuzzlePieceUnlocked")
        .withArgs(tokenId, 2);

      let unlockedPieces = await nounsPuzzle.getUnlockedPieces(tokenId);
      expect(unlockedPieces).to.equal(2);

      // Unlock remaining pieces
      for (let i = 2; i < 9; i++) {
        await nounsPuzzle.connect(owner).unlockPuzzlePiece(tokenId);
      }

      unlockedPieces = await nounsPuzzle.getUnlockedPieces(tokenId);
      expect(unlockedPieces).to.equal(9);
    });

    it("Should not allow non-owner to unlock pieces", async function () {
      const { nounsPuzzle, addr1, addr2 } = await deployNounsPuzzle();
      const pieceUrls = Array(9).fill("https://example.com/piece.jpg");
      const fullUrl = "https://example.com/full.jpg";

      await nounsPuzzle.connect(addr1).initializePuzzleNFT(pieceUrls, fullUrl);
      const userTokens = await nounsPuzzle.getUserTokens(addr1.address);
      const tokenId = userTokens[0];

      await expect(nounsPuzzle.connect(addr2).unlockPuzzlePiece(tokenId))
        .to.be.revertedWithCustomError(
          nounsPuzzle,
          "OwnableUnauthorizedAccount"
        )
        .withArgs(addr2.address);
    });
  });

  describe("Minting NFT", function () {
    it("Should allow minting when all pieces are unlocked", async function () {
      const { nounsPuzzle, owner, addr1 } = await deployNounsPuzzle();
      const pieceUrls = Array(9).fill("https://example.com/piece.jpg");
      const fullUrl = "https://example.com/full.jpg";

      await nounsPuzzle.connect(addr1).initializePuzzleNFT(pieceUrls, fullUrl);
      const userTokens = await nounsPuzzle.getUserTokens(addr1.address);
      const tokenId = userTokens[0];

      // Unlock all pieces
      for (let i = 1; i < 9; i++) {
        await nounsPuzzle.connect(owner).unlockPuzzlePiece(tokenId);
      }

      await expect(nounsPuzzle.connect(addr1).mintNFT(tokenId))
        .to.emit(nounsPuzzle, "NFTMinted")
        .withArgs(addr1.address, tokenId);

      const nftOwner = await nounsPuzzle.ownerOf(tokenId);
      expect(nftOwner).to.equal(addr1.address);
    });

    it("Should not allow minting when not all pieces are unlocked", async function () {
      const { nounsPuzzle, addr1 } = await deployNounsPuzzle();
      const pieceUrls = Array(9).fill("https://example.com/piece.jpg");
      const fullUrl = "https://example.com/full.jpg";

      await nounsPuzzle.connect(addr1).initializePuzzleNFT(pieceUrls, fullUrl);
      const userTokens = await nounsPuzzle.getUserTokens(addr1.address);
      const tokenId = userTokens[0];

      await expect(
        nounsPuzzle.connect(addr1).mintNFT(tokenId)
      ).to.be.revertedWith("Not all pieces unlocked");
    });
  });

  describe("Token URI", function () {
    it("Should return the correct token URI", async function () {
      const { nounsPuzzle, addr1 } = await deployNounsPuzzle();
      const pieceUrls = Array(9).fill("https://example.com/piece.jpg");
      const fullUrl = "https://example.com/full.jpg";

      await nounsPuzzle.connect(addr1).initializePuzzleNFT(pieceUrls, fullUrl);
      const userTokens = await nounsPuzzle.getUserTokens(addr1.address);
      const tokenId = userTokens[0];

      const uri = await nounsPuzzle.tokenURI(tokenId);
      expect(uri).to.equal(fullUrl);
    });

    it("Should revert for non-existent token", async function () {
      const { nounsPuzzle } = await deployNounsPuzzle();
      await expect(nounsPuzzle.tokenURI(999)).to.be.revertedWith(
        "Puzzle does not exist"
      );
    });
  });
});
