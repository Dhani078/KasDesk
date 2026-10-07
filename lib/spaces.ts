import { z } from 'zod'

/**
 * KasDesk Shared Financial Spaces Engine (EPIC 6)
 *
 * Implements:
 * 1. Role-Based Access Control (RBAC): owner, editor, viewer
 * 2. Dual-Ledger Partitioning (Personal vs Shared Space)
 * 3. Member Attribution & Activity Audit Trail
 */

export const SPACE_ROLES = ['owner', 'editor', 'viewer'] as const
export type SpaceRole = (typeof SPACE_ROLES)[number]

export interface SharedSpaceMeta {
  id: string
  name: string
  description?: string | null
  ownerUserId: string
  role: SpaceRole
  memberCount?: number
  createdAt?: Date | string
}

export interface SpaceMemberMeta {
  id: string
  spaceId: string
  userId: string
  role: SpaceRole
  name?: string | null
  email?: string | null
  joinedAt: Date | string
}

export const ACTIVE_SPACE_STORAGE_KEY = 'kasdesk:active-space'
export const ACTIVE_SPACE_EVENT = 'kasdesk:space-changed'

/**
 * Validates if a role can create, edit, or delete transactions/wallets in the space.
 */
export function canMutateSpace(role: SpaceRole): boolean {
  return role === 'owner' || role === 'editor'
}

/**
 * Validates if a role can invite, remove members, or delete the space.
 */
export function canManageSpace(role: SpaceRole): boolean {
  return role === 'owner'
}

/**
 * Formats transaction attribution label.
 *
 * @example
 * formatAttribution('Sarah', false) // => "Dicatat oleh Sarah"
 * formatAttribution('Sarah', true)  // => "Dicatat oleh Anda"
 */
export function formatAttribution(
  creatorName?: string | null,
  isCurrentUser: boolean = false
): string {
  if (isCurrentUser) return 'Dicatat oleh Anda'
  if (creatorName && creatorName.trim()) {
    return `Dicatat oleh ${creatorName.trim()}`
  }
  return 'Dicatat oleh Anggota'
}

export const CreateSpaceSchema = z.object({
  name: z.string().trim().min(1, 'Nama ruang wajib diisi').max(80, 'Nama ruang maksimal 80 karakter'),
  description: z.string().trim().max(255, 'Deskripsi maksimal 255 karakter').optional(),
})

export const AddMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email tidak valid'),
  role: z.enum(['editor', 'viewer']).default('editor'),
})
