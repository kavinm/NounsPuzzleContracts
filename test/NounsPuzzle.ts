import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("NounsPuzzle", function () {
  async function deployNounsPuzzleFixture() {
    const [owner, addr1, addr2] = await hre.ethers.getSigners();

    const NounsPuzzle = await hre.ethers.getContractFactory("NounsPuzzle");
    const nounsPuzzle = await NounsPuzzle.deploy();

    return { nounsPuzzle, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { nounsPuzzle, owner } = await loadFixture(
        deployNounsPuzzleFixture
      );
      expect(await nounsPuzzle.owner()).to.equal(owner.address);
    });
  });

  describe("Puzzle Initialization", function () {
    it("Should initialize a new puzzle", async function () {
      const { nounsPuzzle, addr1 } = await loadFixture(
        deployNounsPuzzleFixture
      );
      const traitNumber = 1;
      const trait = 0; // Background

      await expect(
        nounsPuzzle.connect(addr1).initializePuzzleNFT(traitNumber, trait)
      )
        .to.emit(nounsPuzzle, "PuzzleInitialized")
        .withArgs(addr1.address, anyValue);

      const userTokens = await nounsPuzzle.getUserTokens(addr1.address);
      expect(userTokens.length).to.equal(1);

      const tokenId = userTokens[0];
      const unlockedPieces = await nounsPuzzle.getUnlockedPieces(tokenId);
      expect(unlockedPieces).to.equal(1);
    });

    it("Should not allow more than MAX_PUZZLES_PER_USER", async function () {
      const { nounsPuzzle, addr1 } = await loadFixture(
        deployNounsPuzzleFixture
      );
      const traitNumber = 1;
      const trait = 0; // Background

      for (let i = 0; i < 3; i++) {
        await nounsPuzzle
          .connect(addr1)
          .initializePuzzleNFT(traitNumber, trait);
      }

      await expect(
        nounsPuzzle.connect(addr1).initializePuzzleNFT(traitNumber, trait)
      ).to.be.revertedWith("Max puzzles per user reached");
    });
  });

  describe("Unlocking pieces", function () {
    it("Should allow owner to unlock pieces", async function () {
      const { nounsPuzzle, owner, addr1 } = await loadFixture(
        deployNounsPuzzleFixture
      );
      const traitNumber = 1;
      const trait = 0; // Background

      await nounsPuzzle.connect(addr1).initializePuzzleNFT(traitNumber, trait);
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
      const { nounsPuzzle, addr1, addr2 } = await loadFixture(
        deployNounsPuzzleFixture
      );
      const traitNumber = 1;
      const trait = 0; // Background

      await nounsPuzzle.connect(addr1).initializePuzzleNFT(traitNumber, trait);
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
      const { nounsPuzzle, owner, addr1 } = await loadFixture(
        deployNounsPuzzleFixture
      );
      const traitNumber = 1;
      const trait = 0; // Background

      await nounsPuzzle.connect(addr1).initializePuzzleNFT(traitNumber, trait);
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
      const { nounsPuzzle, addr1 } = await loadFixture(
        deployNounsPuzzleFixture
      );
      const traitNumber = 1;
      const trait = 0; // Background

      await nounsPuzzle.connect(addr1).initializePuzzleNFT(traitNumber, trait);
      const userTokens = await nounsPuzzle.getUserTokens(addr1.address);
      const tokenId = userTokens[0];

      await expect(
        nounsPuzzle.connect(addr1).mintNFT(tokenId)
      ).to.be.revertedWith("Not all pieces unlocked");
    });
  });

  describe("Trait Information", function () {
    it("Should return the correct trait number and trait", async function () {
      const { nounsPuzzle, addr1 } = await loadFixture(
        deployNounsPuzzleFixture
      );
      const traitNumber = 42;
      const trait = 1; // Body

      await nounsPuzzle.connect(addr1).initializePuzzleNFT(traitNumber, trait);
      const userTokens = await nounsPuzzle.getUserTokens(addr1.address);
      const tokenId = userTokens[0];

      const returnedTraitNumber = await nounsPuzzle.getTraitNumber(tokenId);
      expect(returnedTraitNumber).to.equal(traitNumber);

      const returnedTrait = await nounsPuzzle.getTrait(tokenId);
      expect(returnedTrait).to.equal(trait);
    });

    it("Should revert for non-existent token", async function () {
      const { nounsPuzzle } = await loadFixture(deployNounsPuzzleFixture);
      await expect(nounsPuzzle.getTraitNumber(999)).to.be.revertedWith(
        "Puzzle does not exist"
      );
      await expect(nounsPuzzle.getTrait(999)).to.be.revertedWith(
        "Puzzle does not exist"
      );
    });
  });
});
