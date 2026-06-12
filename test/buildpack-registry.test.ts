import {describe, expect, it} from 'vitest'
import nock from 'nock'
nock.disableNetConnect()

import {BuildpackRegistry} from '../src/buildpack-registry'

import {Fixture} from './helpers/fixture'

describe('buildpack-registry#requiresTwoFactor', () => {
  it('returns true when set', async function () {
    nock('https://buildpack-registry.heroku.com')
      .get('/buildpacks/hone%2Ftest')
      .reply(200, Fixture.buildpack({
        two_factor_authentication: true
      }))

    const registry = new BuildpackRegistry()
    const result = await registry.requiresTwoFactor('hone/test')

    expect(result.isOk()).toBe(true)
    expect(result.unwrapOr(false)).toBe(true)
  })

  it('returns false when set', async function () {
    nock('https://buildpack-registry.heroku.com')
      .get('/buildpacks/hone%2Ftest')
      .reply(200, Fixture.buildpack({
        two_factor_authentication: false
      }))

    const registry = new BuildpackRegistry()
    const result = await registry.requiresTwoFactor('hone/test')

    expect(result.isOk()).toBe(true)
    expect(result.unwrapOr(true)).toBe(false)
  })

  it('handles 404 and other error codes', async function () {
    nock('https://buildpack-registry.heroku.com')
      .get('/buildpacks/hone%2Ftest')
      .reply(404, {})

    const registry = new BuildpackRegistry()
    const result = await registry.requiresTwoFactor('hone/test')

    expect(result.isErr()).toBe(true)
  })
})

describe('buildpack-registry#info', () => {
  it('returns support email', async function () {
    nock('https://buildpack-registry.heroku.com')
      .get('/buildpacks/hone%2Ftest')
      .reply(200, Fixture.buildpack({
        support: {
          method: 'email',
          address: 'mailto:foo@heroku.com',
        }
      }))
      .get('/buildpacks/hone%2Ftest/revisions')
      .reply(200, [Fixture.revision()])
      .get('/buildpacks/hone%2Ftest/readme')
      .reply(200, Fixture.readme())

    const registry = new BuildpackRegistry()
    const result = await registry.info('hone/test')

    expect(result.isOk()).toBe(true)
    expect(result.unsafelyUnwrap().support).toBe('foo@heroku.com')
  })

  it('returns support github url', async function () {
    nock('https://buildpack-registry.heroku.com')
      .get('/buildpacks/hone%2Ftest')
      .reply(200, Fixture.buildpack({
        source: {
          type: 'github',
          owner: 'hone',
          repo: 'test',
        },
        support: {
          method: 'github',
          address: null,
        }
      }))
      .get('/buildpacks/hone%2Ftest/revisions')
      .reply(200, [Fixture.revision()])
      .get('/buildpacks/hone%2Ftest/readme')
      .reply(200, Fixture.readme())

    const registry = new BuildpackRegistry()
    const result = await registry.info('hone/test')

    expect(result.isOk()).toBe(true)
    expect(result.unsafelyUnwrap().support).toBe('https://github.com/hone/test/issues')
  })

  it('returns support website', async function () {
    nock('https://buildpack-registry.heroku.com')
      .get('/buildpacks/hone%2Ftest')
      .reply(200, Fixture.buildpack({
        support: {
          method: 'website',
          address: 'https://support.heroku.com',
        }
      }))
      .get('/buildpacks/hone%2Ftest/revisions')
      .reply(200, [Fixture.revision()])
      .get('/buildpacks/hone%2Ftest/readme')
      .reply(200, Fixture.readme())
    const registry = new BuildpackRegistry()
    const result = await registry.info('hone/test')

    expect(result.isOk()).toBe(true)
    expect(result.unsafelyUnwrap().support).toBe('https://support.heroku.com')
  })

  it('returns unsupported', async function () {
    nock('https://buildpack-registry.heroku.com')
      .get('/buildpacks/hone%2Ftest')
      .reply(200, Fixture.buildpack({
        support: {
          method: 'unsupported',
          address: null,
        }
      }))
      .get('/buildpacks/hone%2Ftest/revisions')
      .reply(200, [Fixture.revision()])
      .get('/buildpacks/hone%2Ftest/readme')
      .reply(200, Fixture.readme())

    const registry = new BuildpackRegistry()
    const result = await registry.info('hone/test')

    expect(result.isOk()).toBe(true)
    expect(result.unsafelyUnwrap().support).toBe('Unsupported by author')
  })
})

describe('buildpack-registry#publish', () => {
  it('succeeds with 200 status', async function () {
    nock('https://buildpack-registry.heroku.com')
      .post('/buildpacks/hone%2Ftest/revisions')
      .reply(200, Fixture.revision())

    const registry = new BuildpackRegistry()
    const result = await registry.publish('hone/test', 'main', 'fake-token')

    expect(result.isOk()).toBe(true)
    expect(result.unsafelyUnwrap().id).toBe('8de70dbe-e862-4d51-b906-123ef3bf2fc5')
  })

  it('succeeds with 201 status', async function () {
    nock('https://buildpack-registry.heroku.com')
      .post('/buildpacks/hone%2Ftest/revisions')
      .reply(201, Fixture.revision())

    const registry = new BuildpackRegistry()
    const result = await registry.publish('hone/test', 'main', 'fake-token')

    expect(result.isOk()).toBe(true)
    expect(result.unsafelyUnwrap().id).toBe('8de70dbe-e862-4d51-b906-123ef3bf2fc5')
  })

  it('returns error for non-2xx status', async function () {
    nock('https://buildpack-registry.heroku.com')
      .post('/buildpacks/hone%2Ftest/revisions')
      .reply(422, 'A release is already pending!')

    const registry = new BuildpackRegistry()
    const result = await registry.publish('hone/test', 'main', 'fake-token')

    expect(result.isErr()).toBe(true)
    const error = result.unsafelyUnwrapErr()
    expect(error.status).toBe(422)
    expect(error.description).toBe('A release is already pending!')
  })
})
