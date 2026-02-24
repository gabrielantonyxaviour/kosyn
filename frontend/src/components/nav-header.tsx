"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ConnectButton,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useDisconnect,
  useReadContract,
} from "thirdweb/react";
import { client, patientWallet, providerWallet, chain } from "@/lib/thirdweb";
import { getKosynUSD } from "@/lib/contracts";
import Image from "next/image";
import {
  Wallet,
  Plus,
  LogOut,
  ChevronDown,
  Copy,
  User,
  Loader2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const patientLinks = [
  { href: "/patients/dashboard", label: "Dashboard" },
  { href: "/patients/records", label: "Records" },
  { href: "/patients/consultations", label: "Consultations" },
];

const providerLinks = [
  { href: "/doctors/dashboard", label: "Dashboard" },
  { href: "/doctors/onboarding", label: "Register" },
];

function WalletDropdown({ isProvider }: { isProvider: boolean }) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const activeChain = useActiveWalletChain();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: balance, isLoading: kusdLoading } = useReadContract({
    contract: getKosynUSD(),
    method: "balanceOf",
    params: [account?.address ?? "0x0000000000000000000000000000000000000000"],
    queryOptions: { enabled: !!account },
  });

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const formatted = kusdLoading
    ? ""
    : balance
      ? (Number(balance) / 1e18).toFixed(2)
      : "0.00";
  const chainName =
    activeChain?.id === 43113 ? "Avax Fuji" : `Chain ${activeChain?.id ?? "?"}`;
  const truncated = account
    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    : "";

  if (!account) {
    return (
      <ConnectButton
        client={client}
        wallets={isProvider ? [providerWallet] : [patientWallet]}
        chain={chain}
        connectButton={{
          label: isProvider ? "Connect Wallet" : "Sign In",
          style: { height: "36px" },
        }}
        theme="dark"
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1 text-sm">
          <img
            src="/kusd-logo.png"
            className="h-4 w-4 rounded-full"
            alt="KUSD"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          {kusdLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <span>{formatted} KUSD</span>
          )}
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/50 px-2.5 text-sm transition-colors hover:bg-muted"
          >
            <img
              src={`https://api.dicebear.com/9.x/shapes/svg?seed=${account.address}`}
              className="h-6 w-6 rounded-full shrink-0"
              alt="avatar"
            />
            <span className="text-muted-foreground">{truncated}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-md border border-border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <img
                  src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png"
                  className="h-4 w-4 rounded-full"
                  alt="Avalanche"
                />
                <span className="text-xs text-muted-foreground">
                  {chainName}
                </span>
              </div>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/patients/profile");
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  window.open(
                    `https://testnet.snowtrace.io/address/${account.address}`,
                    "_blank",
                  );
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Wallet className="h-4 w-4" />
                View Wallet
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigator.clipboard.writeText(account.address);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Copy className="h-4 w-4" />
                Copy Address
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/patients/deposit");
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="h-4 w-4" />
                Deposit
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={() => {
                  setOpen(false);
                  if (wallet) disconnect(wallet);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-400 transition-colors hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function NavHeader() {
  const pathname = usePathname();
  const isProvider = pathname.startsWith("/doctors");
  const links = isProvider ? providerLinks : patientLinks;

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/kosyn-logo.png" alt="Kosyn" width={20} height={20} />
          <span>Kosyn</span>
        </Link>
        <nav className="flex flex-1 items-center justify-center gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                pathname === link.href
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <WalletDropdown isProvider={isProvider} />
      </div>
    </header>
  );
}
