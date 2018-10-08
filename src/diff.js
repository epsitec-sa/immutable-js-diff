'use strict';

var Immutable = require ('immutable');
var utils = require ('./utils');
var lcs = require ('./lcs');
var path = require ('./path');
var concatPath = path.concat,
  escape = path.escape,
  op = utils.op,
  isMap = utils.isMap,
  isIndexed = utils.isIndexed;

var mapDiff = function (a, b, p, s) {
  var ops = [];
  var path = p || '';

  if (Immutable.is (a, b) || a == b == null) {
    return ops;
  }

  var areLists = isIndexed (a) && isIndexed (b);
  var lastKey = null;
  var removeKey = null;

  if (a.forEach) {
    a.forEach (function (aValue, aKey) {
      if (b.has (aKey)) {
        if (isMap (aValue) && isMap (b.get (aKey))) {
          ops = ops.concat (
            mapDiff (aValue, b.get (aKey), concatPath (path, escape (aKey)), s)
          );
        } else if (isIndexed (b.get (aKey)) && isIndexed (aValue)) {
          ops = ops.concat (
            sequenceDiff (
              aValue,
              b.get (aKey),
              concatPath (path, escape (aKey)),
              s
            )
          );
        } else {
          var bValue = b.get ? b.get (aKey) : b;
          var areDifferentValues = aValue !== bValue;
          if (areDifferentValues) {
            ops.push (op ('replace', concatPath (path, escape (aKey)), bValue));
          }
        }
      } else {
        if (areLists) {
          removeKey = lastKey != null && lastKey + 1 === aKey
            ? removeKey
            : aKey;
          ops.push (op ('remove', concatPath (path, escape (removeKey))));
          lastKey = aKey;
        } else {
          ops.push (op ('remove', concatPath (path, escape (aKey))));
        }
      }
    });
  }

  b.forEach (function (bValue, bKey) {
    if (a.has && !a.has (bKey)) {
      ops.push (op ('add', concatPath (path, escape (bKey)), bValue));
    }
  });

  return ops;
};

function _areSameLists (list1, list2, identification) {
  if (list1.size !== list2.size) {
    return false;
  }

  if (list1.size > 0 && !Immutable.Iterable.isIterable (list1.get (0))) {
    // Lists of primitive values, we don't want a granular diff
    return false;
  }
  
  for (let index = 0; index < list1.size; index++) {
    if (
      list1.get (index).get (identification) !==
      list2.get (index).get (identification)
    ) {
      return false;
    }
  }

  return true;
}

var sequenceDiff = function (a, b, p, s) {
  var ops = [];
  var path = p || '';
  if (Immutable.is (a, b) || a == b == null) {
    return ops;
  }

  if (s) {
    if (typeof s === 'string') {
      // elements identification
      if (_areSameLists (a, b, s)) {
        // elements have been modified, therefore a granular diff
        return _granularSequenceDiff (a, b, p, s);
      } else {
        // lists are completely different, so more optimized to ignore sequence diffs
        ops.push (op ('replace', path, b));
      }
    } else {
      // bool
      // ignore sequence diffs
      ops.push (op ('replace', path, b));
    }
  } else {
    return _granularSequenceDiff (a, b, p, s);
  }

  return ops;
};

var _granularSequenceDiff = function (a, b, p, s) {
  var ops = [];
  var path = p || '';
  if (Immutable.is (a, b) || a == b == null) {
    return ops;
  }

  if ((a.count () + 1) * (b.count () + 1) >= 10000) {
    return mapDiff (a, b, p, s);
  }

  var lcsDiff = lcs.diff (a, b);

  var pathIndex = 0;

  lcsDiff.forEach (function (diff) {
    if (diff.op === '=') {
      pathIndex++;
    } else if (diff.op === '!=') {
      if (isMap (diff.val) && isMap (diff.newVal)) {
        var mapDiffs = mapDiff (
          diff.val,
          diff.newVal,
          concatPath (path, pathIndex),
          s
        );
        ops = ops.concat (mapDiffs);
      } else {
        ops.push (op ('replace', concatPath (path, pathIndex), diff.newVal));
      }
      pathIndex++;
    } else if (diff.op === '+') {
      ops.push (op ('add', concatPath (path, pathIndex), diff.val));
      pathIndex++;
    } else if (diff.op === '-') {
      ops.push (op ('remove', concatPath (path, pathIndex)));
    }
  });

  return ops;
};

var primitiveTypeDiff = function (a, b, p) {
  var path = p || '';
  if (a === b) {
    return [];
  } else {
    return [op ('replace', concatPath (path, ''), b)];
  }
};

// s: if true, ignores sequence diffs
// s: if a string, an additional optimization will be computed, detecting
// if all elements of a list have changed (in this case a complete change),
// or just some elements (in this case a granular diff)
var diff = function (a, b, p, s) {
  if (Immutable.is (a, b)) {
    return Immutable.List ();
  }
  if (a != b && (a == null || b == null)) {
    return Immutable.fromJS ([op ('replace', '/', b)]);
  }
  if (isIndexed (a) && isIndexed (b)) {
    return Immutable.fromJS (sequenceDiff (a, b, null, s));
  } else if (isMap (a) && isMap (b)) {
    return Immutable.fromJS (mapDiff (a, b, null, s));
  } else {
    return Immutable.fromJS (primitiveTypeDiff (a, b, p));
  }
};

module.exports = diff;
