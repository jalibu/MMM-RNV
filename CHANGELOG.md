# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.4.0](https://github.com/jalibu/MMM-RNV/compare/v1.3.1...v1.4.0) (2026-07-05)


### Added

* harden backend retry logic with backoff ([abba2c2](https://github.com/jalibu/MMM-RNV/commit/abba2c2e772ec74d7459e6214517034b005796d1))


### Performance Improvements

* preformat departure times when data is received ([b48c2bd](https://github.com/jalibu/MMM-RNV/commit/b48c2bd9a22c3214e26416fe58e5bdce823f8b1b))


### Documentation

* refine configuration section ([a3cd4b6](https://github.com/jalibu/MMM-RNV/commit/a3cd4b662f7fc758df150bd329383217f9560322))


### Chores

* install missing build dependency ([61d3ca4](https://github.com/jalibu/MMM-RNV/commit/61d3ca40da40d197b4e854522d65d24f701e6e93))
* restore TS checks after eslint upgrade ([fd1390e](https://github.com/jalibu/MMM-RNV/commit/fd1390e78f745f64f234fe17f6704e474a9b6de6))
* update devDependencies ([50f665a](https://github.com/jalibu/MMM-RNV/commit/50f665a0a5ab6c4381b177a3d0f537fef2639568))
* update TypeScript plugin configuration to include module resolution ([d603d6b](https://github.com/jalibu/MMM-RNV/commit/d603d6b42391aa8e9a909caed88978700f37fb2a))


### Code Refactoring

* extract departure mapping into tested module ([8b45d37](https://github.com/jalibu/MMM-RNV/commit/8b45d3741951832160b2c76e95df8b26bfd58986))
* remove moment and use Intl for departure times ([101d702](https://github.com/jalibu/MMM-RNV/commit/101d702dac1225fd7ad021bc2c22ecad58cc893b))

## [1.3.1](https://github.com/jalibu/MMM-RNV/compare/v1.3.0...v1.3.1) (2026-02-07)


### Chores

* add changelog config ([0de3c8b](https://github.com/jalibu/MMM-RNV/commit/0de3c8b8cae7c1d087874a0369f2e635ca9dc877))
* add Code of Conduct ([55bd9b9](https://github.com/jalibu/MMM-RNV/commit/55bd9b96ddb7c3b1b82ee885e716885f2bc763f0))
* add demo config ([804c4ea](https://github.com/jalibu/MMM-RNV/commit/804c4ea41ee8fe4a3094dbfdd89786a864ec2b70))
* update and sort devDependencies ([0eb1bb7](https://github.com/jalibu/MMM-RNV/commit/0eb1bb7cfa52669c7b53ef5a2c847920816dac2a))
* update scripts to use 'node --run' ([5f5629d](https://github.com/jalibu/MMM-RNV/commit/5f5629dac76a10cb83f19a9890e7504cc8a2bfbe))

## [1.3.0](https://github.com/jalibu/MMM-RNV/compare/v1.2.0...v1.3.0) (2025-12-17)


### Features

* add suspend/resume hooks and reduce logging noise ([286d0d3](https://github.com/jalibu/MMM-RNV/commit/286d0d38bb8f8fcd7b74b6a14a447ff37a6a563c))


### Bug Fixes

* correctly compute and display delays ([#6](https://github.com/jalibu/MMM-RNV/issues/6)) ([f689b2a](https://github.com/jalibu/MMM-RNV/commit/f689b2ab2687510426201af1131557a3f49e808b))

## [1.2.0](https://github.com/jalibu/MMM-RNV/compare/v1.1.0...v1.2.0) (2021-12-28)


### Features

* Multi Instance Support - The module now allows multiple instances of it, for alternating station displays with carousel or pages

## [1.1.0](https://github.com/jalibu/MMM-RNV/compare/v1.0.0...v1.1.0) (2021-10-21)


### Features

* Add options to filter platforms and for walking offset departures

## 1.0.0 (2021-09-14)


### Features

* First Release
