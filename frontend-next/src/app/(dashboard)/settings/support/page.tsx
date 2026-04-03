'use client'

import Link from 'next/link'

export default function SettingsSupportPage () {
  return (
    <div className='page-stack'>
      <section className='page-header'>
        <div className='page-header-copy'>
          <p className='app-eyebrow'>Settings / support</p>
          <h1 className='page-title'>Help & Support</h1>
          <p className='page-description'>
            Find quick guidance, account help, and who to contact when you need
            support.
          </p>
        </div>
        <div className='page-header-actions'>
          <Link className='button button-secondary' href='/settings/account'>
            Manage account
          </Link>
        </div>
      </section>

      <section className='panel'>
        <div className='panel-header'>
          <div>
            <h3>Quick help</h3>
            <p className='muted-text'>
              Start with these common support destinations.
            </p>
          </div>
        </div>

        <div className='form-grid form-grid-2'>
          <Link className='button button-ghost' href='/settings/profile'>
            Update profile details
          </Link>
          <Link className='button button-ghost' href='/settings/account'>
            Change account credentials
          </Link>
          <Link className='button button-ghost' href='/settings/roles'>
            View role assignments
          </Link>
          <a className='button button-ghost' href='mailto:support@thehaven.local'>
            Contact support
          </a>
        </div>
      </section>
    </div>
  )
}
