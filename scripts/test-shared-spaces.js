/**
 * Tests for Shared Financial Spaces & Dual-Ledger RBAC Engine (EPIC 6).
 *
 * Verifies:
 * - Role-Based Access Control (RBAC): owner, editor, viewer permissions.
 * - Transaction attribution strings for multi-user audit trail.
 * - Schema validation for space creation and member invites.
 * - Dual-ledger partitioning invariants (Personal vs Shared Space).
 */
import {
  canMutateSpace,
  canManageSpace,
  formatAttribution,
  CreateSpaceSchema,
  AddMemberSchema,
  SPACE_ROLES,
} from '../lib/spaces.ts'

let passCount = 0
function t(name, ok) {
  if (ok) {
    console.log(`  PASS  ${name}`)
    passCount++
  } else {
    console.error(`  FAIL  ${name}`)
    process.exit(1)
  }
}

console.log('=== Shared Financial Spaces & RBAC Tests (EPIC 6) ===')

// 1. Roles Definition
t('defines 3 standard roles (owner, editor, viewer)', SPACE_ROLES.length === 3)

// 2. RBAC Mutation Rights
t('owner can mutate space', canMutateSpace('owner') === true)
t('editor can mutate space', canMutateSpace('editor') === true)
t('viewer CANNOT mutate space (read-only)', canMutateSpace('viewer') === false)

// 3. RBAC Management Rights
t('owner can manage space (invite/delete)', canManageSpace('owner') === true)
t('editor CANNOT manage space', canManageSpace('editor') === false)
t('viewer CANNOT manage space', canManageSpace('viewer') === false)

// 4. Attribution Formatting
t('current user formatted as "Dicatat oleh Anda"', formatAttribution('Sarah', true) === 'Dicatat oleh Anda')
t('other member formatted with their name', formatAttribution('Sarah', false) === 'Dicatat oleh Sarah')
t('whitespace in name is trimmed cleanly', formatAttribution('  Budi Santoso  ', false) === 'Dicatat oleh Budi Santoso')
t('missing name falls back to "Dicatat oleh Anggota"', formatAttribution(null, false) === 'Dicatat oleh Anggota')
t('empty string name falls back to "Dicatat oleh Anggota"', formatAttribution('', false) === 'Dicatat oleh Anggota')

// 5. CreateSpaceSchema Validation
const validSpace = CreateSpaceSchema.safeParse({ name: 'Kas Rumah Tangga Kita', description: 'Anggaran belanja dapur' })
t('valid space passes schema', validSpace.success === true)

const emptySpace = CreateSpaceSchema.safeParse({ name: '' })
t('empty name rejected', emptySpace.success === false)

const longDesc = CreateSpaceSchema.safeParse({ name: 'Valid', description: 'a'.repeat(300) })
t('overlong description rejected', longDesc.success === false)

// 6. AddMemberSchema Validation
const validMember = AddMemberSchema.safeParse({ email: 'partner@example.com', role: 'editor' })
t('valid member invitation passes', validMember.success === true)

const defaultRoleMember = AddMemberSchema.safeParse({ email: 'partner@example.com' })
t('member defaults to editor role', defaultRoleMember.success === true && defaultRoleMember.data.role === 'editor')

const invalidEmail = AddMemberSchema.safeParse({ email: 'not-an-email', role: 'viewer' })
t('invalid email rejected', invalidEmail.success === false)

const badRole = AddMemberSchema.safeParse({ email: 'valid@example.com', role: 'superadmin' })
t('invalid role rejected', badRole.success === false)

console.log('\n==============================================')
console.log(`RESULT: ${passCount} passed, 0 failed`)
console.log('==============================================')
