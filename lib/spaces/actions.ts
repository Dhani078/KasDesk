'use server'

import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sharedSpaces, spaceMembers, users } from '@/lib/db/schema'
import {
  CreateSpaceSchema,
  AddMemberSchema,
  canManageSpace,
  type SharedSpaceMeta,
  type SpaceRole,
} from '@/lib/spaces'
import { requireUserId } from '@/lib/auth/session'
import type { ActionResponse } from '@/lib/types'

/**
 * Returns all shared spaces where current user is a member or owner.
 */
export async function getSharedSpaces(): Promise<SharedSpaceMeta[]> {
  const userId = await requireUserId()
  if (!userId) return []

  const rows = await db
    .select({
      id: sharedSpaces.id,
      name: sharedSpaces.name,
      description: sharedSpaces.description,
      ownerUserId: sharedSpaces.ownerUserId,
      role: spaceMembers.role,
      createdAt: sharedSpaces.createdAt,
    })
    .from(spaceMembers)
    .innerJoin(sharedSpaces, eq(spaceMembers.spaceId, sharedSpaces.id))
    .where(eq(spaceMembers.userId, userId))

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    ownerUserId: r.ownerUserId,
    role: r.role as SpaceRole,
    createdAt: r.createdAt,
  }))
}

/**
 * Creates a new shared space and assigns the creator as owner.
 */
export async function createSharedSpace(
  raw: unknown
): Promise<ActionResponse<{ id: string }>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir. Silakan masuk lagi.' } }
  }

  const parsed = CreateSpaceSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Data tidak valid' },
    }
  }

  const spaceId = crypto.randomUUID()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(sharedSpaces).values({
        id: spaceId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        ownerUserId: userId,
      })

      await tx.insert(spaceMembers).values({
        id: crypto.randomUUID(),
        spaceId,
        userId,
        role: 'owner',
      })
    })

    revalidatePath('/')
    revalidatePath('/wallets')
    return { success: true, data: { id: spaceId } }
  } catch (e) {
    console.error('[createSharedSpace]', e)
    return { success: false, error: { code: 'UNKNOWN', message: 'Gagal membuat ruang bersama.' } }
  }
}

/**
 * Invites a user to the shared space by email (owner only).
 */
export async function addSpaceMember(
  spaceId: string,
  raw: unknown
): Promise<ActionResponse<null>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir.' } }
  }

  const parsed = AddMemberSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Email tidak valid' },
    }
  }

  try {
    // 1. Verify caller is owner of the space
    const [membership] = await db
      .select({ role: spaceMembers.role })
      .from(spaceMembers)
      .where(and(eq(spaceMembers.spaceId, spaceId), eq(spaceMembers.userId, userId)))
      .limit(1)

    if (!membership || !canManageSpace(membership.role as SpaceRole)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Hanya pemilik yang dapat mengundang anggota.' } }
    }

    // 2. Find target user by email
    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1)

    if (!targetUser) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Pengguna dengan email ini tidak ditemukan.' } }
    }

    // 3. Insert or update membership
    await db.insert(spaceMembers).values({
      id: crypto.randomUUID(),
      spaceId,
      userId: targetUser.id,
      role: parsed.data.role,
    })

    revalidatePath('/')
    return { success: true, data: null }
  } catch (e) {
    console.error('[addSpaceMember]', e)
    return { success: false, error: { code: 'UNKNOWN', message: 'Anggota sudah terdaftar atau terjadi kesalahan.' } }
  }
}

/**
 * Removes a member or deletes the entire space if owner.
 */
export async function deleteSharedSpace(spaceId: string): Promise<ActionResponse<null>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir.' } }
  }

  try {
    const [space] = await db
      .select({ ownerUserId: sharedSpaces.ownerUserId })
      .from(sharedSpaces)
      .where(eq(sharedSpaces.id, spaceId))
      .limit(1)

    if (!space || space.ownerUserId !== userId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Hanya pemilik yang dapat menghapus ruang ini.' } }
    }

    await db.transaction(async (tx) => {
      await tx.delete(spaceMembers).where(eq(spaceMembers.spaceId, spaceId))
      await tx.delete(sharedSpaces).where(eq(sharedSpaces.id, spaceId))
    })

    revalidatePath('/')
    return { success: true, data: null }
  } catch (e) {
    console.error('[deleteSharedSpace]', e)
    return { success: false, error: { code: 'UNKNOWN', message: 'Gagal menghapus ruang.' } }
  }
}
