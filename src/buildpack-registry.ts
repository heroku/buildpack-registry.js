import {Result} from 'true-myth'

import {BuildpackBody, BuildpackRegistryApi as Api, HeaderOptions, ReadmeBody, Response, RevisionBody, RevisionStatus} from './buildpack-registry-api'

const BUILDPACK_FORMATTING_MESSAGE = "To specify a buildpack, please format it like the following: namespace/name (e.g. heroku/ruby). Also names can only contain letters, numbers, '_', and '-'."

export type BuildpackSlugResult = {
  result: boolean,
  error?: string
}

export type ResponseError = {
  status: number,
  path: string,
  description: string,
}

export type InfoData = {
  license: string,
  category?: string,
  description: string,
  readme?: string,
  support?: string,
  source?: string,
}

export class BuildpackRegistry {
  static isValidBuildpackSlug(buildpack: string): Result<boolean, string> {
    let nameParts = buildpack.split('/')

    if (nameParts.length === 2 && nameParts[0].length > 0 && nameParts[1].length > 0 && /^[a-z0-9][a-z0-9_\-]*$/i.exec(nameParts[1])) {
      return Result.ok(true)
    } else {
      return Result.err(BUILDPACK_FORMATTING_MESSAGE)
    }
  }

  api: Api

  constructor() {
    this.api = Api.create()
  }

  async requiresTwoFactor(buildpack: string): Promise<Result<boolean, ResponseError>> {
    let path = `/buildpacks/${encodeURIComponent(buildpack)}`
    let response = await this.api.get(path)
    if (response.status === 200) {
      let body = await response.json()
      return Result.ok(body.two_factor_authentication)
    } else {
      return Result.err({
        status: response.status,
        path,
        description: await response.text()
      })
    }
  }

  async publish(buildpack: string, ref: string, token: string, secondFactor?: string): Promise<Result<RevisionBody, ResponseError>> {
    let options: HeaderOptions = {token}
    if (secondFactor !== undefined) {
      options.secondFactor = secondFactor
    }
    let path = `/buildpacks/${encodeURIComponent(buildpack)}/revisions`
    let response = await this.api.post(
      path,
      {ref},
      this.api.headers(options))

    if (response.status === 200) {
      return Result.ok(await response.json())
    } else {
      return Result.err({
        status: response.status,
        path,
        description: await response.text()
      })
    }
  }

  async rollback(buildpack: string, token: string, secondFactor?: string): Promise<Result<RevisionBody, ResponseError>> {
    let options: HeaderOptions = {token}
    if (secondFactor !== undefined) {
      options.secondFactor = secondFactor
    }

    let path = `/buildpacks/${encodeURIComponent(buildpack)}/actions/rollback`
    let response = await this.api.post(
      path,
      undefined,
      this.api.headers(options))
    if (response.status === 200) {
      return Result.ok(await response.json())
    } else {
      return Result.err({
        status: response.status,
        path,
        description: await response.text(),
      })
    }
  }

  async search(namespace?: string, name?: string, description?: string): Promise<Result<BuildpackBody[], ResponseError>> {
    let queryParams: string[] = []
    let queryString = ''

    if (namespace) {
      queryParams = namespace.split(',')
        .map(namespace => `in[namespace][]=${namespace}`)
    }
    if (name) {
      queryParams = queryParams.concat(name.split(',')
        .map(name => `in[name][]=${name}`))
    }
    if (description) {
      queryParams = queryParams.concat(`like[description]=${encodeURIComponent(description)}`)
    }

    if (queryParams.length > 0) {
      queryString = `?${queryParams.join('&')}`
    }

    let path = `/buildpacks${queryString}`
    let response = await this.api.get(path)
    if (response.status === 200) {
      return Result.ok(await response.json())
    } else {
      return Result.err({
        status: response.status,
        path,
        description: await response.text(),
      })
    }
  }

