this.utils = {
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
    var params = Array.prototype.splice.call(arguments, 1);
    return (str.replace(/%s/g, function () {return params.shift(); }));
  }

};
