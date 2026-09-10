import Link from "next/link";
import { Home, Wallet, Goal, Receipt, PieChart } from "lucide-react";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md border-t border-border-outer pb-safe">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
        <Link href="/" className="flex flex-col items-center justify-center w-full h-full text-text-primary">
          <Home className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold tracking-[0.05em] uppercase">Home</span>
        </Link>
        <Link href="/wallets" className="flex flex-col items-center justify-center w-full h-full text-text-secondary hover:text-text-primary transition-colors">
          <Wallet className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold tracking-[0.05em] uppercase">Wallets</span>
        </Link>
        <button className="flex flex-col items-center justify-center w-12 h-12 -mt-6 bg-text-primary text-canvas rounded-lg shadow-lg">
          <Receipt className="w-5 h-5" />
        </button>
        <Link href="/vaults" className="flex flex-col items-center justify-center w-full h-full text-text-secondary hover:text-text-primary transition-colors">
          <Goal className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold tracking-[0.05em] uppercase">Vaults</span>
        </Link>
        <Link href="/insights" className="flex flex-col items-center justify-center w-full h-full text-text-secondary hover:text-text-primary transition-colors">
          <PieChart className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold tracking-[0.05em] uppercase">Insights</span>
        </Link>
      </div>
    </nav>
  );
}
