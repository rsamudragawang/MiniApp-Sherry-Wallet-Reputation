/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { baseSepolia, sepolia } from 'viem/chains';
import { createPublicClient, http, isAddress, encodeFunctionData, Abi, TransactionSerializable,serializeTransaction } from 'viem';
import { createMetadata, Metadata, ValidatedMetadata, ExecutionResponse } from '@sherrylinks/sdk';
import { serialize } from 'wagmi';
// Assuming the ABI file is in the correct path for your project structure
import { abi } from '../../blockchain/abi';

// --- Configuration ---
const CONTRACT_ADDRESS = '0x049025471619bB813F6921f3881A5BD610fCf17b';
const contractChain = sepolia;

// Create a public client to read from the blockchain
const publicClient = createPublicClient({
  chain: contractChain,
  transport: http(),
});

/**
 * Handles GET requests.
 * - If 'address' query param is provided, fetches the reputation count.
 * - Otherwise, provides metadata for the SherryLink.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const addressToQuery = searchParams.get('address');

  // --- A) Fetch Reputation Count ---
  if (addressToQuery) {
    if (!isAddress(addressToQuery)) {
      return NextResponse.json({ error: 'Invalid Ethereum address provided.' }, { status: 400 });
    }
    try {
      const reputationScore = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: abi as Abi,
        functionName: 'likeCounts',
        args: [addressToQuery],
      }) as bigint; // Cast the result to the expected type (bigint for uint256)
      return NextResponse.json({ address: addressToQuery, reputation: reputationScore.toString() });
    } catch (error) {
      console.error('Error fetching reputation count:', error);
      return NextResponse.json({ error: 'Failed to fetch reputation count from the blockchain.' }, { status: 500 });
    }
  }

  // --- B) Provide SherryLink Metadata ---
  try {
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const serverUrl = `${protocol}://${host}`;

    const metadata: Metadata = {
      url: 'https://mini-app-sherry-wallet-reputation.vercel.app/',
      icon: 'https://mini-app-sherry-wallet-reputation.vercel.app/icon-reputation.jpeg',
      title: 'Permanent Reputation',
      baseUrl: serverUrl,
      description: 'Give a permanent, on-chain reputation point to an Ethereum content creator.',
      actions: [
        {
          type: 'dynamic',
          label: 'Give Reputation',
          description: 'Enter the address of the creator you want to give reputation to.',
          chains: { source: 'sepolia' },
          path: `/api/wallet-reputation`, // Corrected path to match your API route
          params: [
            {
              name: 'contentCreator',
              label: 'Creator\'s Address',
              type: 'text',
              required: true,
              description: 'Enter the Ethereum address of the content creator.',
            },
          ],
        },
      ],
    };

    const validated: ValidatedMetadata = createMetadata(metadata);
    return NextResponse.json(validated, { headers: { 'Access-Control-Allow-Origin': '*' }});
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create metadata' }, { status: 500 });
  }
}

/**
 * Handles POST requests to create and serialize the blockchain transaction.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { account?: `0x${string}` };
    try {
      body = await req.json();
    } catch (e) {
      // This error occurs if the request body is missing or is not valid JSON.
      return NextResponse.json({ error: 'Invalid request: The request body is missing or not valid JSON.' }, { status: 400 });
    }

    const connectedAccount = body.account;
    const { searchParams } = new URL(req.url);
    const contentCreator = searchParams.get('contentCreator');

    // --- Validation ---
    if (!connectedAccount) {
         return NextResponse.json({ error: 'Invalid request: The `account` field is missing from the request body.' }, { status: 400 });
    }
    if (!contentCreator) {
      return NextResponse.json({ error: 'Invalid request: The `contentCreator` query parameter is missing.' }, { status: 400 });
    }
    if (!isAddress(contentCreator) || !isAddress(connectedAccount)) {
      return NextResponse.json({ error: 'Invalid request: `contentCreator` or `account` is not a valid address.' }, { status: 400 });
    }
    if (contentCreator.toLowerCase() === connectedAccount.toLowerCase()) {
      return NextResponse.json({ error: 'You cannot give reputation to yourself.' }, { status: 400 });
    }

    // --- Smart contract interaction ---
    const data = encodeFunctionData({
      abi: abi,
      functionName: 'like', // The contract function is still named 'like'
      args: [contentCreator],
    });

    const tx: TransactionSerializable = {
      to: CONTRACT_ADDRESS,
      data: data,
      chainId: contractChain.id,
      type: 'legacy',
    };

    // Use serializeTransaction from viem instead of wagmi for server-side environments
    const serialized = serializeTransaction(tx);

    const resp: ExecutionResponse = {
      serializedTransaction: serialized,
      chainId: contractChain.name,
    };

    return NextResponse.json(resp, {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Handles OPTIONS requests for CORS preflight.
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
