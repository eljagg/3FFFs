/**
 * banks.js — /api/banks endpoints (v25.7.0, ISS-019a / 019b / 021)
 *
 * Public-ish reference for the user's own bank context, plus member-list
 * and manager-assignment endpoints for managers/admins.
 *
 * GET    /api/banks/me            — current user's bank (theme + summary)
 * GET    /api/banks/me/members    — bank members (manager+admin only)
 * POST   /api/banks/me/manages    — admin: assign user A to manage user B
 * DELETE /api/banks/me/manages/:userId — admin: revoke a manager assignment
 *
 * All endpoints are bank-scoped to the requesting user's MEMBER_OF edge,
 * unless the user is admin (admins see across banks per Pattern A
 * default; in Pattern C this collapses to single-bank automatically via
 * effectiveBankId).
 */

import { Router } from 'express'
import { runQuery } from '../lib/neo4j.js'
import { getUser, requireRole } from '../lib/auth.js'
import { effectiveBankId, getDeploymentMode } from '../lib/deployment.js'

const router = Router()

// ---------------------------------------------------------------------------
// GET /api/banks/me — current user's bank theme + summary
// ---------------------------------------------------------------------------
router.get('/me', async (req, res, next) => {
  try {
    const u = getUser(req)
    const rows = await runQuery(
      `MATCH (user:User {id: $userId})
       OPTIONAL MATCH (user)-[:MEMBER_OF]->(b:Bank)
       OPTIONAL MATCH (member:User)-[:MEMBER_OF]->(b)
       OPTIONAL MATCH (mgr:User)-[:MEMBER_OF]->(b) WHERE 'manager' IN mgr.roles
       WITH b, count(DISTINCT member) AS memberCount, count(DISTINCT mgr) AS managerCount
       RETURN b { .* } AS bank, memberCount, managerCount`,
      { userId: u.id }
    )
    const r = rows[0] || {}
    if (!r.bank || !r.bank.id) {
      // No bank assigned — fall back to platform defaults
      return res.json({
        bank: null,
        memberCount: 0,
        managerCount: 0,
        deploymentMode: getDeploymentMode(),
      })
    }
    res.json({
      bank: r.bank,
      memberCount: toJsNumber(r.memberCount),
      managerCount: toJsNumber(r.managerCount),
      deploymentMode: getDeploymentMode(),
    })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// GET /api/banks/me/members — bank-scoped member list (manager + admin)
// ---------------------------------------------------------------------------
router.get('/me/members', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const u = getUser(req)
    const isAdmin = u.roles.includes('admin')

    // Get the requesting user's bank (effectiveBankId handles Pattern C
    // case where it's overridden by env var)
    const myBankRow = await runQuery(
      `MATCH (me:User {id: $userId})-[:MEMBER_OF]->(b:Bank)
       RETURN b.id AS bankId`,
      { userId: u.id }
    )
    const myBankId = effectiveBankId(myBankRow[0]?.bankId)

    if (!myBankId && !isAdmin) {
      return res.status(403).json({ error: 'Manager has no Bank assignment' })
    }

    // Admins (in shared mode) see all banks; managers see only their bank.
    // In dedicated mode, effectiveBankId pins everyone to one bank anyway.
    const queryStr = (isAdmin && getDeploymentMode() === 'shared')
      ? `
        MATCH (member:User)-[:MEMBER_OF]->(b:Bank)
        OPTIONAL MATCH (mgr:User)-[:MANAGES]->(member)
        RETURN member.id AS id, member.email AS email, member.name AS name,
               member.roles AS roles, member.lastSeenAt AS lastSeenAt,
               b.id AS bankId, b.displayName AS bankName,
               collect(DISTINCT { id: mgr.id, email: mgr.email, name: mgr.name }) AS managers
        ORDER BY b.id, member.email
      `
      : `
        MATCH (b:Bank {id: $bankId})<-[:MEMBER_OF]-(member:User)
        OPTIONAL MATCH (mgr:User)-[:MANAGES]->(member)
        RETURN member.id AS id, member.email AS email, member.name AS name,
               member.roles AS roles, member.lastSeenAt AS lastSeenAt,
               b.id AS bankId, b.displayName AS bankName,
               collect(DISTINCT { id: mgr.id, email: mgr.email, name: mgr.name }) AS managers
        ORDER BY member.email
      `

    const rows = await runQuery(queryStr, { bankId: myBankId })

    res.json({
      members: rows.map(r => ({
        id: r.id,
        email: r.email,
        name: r.name,
        roles: r.roles || [],
        lastSeenAt: toJsNumber(r.lastSeenAt),
        bankId: r.bankId,
        bankName: r.bankName,
        managers: (r.managers || []).filter(m => m.id),
      })),
    })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// POST /api/banks/me/manages — admin assigns user A to manage user B
//   Body: { managerId, reportId }
//   Both users must exist; admin can do this cross-bank if shared mode.
//   In dedicated mode both users will already be in the same bank.
// ---------------------------------------------------------------------------
router.post('/me/manages', requireRole('admin'), async (req, res, next) => {
  try {
    const { managerId, reportId } = req.body || {}
    if (!managerId || !reportId) {
      return res.status(400).json({ error: 'managerId and reportId required' })
    }
    if (managerId === reportId) {
      return res.status(400).json({ error: 'Manager cannot manage themselves' })
    }

    // Verify both users exist; verify the manager has the manager role.
    const verify = await runQuery(
      `MATCH (m:User {id: $managerId})
       MATCH (r:User {id: $reportId})
       RETURN m.roles AS managerRoles, r.id AS reportId,
              EXISTS { MATCH (m)-[:MANAGES]->(r) } AS alreadyManages`,
      { managerId, reportId }
    )
    if (!verify.length) {
      return res.status(404).json({ error: 'Manager or report not found' })
    }
    if (!verify[0].managerRoles.includes('manager')) {
      return res.status(400).json({
        error: 'Designated manager does not have the manager role; assign role first.',
      })
    }
    if (verify[0].alreadyManages) {
      return res.json({ ok: true, alreadyExists: true })
    }

    await runQuery(
      `MATCH (m:User {id: $managerId})
       MATCH (r:User {id: $reportId})
       MERGE (m)-[edge:MANAGES]->(r)
       ON CREATE SET edge.assignedAt = timestamp(), edge.assignedBy = $assignerId`,
      { managerId, reportId, assignerId: getUser(req).id }
    )

    res.json({ ok: true, created: true })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// DELETE /api/banks/me/manages/:reportId — admin revokes a MANAGES edge
//   Body: { managerId }
// ---------------------------------------------------------------------------
router.delete('/me/manages/:reportId', requireRole('admin'), async (req, res, next) => {
  try {
    const { managerId } = req.body || {}
    const { reportId } = req.params
    if (!managerId) {
      return res.status(400).json({ error: 'managerId required in body' })
    }
    const result = await runQuery(
      `MATCH (m:User {id: $managerId})-[r:MANAGES]->(report:User {id: $reportId})
       DELETE r
       RETURN count(r) AS deleted`,
      { managerId, reportId }
    )
    res.json({ ok: true, deleted: toJsNumber(result[0]?.deleted) || 0 })
  } catch (e) { next(e) }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toJsNumber(val) {
  if (val == null) return val
  if (typeof val === 'object' && typeof val.toNumber === 'function') return val.toNumber()
  return val
}

export default router
