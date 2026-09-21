import { ArrowUpRight, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

import { getNotifiedCompanies } from '../lib/dashboard'
import type { DashboardSeed } from '../types'

interface NotifyViewProps {
  brokenUrls: Set<string>
  seed: DashboardSeed
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const NotifyView = ({ brokenUrls, seed }: NotifyViewProps) => {
  const [query, setQuery] = useState('')
  const companies = useMemo(
    () => getNotifiedCompanies(seed, brokenUrls),
    [brokenUrls, seed],
  )
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = companies
    .map((company) => {
      if (!normalizedQuery || company.name.toLowerCase().includes(normalizedQuery)) {
        return company
      }
      return {
        ...company,
        roles: company.roles.filter((role) =>
          role.role.toLowerCase().includes(normalizedQuery),
        ),
      }
    })
    .filter((company) => company.roles.length > 0)

  return (
    <div className="view">
      <header className="view-header notify-header">
        <div>
          <p className="eyebrow">Curated opportunities</p>
          <h1>Big-tech notify</h1>
          <p>Fresh roles from the companies you want to watch closely.</p>
        </div>
        <label className="search-field">
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">Search companies and roles</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search companies or roles"
            type="search"
            value={query}
          />
        </label>
      </header>

      {filtered.length ? (
        <div className="company-groups">
          {filtered.map((company) => (
            <section className="surface company-group" key={company.name}>
              <div className="company-group-heading">
                <span className="company-mark large" aria-hidden="true">
                  {initials(company.name)}
                </span>
                <div>
                  <h2>{company.name}</h2>
                  <p>{company.blurb || 'Company details are not yet available.'}</p>
                </div>
                <span className="role-count">
                  {company.roles.length}{' '}
                  {company.roles.length === 1 ? 'role' : 'roles'}
                </span>
              </div>
              <div className="role-list">
                {company.roles.map((role, index) => (
                  <div className="role-row" key={`${role.role}-${index}`}>
                    <span>{role.role}</span>
                    {role.url ? (
                      <a
                        aria-label={role.role}
                        href={role.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        View role <ArrowUpRight aria-hidden="true" size={15} />
                      </a>
                    ) : (
                      <span className="link-unavailable">Link unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <span className="empty-icon">
            <Sparkles aria-hidden="true" size={24} />
          </span>
          <h2>No matching roles</h2>
          <p>Try a different company, title, or keyword.</p>
        </section>
      )}
    </div>
  )
}
