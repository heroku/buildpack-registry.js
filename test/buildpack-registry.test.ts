import {expect} from 'chai'
import * as nock from 'nock'
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

    let registry = new BuildpackRegistry()
    let result = await registry.requiresTwoFactor('hone/test')

    expect(result.isOk()).to.be.true
    expect(result.unwrapOr(false)).to.be.true
  })

  it('returns false when set', async function () {
    nock('https://buildpack-registry.heroku.com')
      .get('/buildpacks/hone%2Ftest')
      .reply(200, Fixture.buildpack({
        two_factor_authentication: false
      }))

    let registry = new BuildpackRegistry()
    let result = await registry.requiresTwoFactor('hone/test')

    expect(result.isOk()).to.be.true
    expect(result.unwrapOr(true)).to.be.false
  })

  it('handles 404 and other error codes', async function () {
    nock('https://buildpack-registry.heroku.com')
      .get('/buildpacks/hone%2Ftest')
      .reply(404, {})

    let registry = new BuildpackRegistry()
    let result = await registry.requiresTwoFactor('hone/test')

    expect(result.isErr()).to.be.true
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

    let registry = new BuildpackRegistry()
    let result = await registry.info('hone/test')

    expect(result.isOk()).to.be.true
    expect(result.unsafelyUnwrap().support).to.equal('foo@heroku.com')
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

    let registry = new BuildpackRegistry()
    let result = await registry.info('hone/test')

    expect(result.isOk()).to.be.true
    expect(result.unsafelyUnwrap().support).to.equal('https://github.com/hone/test/issues')
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
    let registry = new BuildpackRegistry()
    let result = await registry.info('hone/test')

    expect(result.isOk()).to.be.true
    expect(result.unsafelyUnwrap().support).to.equal('https://support.heroku.com')
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

    let registry = new BuildpackRegistry()
    let result = await registry.info('hone/test')

    expect(result.isOk()).to.be.true
    expect(result.unsafelyUnwrap().support).to.equal('Unsupported by author')
  })
})
