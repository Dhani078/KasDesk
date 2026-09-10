import { BottomNav } from "@/components/BottomNav";

export default function Dashboard() {
  return (
    <main className="flex-1 w-full max-w-md mx-auto pb-24 relative">
      {/* Header / Hero Balance */}
      <section className="px-5 pt-12 pb-8">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary mb-2">Total Net Worth</h2>
        <div className="flex items-baseline gap-1">
          <span className="text-text-secondary font-mono text-xl">Rp</span>
          <h1 className="text-3xl font-medium tracking-tight font-mono tabular-nums text-text-primary">
            14.250.000
          </h1>
        </div>
        <div className="flex items-center gap-4 mt-6">
          <div className="flex-1 bg-surface border border-border-outer p-3 rounded-lg">
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-text-secondary mb-1">Income</div>
            <div className="font-mono text-sm text-accent-income tabular-nums">+4.500.000</div>
          </div>
          <div className="flex-1 bg-surface border border-border-outer p-3 rounded-lg">
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-text-secondary mb-1">Expense</div>
            <div className="font-mono text-sm text-accent-expense tabular-nums">-1.250.000</div>
          </div>
        </div>
      </section>

      {/* Recent Transactions (Grouped Inset Table) */}
      <section className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary">Recent Activity</h2>
          <span className="text-[10px] text-text-secondary underline decoration-border-inner underline-offset-4">View All</span>
        </div>
        
        <div className="bg-surface rounded-lg border border-border-outer overflow-hidden">
          {/* Transaction 1 */}
          <div className="flex items-center justify-between p-4 border-b border-border-inner">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-text-secondary">[FOOD]</span>
              <div>
                <p className="text-sm font-medium text-text-primary">Nasi Goreng Gila</p>
                <p className="text-[10px] text-text-secondary mt-0.5">BCA • 12:30 PM</p>
              </div>
            </div>
            <span className="font-mono text-sm tabular-nums text-accent-expense">-35.000</span>
          </div>

          {/* Transaction 2 */}
          <div className="flex items-center justify-between p-4 border-b border-border-inner">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-text-secondary">[SALARY]</span>
              <div>
                <p className="text-sm font-medium text-text-primary">PT. ABC Tech</p>
                <p className="text-[10px] text-text-secondary mt-0.5">Mandiri • 09:00 AM</p>
              </div>
            </div>
            <span className="font-mono text-sm tabular-nums text-accent-income">+8.000.000</span>
          </div>

          {/* Transaction 3 */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-text-secondary">[XFER]</span>
              <div>
                <p className="text-sm font-medium text-text-primary">To Gopay</p>
                <p className="text-[10px] text-text-secondary mt-0.5">BCA • Yesterday</p>
              </div>
            </div>
            <span className="font-mono text-sm tabular-nums text-accent-transfer">500.000</span>
          </div>
        </div>
      </section>

      {/* Vaults Overview */}
      <section className="px-5 mt-8">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary mb-3">Active Vaults</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface border border-border-outer p-4 rounded-lg">
            <h3 className="text-xs font-medium text-text-primary mb-1">MacBook Pro</h3>
            <div className="font-mono text-xs text-text-secondary tabular-nums mb-3">Rp 8M / 24M</div>
            <div className="h-1 w-full bg-canvas rounded-full overflow-hidden">
              <div className="h-full bg-text-primary w-1/3"></div>
            </div>
          </div>
          <div className="bg-surface border border-border-outer p-4 rounded-lg">
            <h3 className="text-xs font-medium text-text-primary mb-1">Emergency</h3>
            <div className="font-mono text-xs text-text-secondary tabular-nums mb-3">Rp 2M / 10M</div>
            <div className="h-1 w-full bg-canvas rounded-full overflow-hidden">
              <div className="h-full bg-text-primary w-1/5"></div>
            </div>
          </div>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
