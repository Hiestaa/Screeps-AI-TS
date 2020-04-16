## Utils

Collection of utilities

### CLI

Several convenient function that can be called from screeps console by invoking the `cli` global object.

See module for details and exported function documentation for usage.

### Error Mapper

Utility to print stacktraces following typescript sourcemaps in screeps console

### Id

Utility to generate globally unique names (for creeps) or numbers (for whatever reason)

### Logger

Logging utility

### Prototypes

Modification of internal game prototype for convenience reasons.

For instance, add room object position and clickable links when logging them into the screeps console.

### Version

Automatic versioning of the builds. A custom rollup plugin will update this file to define the `VERSION` constant before making each build.
