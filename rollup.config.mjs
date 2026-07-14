import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'

import pkg from './package.json' with { type: 'json' }

const toName = (person) => {
  if (typeof person === 'string') return person
  if (person && typeof person === 'object' && typeof person.name === 'string') return person.name
  return undefined
}

const authorAndContributors = [pkg.author, ...(Array.isArray(pkg.contributors) ? pkg.contributors : [pkg.contributors])]
const bannerContributors = authorAndContributors.map(toName).filter(Boolean).join(', ') || 'Unknown contributors'

const bannerText = `/*! *****************************************************************************
  ${pkg.name}
  Version ${pkg.version}

  ${pkg.description}
  Please submit bugs at ${pkg.bugs.url}

  © ${bannerContributors}
  Licence: ${pkg.license}

  This file is auto-generated. Do not edit.
***************************************************************************** */

`

export default [
  {
    input: './src/frontend/Frontend.ts',
    external: ['logger'],
    plugins: [
      typescript({ tsconfig: './tsconfig.json', module: 'ESNext', moduleResolution: 'Bundler' }),
      nodeResolve(),
      commonjs(),
      terser({
        format: {
          comments: false,
          preamble: bannerText.trim()
        }
      })
    ],
    output: {
      banner: bannerText,
      file: `./${pkg.main}`,
      format: 'iife',
      globals: {
        logger: 'Log'
      }
    }
  },
  {
    input: './src/backend/Backend.ts',
    external: ['logger', 'node_helper'],
    plugins: [
      typescript({ tsconfig: './tsconfig.json', module: 'ESNext', moduleResolution: 'Bundler' }),
      nodeResolve(),
      commonjs(),
      terser({
        format: {
          comments: false,
          preamble: bannerText.trim()
        }
      })
    ],
    output: {
      banner: bannerText,
      file: './node_helper.js',
      format: 'cjs'
    }
  }
]
