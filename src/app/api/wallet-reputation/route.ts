import { NextRequest, NextResponse } from 'next/server';
// Use the correct chain for your contract, which is Base Sepolia
import { baseSepolia } from 'viem/chains';
import { createMetadata, Metadata, ValidatedMetadata, ExecutionResponse } from '@sherrylinks/sdk';
import { serialize } from 'wagmi';
import { encodeFunctionData, isAddress, TransactionSerializable } from 'viem';
// Import your contract's ABI
import { abi } from '../../blockchain/abi';

// Your deployed PermanentLike contract address on Base Sepolia
const CONTRACT_ADDRESS = '0xeBCeE50B5Cd15907Cd77D89bCE87823D4d30250F';

/**
 * Handles GET requests to provide metadata for the SherryLink.
 * This defines the UI and functionality that will be presented to the user.
 */
export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const serverUrl = `${protocol}://${host}`;

    // --- Metadata for the PermanentLike contract ---
    const metadata: Metadata = {
      url: 'https://your-app-url.com', // Replace with your application's URL
      icon: 'https://avatars.githubusercontent.com/u/117962315', // Replace with your app's icon
      title: 'Permanent Like',
      baseUrl: serverUrl,
      description: 'Give a permanent, on-chain "like" to an Ethereum content creator.',
      actions: [
        {
          type: 'dynamic',
          label: 'Like Creator',
          description: 'Enter the address of the creator you want to like.',
          // The chain where the contract is deployed
          chains: { source: 'sepolia' },
          // The API path that will handle the transaction creation
          path: `/api/permanent-like`,
          params: [
            {
              name: 'contentCreator',
              label: 'Creator\'s Address',
              type: 'text', // Address is a string
              required: true,
              description: 'Enter the Ethereum address of the content creator to like.',
            },
          ],
        },
      ],
    };

    const validated: ValidatedMetadata = createMetadata(metadata);

    return NextResponse.json(validated, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
    });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create metadata' }, { status: 500 });
  }
}

/**
 * Handles POST requests to create and serialize the blockchain transaction.
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contentCreator = searchParams.get('contentCreator');

    // --- Validation ---
    if (!contentCreator) {
      return NextResponse.json(
        { error: 'The contentCreator address parameter is required' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
      );
    }
    if (!isAddress(contentCreator)) {
        return NextResponse.json(
          { error: 'Invalid Ethereum address provided for contentCreator' },
          { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } },
        );
    }


    // --- Smart contract interaction ---
    // Encode the function call data for the 'like' function
    const data = encodeFunctionData({
      abi: abi,
      functionName: 'like',
      args: [contentCreator], // The argument for the 'like' function is the creator's address
    });

    // --- Create the transaction object ---
    const tx: TransactionSerializable = {
      to: CONTRACT_ADDRESS,
      data: data,
      chainId: baseSepolia.id, // Use the ID for the Base Sepolia chain
      type: 'legacy',
    };

    const serialized = serialize(tx);

    // --- Prepare the response for the SherryLink SDK ---
    const resp: ExecutionResponse = {
      serializedTransaction: serialized,
      chainId: baseSepolia.name, // Use the name of the Base Sepolia chain
    };

    return NextResponse.json(resp, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Handles OPTIONS requests for CORS preflight.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
    },
  });
}