  async info(buildpack: string): Promise<Result<InfoData, ResponseError>> {
    let path = `/buildpacks/${encodeURIComponent(buildpack)}`
    let response = await this.api.get(path)
    if (response.status !== 200) {
      return Result.err({
        status: response.status,
        path,
        description: await response.text(),
      })
    }
    let bp_body = await response.json()

    let result = await this.listVersions(buildpack)
    if (result.isErr()) {
      return Result.err(result.unsafelyUnwrapErr())
    }

    let revisions = result.unsafelyUnwrap()
    let revision = revisions.sort((a: RevisionBody, b: RevisionBody) => {
      return a.release > b.release ? -1 : 1
    })[0]

    path = `/buildpacks/${encodeURIComponent(buildpack)}/readme`
    response = await this.api.get(path)
    if (response.status !== 200) {
      return Result.err({
        status: response.status,
        path,
        description: await response.text()
      })
    }
    let readme: ReadmeBody = await response.json()

    let data: InfoData = {
      description: bp_body.description,
      category: bp_body.category,
      license: revision.license
    }

    if (bp_body.support.method === 'email') {
      data.support = bp_body.support.address.replace('mailto:', '')
    } else if (bp_body.support.method === 'github') {
      data.support = `https://github.com/${bp_body.source.owner}/${bp_body.source.repo}/issues`
    } else if (bp_body.support.method === 'unsupported') {
      data.support = 'Unsupported by author'
    } else {
      data.support = bp_body.support.address
    }

    if (bp_body.source.type === 'github') {
      data.source = `https://github.com/${bp_body.source.owner}/${bp_body.source.repo}`
    }

    if (readme.content) {
      data.readme = `\n${Buffer.from(readme.content, readme.encoding).toString()}`
    }

    return Result.ok(data)
  }

  async archive(buildpack: string, token: string, secondFactor?: string): Promise<Result<BuildpackBody, ResponseError>> {
    let options: HeaderOptions = {token}
    if (secondFactor !== undefined) {
      options.secondFactor = secondFactor
    }
    let path = `/buildpacks/${encodeURIComponent(buildpack)}/actions/archive`
    let response = await this.api.post(path, undefined, this.api.headers(options))
    if (response.status === 200) {
      return Result.ok(await response.json())
    } else {
      return Result.err({
        status: response.status,
        path,
        description: await response.text(),
      })
    }
  }

  async revisionInfo(buildpack: string, revision_id: string): Promise<Result<RevisionBody, ResponseError>> {
    let path = `/buildpacks/${encodeURIComponent(buildpack)}/revisions/${encodeURIComponent(revision_id)}`
    let response = await this.api.get(path)
    if (response.status === 200) {
      return Result.ok(await response.json())
    } else {
      return Result.err({
        status: response.status,
        path,
        description: await response.text(),
      })
    }
  }

  async buildpackExists(buildpack: string): Promise<Response> {
    return this.api.get(`/buildpacks/${encodeURIComponent(buildpack)}`)
  }

  async listVersions(buildpack: string): Promise<Result<RevisionBody[], ResponseError>> {
    let path = `/buildpacks/${encodeURIComponent(buildpack)}/revisions`
    let response = await this.api.get(path)

    if (response.status === 200) {
      return Result.ok(await response.json())
    } else {
      return Result.err({
        status: response.status,
        path,
        description: await response.text()
      })
    }
  }

  async delay(ms: number) {
    // Disable lint is Temporary
    // until this issue is resolved https://github.com/Microsoft/tslint-microsoft-contrib/issues/355#issuecomment-407209401
    // tslint:disable-next-line no-string-based-set-timeout
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async waitForRelease(buildpack_id: string, revision_id: string): Promise<RevisionStatus> {
    let status: RevisionStatus = 'failed'
    let status_count = 0
    let running = true
    while (running) {
      status_count += 1
      let result = await this.revisionInfo(buildpack_id, revision_id)
      if (result.isOk()) {
        let revision = result.unsafelyUnwrap()
        status = revision.status
        if (status !== 'pending') {
          break
        }
        if (status_count === 60) {
          break
        }
      }
      await this.delay(2000)
    }

    return status
  }
}
