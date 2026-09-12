import { projectVault } from '@/lib/vaults/projection'
import { formatIDR } from '@/lib/format'

export function VaultProjection({ targetAmount, currentAmount, targetDate }: { targetAmount: number; currentAmount: number; targetDate: string | Date | null }) {
  const projection = projectVault(targetAmount, currentAmount, targetDate)
  if (projection.status === 'completed') return <p className="mt-2 text-xs text-accent-income">Target sudah tercapai. Mantap.</p>
  if (!projection.requiredDaily || !projection.requiredWeekly) return <p className="mt-2 text-xs text-text-secondary">Tambahkan tanggal target untuk melihat rencana setoran harian.</p>
  return <p className="mt-2 text-xs leading-5 text-text-secondary">Butuh sekitar <b className="text-text-primary">{formatIDR(projection.requiredDaily)}/hari</b> atau <b className="text-text-primary">{formatIDR(projection.requiredWeekly)}/minggu</b> selama {projection.daysLeft} hari.</p>
}
