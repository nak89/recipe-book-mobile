import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { authErrorKey } from '@/lib/authFeedback'

describe('auth feedback', () => {
  it('recognises rate limiting even when provider prose changes', () => {
    assert.equal(authErrorKey({ status: 429, message: 'Try later' }), 'error.auth.rateLimited')
    assert.equal(authErrorKey({ code: 'over_email_send_rate_limit' }), 'error.auth.rateLimited')
    assert.equal(authErrorKey(new Error('For security purposes, you can only request this after 60 seconds.')), 'error.auth.rateLimited')
  })
  it('recognises unconfirmed emails and bad credentials by structured codes', () => {
    assert.equal(authErrorKey({ code: 'email_not_confirmed' }), 'error.auth.emailNotConfirmed')
    assert.equal(authErrorKey({ code: 'invalid_credentials' }), 'error.auth.invalidCredentials')
  })
  it('recognises fetch failures instead of showing a generic failure', () => {
    assert.equal(authErrorKey(new TypeError('Failed to fetch')), 'error.network')
    assert.equal(authErrorKey(new Error('Network request failed')), 'error.network')
  })
  it('does not expose unknown provider details or trust arbitrary thrown values', () => {
    for (const error of [null, undefined, 'raw server message', { code: 'unknown', message: 'private details' }]) {
      assert.equal(authErrorKey(error), 'error.generic')
    }
  })
})
