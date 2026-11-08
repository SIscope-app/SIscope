// Voluntary donation addresses shown in the footer ("Support SIscope (optional)").
// The section renders nothing while this list is empty. Never add an address that
// didn't come from the SIscope team. Each QR code encodes the address string exactly.

export type DonationAddress = {
  /** Short label shown above the address. */
  label: string;
  /** The address, copied exactly. The QR code encodes this string and nothing else. */
  address: string;
  /** Networks this address accepts. Only these are listed, and the first is preferred. */
  networks: string[];
  /** Assets accepted on those networks. */
  assets: string[];
  /** Optional hint shown after the networks, e.g. "preferred, low fees". */
  note?: string;
};

export const DONATION_ADDRESSES: DonationAddress[] = [
  {
    label: "EVM",
    address: "0x27062bDe161723D66994D268395E50764ADb3DF2",
    networks: ["Base", "Ethereum mainnet"],
    assets: ["ETH", "USDC"],
    note: "Base preferred, low fees",
  },
  {
    label: "Solana",
    address: "5PMUK58mWMSfcHpVyj5hjednhoJrpnBb8qGbtbfTWWa5",
    networks: ["Solana mainnet"],
    assets: ["SOL", "USDC (SPL)"],
  },
];

export const DONATION_COPY = {
  heading: "Support SIscope (optional)",
  line: "SIscope is free forever. If it helps you, a voluntary tip keeps it running.",
  smallPrint: "Donations are voluntary and non-refundable. Send only on the networks listed.",
};
