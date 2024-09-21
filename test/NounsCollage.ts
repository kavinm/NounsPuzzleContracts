import { expect } from "chai";
import { ethers } from "hardhat";

describe("Nouns Contracts", function () {
  async function deployContracts() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy NounsPuzzle contract
    const NounsPuzzle = await ethers.getContractFactory("NounsPuzzle");
    const nounsPuzzle = await NounsPuzzle.deploy();
    await nounsPuzzle.waitForDeployment();

    // Deploy NounsCollage contract
    const NounsCollage = await ethers.getContractFactory("NounsCollage");
    const nounsCollage = await NounsCollage.deploy(
      await nounsPuzzle.getAddress()
    );
    await nounsCollage.waitForDeployment();

    return { nounsPuzzle, nounsCollage, owner, addr1, addr2 };
  }

  describe("NounsPuzzle", function () {
    describe("Deployment", function () {
      it("Should set the right owner", async function () {
        const { nounsPuzzle, owner } = await deployContracts();
        expect(await nounsPuzzle.owner()).to.equal(owner.address);
      });
    });

    describe("Puzzle Initialization", function () {
      it("Should initialize a new puzzle", async function () {
        const { nounsPuzzle, addr1 } = await deployContracts();
        const traitNumber = 1;
        const trait = 0; // Background

        await expect(
          nounsPuzzle.connect(addr1).initializePuzzleNFT(traitNumber, trait)
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
        const { nounsPuzzle, addr1 } = await deployContracts();
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
        const { nounsPuzzle, owner, addr1 } = await deployContracts();
        const traitNumber = 1;
        const trait = 0; // Background

        await nounsPuzzle
          .connect(addr1)
          .initializePuzzleNFT(traitNumber, trait);
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
        const { nounsPuzzle, addr1, addr2 } = await deployContracts();
        const traitNumber = 1;
        const trait = 0; // Background

        await nounsPuzzle
          .connect(addr1)
          .initializePuzzleNFT(traitNumber, trait);
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
        const { nounsPuzzle, owner, addr1 } = await deployContracts();
        const traitNumber = 1;
        const trait = 0; // Background

        await nounsPuzzle
          .connect(addr1)
          .initializePuzzleNFT(traitNumber, trait);
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
        const { nounsPuzzle, addr1 } = await deployContracts();
        const traitNumber = 1;
        const trait = 0; // Background

        await nounsPuzzle
          .connect(addr1)
          .initializePuzzleNFT(traitNumber, trait);
        const userTokens = await nounsPuzzle.getUserTokens(addr1.address);
        const tokenId = userTokens[0];

        await expect(
          nounsPuzzle.connect(addr1).mintNFT(tokenId)
        ).to.be.revertedWith("Not all pieces unlocked");
      });
    });

    describe("Trait Information", function () {
      it("Should return the correct trait number and trait", async function () {
        const { nounsPuzzle, addr1 } = await deployContracts();
        const traitNumber = 42;
        const trait = 1; // Body

        await nounsPuzzle
          .connect(addr1)
          .initializePuzzleNFT(traitNumber, trait);
        const userTokens = await nounsPuzzle.getUserTokens(addr1.address);
        const tokenId = userTokens[0];

        const returnedTraitNumber = await nounsPuzzle.getTraitNumber(tokenId);
        expect(returnedTraitNumber).to.equal(traitNumber);

        const returnedTrait = await nounsPuzzle.getTrait(tokenId);
        expect(returnedTrait).to.equal(trait);
      });

      it("Should revert for non-existent token", async function () {
        const { nounsPuzzle } = await deployContracts();
        await expect(nounsPuzzle.getTraitNumber(999)).to.be.revertedWith(
          "Puzzle does not exist"
        );
        await expect(nounsPuzzle.getTrait(999)).to.be.revertedWith(
          "Puzzle does not exist"
        );
      });
    });
  });

  describe("NounsCollage", function () {
    describe("Deployment", function () {
      it("Should set the right owner", async function () {
        const { nounsCollage, owner } = await deployContracts();
        expect(await nounsCollage.owner()).to.equal(owner.address);
      });

      it("Should set the correct NounsPuzzle contract address", async function () {
        const { nounsPuzzle, nounsCollage } = await deployContracts();
        expect(await nounsCollage.nounsPuzzleContract()).to.equal(
          await nounsPuzzle.getAddress()
        );
      });
    });

    describe("Minting Collage", function () {
      it("Should allow minting when user has exactly 3 NounsPuzzle NFTs", async function () {
        const { nounsPuzzle, nounsCollage, owner, addr1 } =
          await deployContracts();
        const tokenURI = "https://example.com/collage.json";

        // Mint 3 NounsPuzzle NFTs for addr1
        for (let i = 0; i < 3; i++) {
          await nounsPuzzle.connect(addr1).initializePuzzleNFT(i, 0); // traitNumber: i, trait: Background
          // Unlock all pieces for each NFT
          for (let j = 0; j < 8; j++) {
            await nounsPuzzle.connect(owner).unlockPuzzlePiece(i + 1);
          }
          // Mint the NFT
          await nounsPuzzle.connect(addr1).mintNFT(i + 1);
        }

        await expect(nounsCollage.connect(addr1).mintCollage(tokenURI))
          .to.emit(nounsCollage, "CollageNFTMinted")
          .withArgs(addr1.address, 1, tokenURI);

        expect(await nounsCollage.ownerOf(1)).to.equal(addr1.address);
        expect(await nounsCollage.tokenURI(1)).to.equal(tokenURI);
      });

      it("Should not allow minting when user has less than 3 NounsPuzzle NFTs", async function () {
        const { nounsPuzzle, nounsCollage, owner, addr1 } =
          await deployContracts();
        const tokenURI = "https://example.com/collage.json";

        // Mint only 2 NounsPuzzle NFTs for addr1
        for (let i = 0; i < 2; i++) {
          await nounsPuzzle.connect(addr1).initializePuzzleNFT(i, 0);
          // Unlock all pieces for each NFT
          for (let j = 0; j < 8; j++) {
            await nounsPuzzle.connect(owner).unlockPuzzlePiece(i + 1);
          }
          // Mint the NFT
          await nounsPuzzle.connect(addr1).mintNFT(i + 1);
        }

        await expect(
          nounsCollage.connect(addr1).mintCollage(tokenURI)
        ).to.be.revertedWith(
          "Must have exactly 3 NounsPuzzle NFTs to mint a Collage"
        );
      });

      it("Should not allow minting when user has more than 3 NounsPuzzle NFTs", async function () {
        const { nounsPuzzle, nounsCollage, owner, addr1 } =
          await deployContracts();
        const tokenURI = "https://example.com/collage.json";

        // Mint 3 NounsPuzzle NFTs for addr1
        for (let i = 0; i < 3; i++) {
          await nounsPuzzle.connect(addr1).initializePuzzleNFT(i, 0);
          // Unlock all pieces for each NFT
          for (let j = 0; j < 8; j++) {
            await nounsPuzzle.connect(owner).unlockPuzzlePiece(i + 1);
          }
          // Mint the NFT
          await nounsPuzzle.connect(addr1).mintNFT(i + 1);
        }

        // Try to mint a 4th NFT (this should fail)
        await expect(
          nounsPuzzle.connect(addr1).initializePuzzleNFT(3, 0)
        ).to.be.revertedWith("Max puzzles per user reached");

        // Now try to mint a collage (this should succeed because addr1 has exactly 3 NFTs)
        await expect(nounsCollage.connect(addr1).mintCollage(tokenURI))
          .to.emit(nounsCollage, "CollageNFTMinted")
          .withArgs(addr1.address, 1, tokenURI);
      });
    });

    describe("Setting NounsPuzzle Address", function () {
      it("Should allow owner to set a new NounsPuzzle contract address", async function () {
        const { nounsCollage, owner } = await deployContracts();
        const newAddress = ethers.Wallet.createRandom().address;

        await nounsCollage.connect(owner).setNounsPuzzleAddress(newAddress);
        expect(await nounsCollage.nounsPuzzleContract()).to.equal(newAddress);
      });

      it("Should not allow non-owner to set a new NounsPuzzle contract address", async function () {
        const { nounsCollage, addr1 } = await deployContracts();
        const newAddress = ethers.Wallet.createRandom().address;

        await expect(
          nounsCollage.connect(addr1).setNounsPuzzleAddress(newAddress)
        )
          .to.be.revertedWithCustomError(
            nounsCollage,
            "OwnableUnauthorizedAccount"
          )
          .withArgs(addr1.address);
      });
    });

    describe("Token URI", function () {
      it("Should return the correct token URI", async function () {
        const { nounsPuzzle, nounsCollage, owner, addr1 } =
          await deployContracts();
        const tokenURI = "https://example.com/collage.json";

        // Mint 3 NounsPuzzle NFTs for addr1
        for (let i = 0; i < 3; i++) {
          await nounsPuzzle.connect(addr1).initializePuzzleNFT(i, 0);
          // Unlock all pieces for each NFT
          for (let j = 0; j < 8; j++) {
            await nounsPuzzle.connect(owner).unlockPuzzlePiece(i + 1);
          }
          // Mint the NFT
          await nounsPuzzle.connect(addr1).mintNFT(i + 1);
        }

        await nounsCollage.connect(addr1).mintCollage(tokenURI);

        expect(await nounsCollage.tokenURI(1)).to.equal(tokenURI);
      });

      it("Should revert for non-existent token", async function () {
        const { nounsCollage } = await deployContracts();
        await expect(nounsCollage.tokenURI(999)).to.be.reverted;
      });
    });
  });
});
