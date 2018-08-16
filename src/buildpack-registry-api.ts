import fetch, {Headers, RequestInit, Response} from 'node-fetch'

export {Response} from 'node-fetch'

export type IBody = {
  [property: string]: string
}

export type RevisionStatus = 'pending' | 'published' | 'failed'

export type RevisionBody = {
  id: string,
  buildpack_id: string,
  published_by_email?: string,
  ref?: string,
  tarball?: string,
  status: RevisionStatus,
  error?: string,
  created_at: Date,
  updated_at: Date,
  release: number,
  checksum: string,
  published_by_id: string,
  license: string,
}

export type ReadmeBody = {
  content?: string,
  encoding?: string,
  sha?: string,
}

export type Category = 'languages' | 'tools' | 'packages'

export type BuildpackBody = {
  id: string,
  name: string,
  created_at: Date,
  updated_at: Date,
  description: string,
  category: Category,
  two_factor_authentication: boolean,
  blob_url: string,
  source:
  {
    type: 'github',
    owner: string,
    repo: string,
  },
  support: {
    method: 'github' | 'email' | 'website' | 'unsupported',
    address: string | null
  },
  namespace: string,
  logo: {
    small: {
      url: string,
      width: number,
      height: number,
    }
    medium: {
      url: string,
      width: number,
      height: number,
    }
  }
}

export type HeaderOptions = {
  token?: string,
  secondFactor?: string
}

export class BuildpackRegistryApi {
  static url() {
    if (process.env.HEROKU_BUILDPACK_REGISTRY_URL === undefined) {
      return 'https://buildpack-registry.heroku.com'
    } else {
      return process.env.HEROKU_BUILDPACK_REGISTRY_URL
    }
  }

  static create(): BuildpackRegistryApi {
    return new BuildpackRegistryApi()
  }

  headers(options: HeaderOptions = {}): Headers {
    let defaultHeaders: {[property: string]: string} = {
      Accept: 'application/vnd.heroku+json; version=3.buildpack-registry',
      'Content-Type': 'application/json'
    }
    if (options.token !== undefined) {
      defaultHeaders.Authorization = `Bearer ${options.token}`
    }

    if (options.secondFactor) {
      defaultHeaders['Heroku-Two-Factor-Code'] = options.secondFactor
    }

    if (process.env.HEROKU_HEADERS) {
      let herokuHeaders = JSON.parse(process.env.HEROKU_HEADERS)
      return new Headers({...defaultHeaders, herokuHeaders})
    } else {
      return new Headers(defaultHeaders)
    }
  }

  async post(path: string, body?: IBody, headers?: Headers): Promise<Response> {
    let options: RequestInit = {
      method: 'POST',
      headers: headers ? headers : this.headers(),
    }
    if (body) {
      options.body = JSON.stringify(body)
    }

    return fetch(`${BuildpackRegistryApi.url()}${path}`, options)
  }

  async get(path: string): Promise<Response> {
    return fetch(`${BuildpackRegistryApi.url()}${path}`, {
      headers: this.headers()
    })
  }
}
