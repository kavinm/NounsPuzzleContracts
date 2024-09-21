const { ethers, run, network } = require("hardhat");

async function main() {
  try {
    // Get the contract to deploy
    const NounsPuzzle = await ethers.getContractFactory("NounsPuzzle");

    console.log("Deploying NounsPuzzle...");
    // Deploy the contract
    const nounsPuzzle = await NounsPuzzle.deploy();

    // Wait for the contract to be deployed
    await nounsPuzzle.waitForDeployment();

    // Get the deployed contract address
    const deployedAddress = await nounsPuzzle.getAddress();

    console.log("NounsPuzzle deployed to:", deployedAddress);

    // Verify the contract on Etherscan
    if (process.env.ETHERSCAN_API_KEY) {
      console.log("Waiting for 6 block confirmations...");
      await nounsPuzzle.deploymentTransaction().wait(6);
      console.log("Verifying contract on Etherscan...");
      await run("verify:verify", {
        address: deployedAddress,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } else {
      console.log("Skipping Etherscan verification");
    }
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
