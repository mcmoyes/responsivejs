/*
Copyright (c) 2016 Mark Moyes
License: MIT - See LICENSE
https://github.com/mcmoyes/ResponsiveJs
*/

(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.rjs = factory();
    }

}((typeof window === 'object' && window), function(){
	var instance;

    ResponsiveJsService = function() {
        this.settings = {
            resizeTimeout: 100
        };

        this.breakpoints = [];
        this.subs = {};
        window.addEventListener("resize", debounce(this.onResizeBrowser.bind(this), this.settings.resizeTimeout), true);        
    };

    ResponsiveJsService.prototype.setOptions = function(options) {
    	extend(this.settings, options);
    }

    ResponsiveJsService.prototype.defineBreakpoint = function(id, query, ifFn) {
        // if breakpoint already exists, ignore. (Or possibly, drop?)
        if (_getBreakpointFromId.call(this, id)) {
            console.log('Warning: attempt to redefine an existing breakpoint: ' + id);
            return;
        }
        var newBp = {
            id: id,
            query: query,
            ifFn: ifFn
        };
        newBp.isActive = this.inBreakpoint(newBp);
        this.breakpoints.push(newBp);
    };

    ResponsiveJsService.prototype.removeBreakpoint = function(id) {
        this.breakpoints = this.breakpoints.filter(function(bp) {
            return bp != _getBreakpointFromId(id)
        });
    };

    ResponsiveJsService.prototype.onResizeBrowser = function() {
        var self = this;
        _checkBreakpoints.call(self);
    };

    // accepts breakpoint id (string), or bp object
    ResponsiveJsService.prototype.inBreakpoint = function(bp) {
        if (typeof bp === 'string') {
            bp = _getBreakpointFromId.call(this, bp);
        }

        if (window.matchMedia(bp.query).matches) {
            if (typeof bp.ifFn === 'function') {
                return bp.ifFn();
            } else {
                return true;
            }
        }
        return false; 
    };

    ResponsiveJsService.prototype.onEnter = function(bpId, fn, triggerImmediately) {
        var self = this;
        // triggerImmediately should default to true unless explicitly set to false.
        triggerImmediately = (triggerImmediately === false) ? false : true;
        _subscribe.call(self, 'Enter', bpId, fn, triggerImmediately);
    };

    ResponsiveJsService.prototype.onExit = function(bpId, fn, triggerImmediately) {
        var self = this;
        _subscribe.call(self, 'Exit', bpId, fn, triggerImmediately);    
    };

    ResponsiveJsService.prototype.onWidthChange = function(bpId, fn) {
        var self = this;
        _subscribe.call(self, 'WidthChange', bpId, fn);
    };

    // sugar for onEnter
    ResponsiveJsService.prototype.on = function(bpId, fn, triggerImmediately) {
        this.onEnter(bpId, fn, triggerImmediately);
    };

    ResponsiveJsService.prototype.offEnter = function(bpId, fn) {
        var self = this;
        _unsubscribe.call(self, 'Enter', bpId, fn);
    };

    ResponsiveJsService.prototype.offExit = function(bpId, fn) {
        var self = this;
        _unsubscribe.call(self, 'Exit', bpId, fn);
    };

    ResponsiveJsService.prototype.offWidthChange = function(bpId, fn) {
        var self = this;
        _unsubscribe.call(self, 'WidthChange', bpId, fn);
    };

    var _subscribe = function(evt, bpId, fn, triggerImmediately) {
        if (typeof fn !== 'function') {
            throw('ResponsiveJsService on' + evt + ': fn param is required.');
        }
        // if a sloppy developer accidentally tries to bind same event/fn combo twice,
        // unbind previous instance of same function, so we don't have the same
        // function firing twice.
        // $(document).off(, fn);
        // $(document).on('rjss-' + evt + '-' + bpId, fn);
        
        var subName = _getSubName(evt, bpId);
        
        // Check if subscription type (event name + breakpoint combo) has already been 
        // registered; if not, create an empty array for it.
        if (!this.subs.hasOwnProperty(subName)) {
        	this.subs[subName] = [];
        }

        // check if the subname/function combo already exists, and add to the array if it doesn't.
        var idx = this.subs[subName].indexOf(fn);
        if (idx < 0) {
        	this.subs[subName].push(fn);
        	// check and trigger fn
        	if (triggerImmediately && this.inBreakpoint(bpId)) {
        	    fn();
        	}

        }
    };

    var _unsubscribe = function(evt, bpId, fn) {
        if (typeof fn !== 'function') {
            // Thow an error to silly developer. Otherwise, we'll disable 
            // all subscriptions on this breakpoint.
            throw('ResponsiveJsService off' + evt + ': fn param is required.');
        }

        var subName = _getSubName(evt, bpId);

        if (this.subs.hasOwnProperty(subName)) {
        	var idx = this.subs[subName].indexOf(fn);
        	if (idx > -1) {
        		this.subs[subName].splice(idx, 1);
        	}
        }

    };

    var _trigger = function(subName) {
    	if (this.subs.hasOwnProperty(subName)) {
    		this.subs[subName].forEach(function (fn) {
    			fn();
    		});
    	}	
    };

    var _checkBreakpoints = function() {
        // In order to trigger all exits before an enter, we're going to
        // store events to be triggered in two arrays.
        var exitEvents = [],
            enterEvents = [];

        var self = this;

        self.breakpoints.forEach(function(bp) {
            if (self.inBreakpoint(bp)) {
                if (!bp.isActive) {
                    // entered breakpoint
                    bp.isActive = true;
                    enterEvents.push('rjss-Enter-' + bp.id);
                } else {
                    // width change on current breakpoint
                    _trigger.call(self, 'rjss-WidthChange-' + bp.id);
                }
            } else {
                if (bp.isActive) {
                    // exited breakpoint
                    bp.isActive = false;
                    exitEvents.push('rjss-Exit-' + bp.id);
                }
            }
        });
        // trigger exits
        exitEvents.forEach(function(evt) {
            _trigger.call(self, evt);
        });
        // trigger enters
        enterEvents.forEach(function(evt) {
            _trigger.call(self, evt);
        });
    };


    var _getBreakpointFromId = function(id) {
        return this.breakpoints.find(function(bp) {
            return bp.id == id;
        });
    };

    function _getSubName (evt, bpId) {
    	return 'rjss-' + evt + '-' + bpId;
    }

    //
	// Simplified version of jQuery-like extend.
	// This modifies the object passed as first parameter.
	//

	function extend(obj1, obj2) {
		for (var key in obj2) {
			if (obj2.hasOwnProperty(key)) {
				obj1[key] = obj2[key];
			}
		}


	};

    //
    // David Walsh's Debounce - http://davidwalsh.name/javascript-debounce-function
    //

    function debounce(func, wait, immediate) {
        var timeout;
        
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    /* Polyfills for EMCAScript 2015 */


    /* array.find */

    if (!Array.prototype.find) {
        Array.prototype.find = function(predicate) {
        if (this == null) {
          throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
          value = list[i];
          if (predicate.call(thisArg, value, i, list)) {
            return value;
          }
        }
        return undefined;
      };
    }

    /* array.forEach */

    // Production steps of ECMA-262, Edition 5, 15.4.4.18
    // Reference: http://es5.github.io/#x15.4.4.18
    if (!Array.prototype.forEach) {

      Array.prototype.forEach = function(callback, thisArg) {

        var T, k;

        if (this == null) {
          throw new TypeError(' this is null or not defined');
        }

        // 1. Let O be the result of calling toObject() passing the
        // |this| value as the argument.
        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get() internal
        // method of O with the argument "length".
        // 3. Let len be toUint32(lenValue).
        var len = O.length >>> 0;

        // 4. If isCallable(callback) is false, throw a TypeError exception. 
        // See: http://es5.github.com/#x9.11
        if (typeof callback !== "function") {
          throw new TypeError(callback + ' is not a function');
        }

        // 5. If thisArg was supplied, let T be thisArg; else let
        // T be undefined.
        if (arguments.length > 1) {
          T = thisArg;
        }

        // 6. Let k be 0
        k = 0;

        // 7. Repeat, while k < len
        while (k < len) {

          var kValue;

          // a. Let Pk be ToString(k).
          //    This is implicit for LHS operands of the in operator
          // b. Let kPresent be the result of calling the HasProperty
          //    internal method of O with argument Pk.
          //    This step can be combined with c
          // c. If kPresent is true, then
          if (k in O) {

            // i. Let kValue be the result of calling the Get internal
            // method of O with argument Pk.
            kValue = O[k];

            // ii. Call the Call internal method of callback with T as
            // the this value and argument list containing kValue, k, and O.
            callback.call(T, kValue, k, O);
          }
          // d. Increase k by 1.
          k++;
        }
        // 8. return undefined
      };
    }

    /* array.filter */

    if (!Array.prototype.filter) {
      Array.prototype.filter = function(fun/*, thisArg*/) {
        'use strict';

        if (this === void 0 || this === null) {
          throw new TypeError();
        }

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== 'function') {
          throw new TypeError();
        }

        var res = [];
        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++) {
          if (i in t) {
            var val = t[i];

            // NOTE: Technically this should Object.defineProperty at
            //       the next index, as push can be affected by
            //       properties on Object.prototype and Array.prototype.
            //       But that method's new, and collisions should be
            //       rare, so use the more-compatible alternative.
            if (fun.call(thisArg, val, i, t)) {
              res.push(val);
            }
          }
        }

        return res;
      };
    }

    /* array.includes */

    if (!Array.prototype.includes) {
	  Array.prototype.includes = function(searchElement /*, fromIndex*/) {
	    'use strict';
	    if (this == null) {
	      throw new TypeError('Array.prototype.includes called on null or undefined');
	    }

	    var O = Object(this);
	    var len = parseInt(O.length, 10) || 0;
	    if (len === 0) {
	      return false;
	    }
	    var n = parseInt(arguments[1], 10) || 0;
	    var k;
	    if (n >= 0) {
	      k = n;
	    } else {
	      k = len + n;
	      if (k < 0) {k = 0;}
	    }
	    var currentElement;
	    while (k < len) {
	      currentElement = O[k];
	      if (searchElement === currentElement ||
	         (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
	        return true;
	      }
	      k++;
	    }
	    return false;
	  };
	}

	return (instance = (instance || new ResponsiveJsService()));
}));
