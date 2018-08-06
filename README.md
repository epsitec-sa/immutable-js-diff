# Immutable Diff

Create RFC 6902 style patches between Immutable.JS data structures, such as `Maps`, `Lists`, and `Sets`.

## Differences from original
Signature of diff function is
``` javascript
function diff(a, b, p, s)
```
where if s = true, then sequence diffs are ignored and a single block is generated.  
This can be usefull as an optimization.
If s is a string (identification key of all elements), an additional optimization will be performed, 
detecting if all elements of a list have changed (in this case a complete change),
or just some elements (in this case a granular diff)


## Getting Started

Install `immutablediff` using npm or yarn:

``` shell
# npm...
npm install --save immutablediff

# ...or yarn
yarn add immutablediff
```

You can then use it to get the diff ops between you Immutable.JS data structures.

``` javascript
var Immutable = require('immutable');
var diff = require('immutablediff');

var map1 = Immutable.Map({a:1, b:2, c:3});
var map2 = Immutable.Map({a:1, b:2, c:3, d: 4});

diff(map1, map2);
// List [ Map { op: "add", path: "/d", value: 4 } ]
```

The result of `diff` is an Immutable Sequence of operations

## Immutable Patch

If you want to use the resulting diff to apply patches to other Immutable data structures, you can use the package `immutablepatch`. Source code available [here](https://github.com/intelie/immutable-js-patch)
