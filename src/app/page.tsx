/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { isAddress, Abi } from "viem";
import { baseSepolia } from "wagmi/chains";
// Make sure this path correctly points to your ABI file
import { abi } from "../app/blockchain/abi";

// --- Contract Configuration ---
// Your deployed PermanentLike contract address on Base Sepolia
const contractAddress = "0xeBCeE50B5Cd15907Cd77D89bCE87823D4d30250F";
const contractChain = baseSepolia;

// --- Reusable UI Components ---

function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Find the injected connector (e.g., MetaMask)
  const injectedConnector = connectors.find((c) => c.id === "injected");

  if (isConnected) {
    return (
      <div className='text-right'>
        <p className='text-sm text-gray-400'>
          Connected: {`${address?.slice(0, 6)}...${address?.slice(-4)}`}
        </p>
        <button
          onClick={() => disconnect()}
          className='px-4 py-2 mt-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
        >
          Disconnect
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => {
        if (injectedConnector) {
          connect({ connector: injectedConnector, chainId: contractChain.id });
        }
      }}
      disabled={!injectedConnector}
      className='px-4 py-2 font-bold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed'
    >
      {injectedConnector ? "Connect Wallet" : "Wallet Not Found"}
    </button>
  );
}


function LikeInterface() {
    const { address: connectedAddress } = useAccount();
    const [creatorAddress, setCreatorAddress] = useState("");
    const [addressToQuery, setAddressToQuery] = useState("");

    // --- Wagmi Hooks ---

    // 1. Hook for writing to the 'like' function
    const { data: hash, error: writeError, isPending: isLikePending, writeContract } = useWriteContract();

    // 2. Hook for reading the 'likeCounts'
    const { data: likeCount, error: readError, isLoading: isReadLoading, refetch } = useReadContract({
        address: contractAddress,
        abi: abi as Abi,
        functionName: "likeCounts",
        args: [addressToQuery],
        // Only enable the query when we have a valid address
        query: {
            enabled: isAddress(addressToQuery),
        }
    });

    // 3. Hook to wait for the 'like' transaction to be confirmed
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });


    // --- Effects ---

    // When a 'like' transaction is confirmed, refetch the like count to show the new value
    useEffect(() => {
        if (isConfirmed) {
            refetch();
        }
    }, [isConfirmed, refetch]);


    // --- Event Handlers ---

    const handleCheckLikes = () => {
        if (isAddress(creatorAddress)) {
            setAddressToQuery(creatorAddress);
        } else {
            alert("Please enter a valid Ethereum address.");
        }
    };

    const handleLike = () => {
        writeContract({
            address: contractAddress,
            abi: abi as Abi,
            functionName: "like",
            args: [creatorAddress],
        });
    };

    // --- Derived State ---
    const showLikeButton = isAddress(addressToQuery) && connectedAddress && addressToQuery.toLowerCase() !== connectedAddress.toLowerCase();

    return (
      <div className='p-6 mt-8 bg-gray-800 border border-gray-700 rounded-lg'>
        <h2 className='mb-4 text-2xl font-bold text-white'>
          Check or Give a Like
        </h2>

        {/* Input Section */}
        <div className='mb-4'>
          <label
            htmlFor='creator-address'
            className='block mb-2 text-sm font-medium text-gray-300'
          >
            Creator&apos;s Wallet Address
          </label>
          <div className='flex flex-col sm:flex-row gap-2'>
            <input
              id='creator-address'
              value={creatorAddress}
              onChange={(e) => setCreatorAddress(e.target.value)}
              placeholder='0x...'
              className='flex-grow px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500'
            />
            <button
              onClick={handleCheckLikes}
              className='px-4 py-2 font-bold text-white bg-gray-600 rounded-lg hover:bg-gray-700'
            >
              Check Likes
            </button>
          </div>
        </div>

        {/* Result Display Section */}
        {isReadLoading && (
          <p className='mt-4 text-gray-400'>Fetching likes...</p>
        )}

        {likeCount !== undefined && isAddress(addressToQuery) && (
          <div className='mt-6 text-center bg-gray-900 p-6 rounded-lg'>
            <p className='text-gray-400 text-lg'>Likes Received:</p>
            <p className='text-4xl font-bold text-white my-2'>
              {likeCount?.toString()}
            </p>

            {showLikeButton && (
              <button
                onClick={handleLike}
                disabled={isLikePending || isConfirming}
                className='mt-4 w-full sm:w-auto px-6 py-2 font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed'
              >
                {isLikePending
                  ? "Confirming..."
                  : isConfirming
                  ? "Liking..."
                  : "Give a Like"}
              </button>
            )}
          </div>
        )}

        {/* Status Messages */}
        {isConfirmed && (
          <p className='mt-2 text-sm text-green-400'>
            Like successful! Transaction Hash:{" "}
            <a
              href={`${contractChain.blockExplorers.default.url}/tx/${hash}`}
              target='_blank'
              rel='noopener noreferrer'
              className='underline'
            >
              {hash?.slice(0, 10)}...
            </a>
          </p>
        )}

        {(writeError || readError) && (
          <p className='mt-2 text-sm text-red-400'>
            Error:{" "}
            {((writeError || readError)?.cause as any)?.shortMessage ||
              (writeError || readError)?.message}
          </p>
        )}
      </div>
    );
}
// --- Main Page Component ---

export default function HomePage() {
  const { isConnected, chain } = useAccount();

  return (
    <main className='min-h-screen p-4 text-white bg-gray-900 sm:p-8'>
      <div className='max-w-2xl mx-auto'>
        <header className='flex items-center justify-between mb-8'>
          <h1 className='text-4xl font-bold'>PermanentLike</h1>
          <ConnectWallet />
        </header>

        {isConnected && chain?.id !== contractChain.id && (
          <div className='p-4 mb-4 text-yellow-200 bg-yellow-800 rounded-md'>
            <strong>Warning:</strong> Please switch your wallet to the{" "}
            {contractChain.name} network to interact with the contract.
          </div>
        )}

        {isConnected && chain?.id === contractChain.id && <LikeInterface />}
      </div>
    </main>
  );
}
