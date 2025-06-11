// blockchain/config.ts
import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [baseSepolia],
  // Add the connectors array
  connectors: [
    injected(), // This handles browser wallets like MetaMask
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
  // Recommended for performance and avoiding race conditions
  ssr: true, 
});