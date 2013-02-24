/*jshint browser: true, devel: true, unused: false */
/*global */
this.utils = {
  device: {
    type: '',
    orientation: ''
  },
  // @src http://blog.snowfinch.net/post/3254029029/uuid-v4-js
  // @licence Public domain
  uuid : function uuid() {
    /*jshint bitwise: false */
    "use strict";
    var id = "", i, random;
    for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;
      if (i === 8 || i === 12 || i === 16 || i === 20) {
        id += "-";
      }
      id += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
    }
    return id;
  },
  format:  function format(str) {
    "use strict";
    var params = Array.prototype.splice.call(arguments, 1);
    return (str.replace(/%s/g, function () {return params.shift(); }));
  },
  getDeviceType: function getDeviceType() {
    "use strict";
    if (window.matchMedia("(orientation: portrait)").matches) {
      this.device.orientation = 'portrait';
    } else {
      this.device.orientation = 'landscape';
    }
    if (window.matchMedia("(min-width: 768px) and (max-width: 979px)").matches) {
      this.device.type = 'tablet';
    }
    if (window.matchMedia("(max-width: 767px)").matches) {
      this.device.type = 'tablet';
    }
    if (window.matchMedia("(max-width: 480px)").matches) {
      this.device.type = 'phone';
    }
    //if (window.matchMedia("@media (max-width: 979px)").matches) {
    //  this.deviceType = 'phone';
    //}
    if (window.matchMedia("(min-width: 980px)").matches) {
      this.device.type = 'desktop';
    }
  }

};

function DB(dbName, storeName, version) {
  "use strict";
  var idb = window.indexedDD || window.webkitIndexedDB || window.mozIndexedDB,
  db,
  req;

  if ('webkitIndexedDB' in window) {
    window.IDBTransaction = window.webkitIDBTransaction;
    window.IDBKeyRange = window.webkitIDBKeyRange;
  }

  function getStore(mode) {
    mode = mode || 'readonly';
    return db.transaction([storeName], mode).objectStore(storeName);
  }
  function initDb(cb) {
    var request = idb.open(dbName, version);

    request.onsuccess = function (e) {
      db = e.target.result;

      // For old Chromes {
      if (db.setVersion) {
        console.log("in old setVersion");
        if (db.version !== version) {
          req = db.setVersion(version);
          req.onsuccess = function () {
            if (db.objectStoreNames.contains(storeName)) {
              db.deleteObjectStore(storeName);
            }
            db.createObjectStore(storeName, {keyPath: "id"});
            req.result.oncomplete = function (e) {
              if (cb) {
                cb();
              }
            };
          };
        }
      } else {
        // }
        cb();
      }
    };
    request.onupgradeneeded = function (e) {
      db = e.target.result;
      if (db.objectStoreNames.contains(storeName)) {
        db.deleteObjectStore(storeName);
      }

      db.createObjectStore(storeName, {keyPath: "id"});
    };
    request.onerror = function onError(e) {
      console.log("Error on Open", e);
    };
  }

  function set(data, cb) {
    var request = getStore('readwrite').put(data);
    request.onsuccess = function (e) {
      cb();
    };
    request.onerror = function (e) {
      console.log("Error Adding: ", e);
    };
  }
  function read(id, cb) {
    var request, results = [];
    if (typeof id === 'function') {
      cb = id;
      request = getStore().openCursor();
      request.onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor['continue']();
        } else {
          cb(results);
        }
      };
      request.onerror = function (e) {
        console.log("Error on cursor: ", e);
      };
    } else {
      request = getStore().get(id);
      request.onsuccess = function (e) {
        cb(e.target.result);
      };
      request.onerror = function (e) {
        console.log("Error reading", e);
      };
    }
  }
  function remove(id, cb) {
    var request = getStore('readwrite')['delete'](id);
    request.onsuccess = function (e) {
      cb();
    };
    request.onerror = function (e) {
      console.log("Error deleting: ", e);
    };
  }

  return {
    init: initDb,
    set: set,
    read: read,
    remove: remove
  };

}
