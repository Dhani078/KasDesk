'use server'

import {
  getDashboard as getDashboardQuery,
  getSpendingFlow as getSpendingFlowQuery,
  getTopCategories as getTopCategoriesQuery,
} from '@/lib/queries/dashboard'

export async function getDashboard() {
  return getDashboardQuery()
}

export async function getSpendingFlow() {
  return getSpendingFlowQuery()
}

export async function getTopCategories(limit = 5) {
  return getTopCategoriesQuery(limit)
}
