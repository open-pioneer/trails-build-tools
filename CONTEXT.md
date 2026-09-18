# Trails build tools

The tooling that reads a Trails package's build configuration and turns it into either a running app, through the Vite
plugin, or a publishable npm package, through the package compiler.
It also holds small helpers for pnpm and Changesets.

This document defines the words the project uses for its own concepts.
Where two words exist for the same thing, the preferred one is defined and the rejected ones are listed under _Avoid_.
Use the preferred term in code, in commit messages, in issues, and in documentation.

## Language

### Packages and apps

**Open Pioneer Trails (Trails)**:
The application framework whose packages and apps this tooling builds.
It provides the runtime, the service layer, and the package format.
The short form "Trails" is fine in prose.

**Trails package**:
A package that carries a build config or package metadata and therefore takes part in the analysis of an app.
_Avoid_: pioneer package, framework package, open-pioneer package

**Plain package**:
A package without a build config or package metadata.
The analysis records it and then ignores it.

**Source package**:
A Trails package below the source root, whose configuration is read from its `build.config.mjs`.
_Avoid_: local package, internal package

**Published package**:
A Trails package installed in `node_modules`, whose configuration is read from the package metadata in its
`package.json`.
_Avoid_: external package

**App package**:
The Trails package that produces a Trails app, by default under `src/apps/<name>/`.
It is the root of the dependency graph the plugin analyzes and the only package that may declare overrides.
_Avoid_: application package, app

**App bundle**:
The JavaScript file the Vite plugin emits for an app package, `<name>.js` in the output directory.
A page loads it to register the Trails app.
_Avoid_: app, web component

**Trails app**:
The web component that the Trails runtime creates in a page from an app bundle.
_Avoid_: application, app

**Site**:
An `index.html` page the Vite plugin includes in the build, located at `src/<site>/index.html`.
The root site is `src/index.html`.

**Entry point**:
A module of a Trails package that consumers of the published package may import.
Entry points are listed in the build config, and every other module stays private to the package.

**Services module**:
The module of a Trails package that exports its service classes, `./services` by default.
It is an entry point that the author does not list.

### Configuration and metadata

**Build config**:
The `build.config.mjs` file of a Trails package.
It declares entry points, styles, languages, services, UI references, properties, overrides, and the publish config.
_Avoid_: package config, pioneer config

**Package config**:
The normalized, in-memory form of a package's configuration that the plugin and the compiler work with.
It is created from either the build config of a source package or the package metadata of a published package.

**Publish config**:
The `publishConfig` section of a build config.
It holds the options that only the package compiler reads, such as asset patterns and validation switches.

**Package metadata**:
The serialized configuration that the package compiler writes into a published package's `package.json` under the
`openPioneerFramework` key.
_Avoid_: framework metadata

**Package format version**:
The `1.x.y` version stamped into package metadata, which says which shape of the package metadata a published package
carries.

**Package format target**:
The minor version of the package format that the compiler is asked to emit, `1.0` or `1.1`.
It decides which Trails features a published package may rely on.

**Runtime metadata version**:
The version that the `@open-pioneer/runtime` package declares in its own package metadata to say which app metadata it
can consume.
The plugin reads it to decide what it generates for an app.
_Avoid_: metadata version, which does not say whether the package format or the runtime is meant

**Message locale**:
The key of one message file of a Trails package, `i18n/<message locale>.yaml`, for example `de` or `en`.
The build config lists the message locales a package supports, and an app package's message locales decide which ones
every package in the app must provide.
In code, a bare `locale` inside the tooling always means a message locale.
_Avoid_: language, lang

**Locale**:
The runtime's notion of the user's region and language, for example `de-DE`.
The runtime maps it to a message locale when it picks messages.
The tooling never reads runtime locales, so write "runtime locale" in prose when the distinction matters.

### Plugin and compiler

**Source root**:
The directory the Vite plugin treats as the root of the project, Vite's `root`.
App packages and sites live below it, and a Trails package below it is a source package.

**Workspace root**:
The directory the package compiler treats as the outer bound of a build, the pnpm workspace root or, failing that, the
git root.
Relative imports may not leave it.
_Avoid_: root directory, project root, repository root

**Virtual module**:
A module with an `open-pioneer:` prefix that the Vite plugin generates instead of reading from disk.
The four ids are `open-pioneer:app`, `open-pioneer:react-hooks`, `open-pioneer:source-info` and
`open-pioneer:deployment`.
The package compiler passes them through, so they are resolved again when the published package is used in an app.

### Runtime concepts as the build sees them

The Trails runtime documentation is the authority on how these behave.
The definitions here only say what the build config declares and what the tooling does with it.

**Service**:
A class exported from the services module and declared in the build config with the interfaces it provides and the
references it needs.

**Interface**:
A named contract, written as a plain string such as `runtime.ApiExtension`, that services provide and that services
or the UI reference.
The tooling checks names, never the shape of the contract.

**Provided interface**:
An interface a service lists under `provides`, optionally with a qualifier.

**Reference**:
A service's declared need for an interface, injected into its constructor at runtime.
A reference resolves to one implementation, or to all implementations when declared with `all`.
_Avoid_: dependency, which means an npm dependency here

**Qualifier**:
A string that tells implementations of the same interface apart, set on a provided interface and matched by a
reference.

**UI reference**:
An interface that the package's React code uses, declared under `ui.references`.
The generated React hooks only hand out services that are declared this way.

**Property**:
A named configuration value of a Trails package with a default in the build config, which an app package may
override.
Property metadata marks a property as required.

**Overrides**:
An app package's declaration that switches services in other packages on or off.
Only an app package may declare them.
