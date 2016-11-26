# responsivejs
A small, flexible, unopinionated script that allows you to execute code at media-query breakpoints you define. 

responsivejs provides a simple library for registering breakpoints in your Javascript and subscribing to them with callbacks.

responsivejs is flexible, perhaps to a fault. It was designed to accomodate situations where you have different breakpoints for different situations: A set of breakpoints for touch devices, and another for non-touch; or an individual component that requires its own breakpoints.

## Defining breakpoints

Define breakpoints using a string name and query. Breakpoints can be defined at any point, but as a general rule, you'll want to set up your base breakpoints in `app-start.js` or equivalent:

```javascript
rjs.defineBreakpoint('breakpoint-small', "only screen and (max-width: 767px)");
```

You can also provide an optional function that will be evaluated when the media query is matched. For example, if you're using `modernizr`:

```javascript
var isTouch = function() {
    return $('html').hasClass('touch');
}
rjs.defineBreakpoint('touch-breakpoint-small',	"only screen and (max-width: 767px)", isTouch);
```

You can also remove breakpoints. (This is useful when you're defining them at the component level.)

```javascript
rjs.removeBreakpoint('breakpoint-small');
```

## Events
Once you've defined your breakpoints, ResponsiveJsService will issue a number of events you can subscribe to, for example:

```javascript
rjs.onEnter('desktop-breakpoint-small', activateCarousel, true);
rjs.onExit('desktop-breakpoint-small', deactivateCarousel);
```

## API

### onEnter(*string* breakpointId, *function* callback [, *boolean* checkNow]) 
Subscribes to the `onEnter` event, which fires `callback` when the breakpoint specified by `breakpointId` is entered. 

`checkNow` is optional. By default, subscribing to the onEnter event checks the breakpoint immediately, without waiting for the breakpoint to be entered via a window resize first. If `checkNow` is explicitly set to `false`, the callback will not be fired on registration, even if we're currently in the breakpoint.

### onExit(*string* breakpointId, *function* callback [, *boolean* checkNow]) 
Subscribes to the `onExit` event, which fires `callback` when the breakpoint specified by `breakpointId` is exited. 

In this case, `checkNow` defaults to `false`, so you have to explicitly set it to `true` if you want the check performed at time of registration.

### onWidthChange(*string* breakpointId, *function* callback) 
Subscribes to the `onWidthChange` event, which fires `callback` when the  window has been resized within the current breakpoint.

### offEnter(*string* breakpointId, *function* callback)
### offExit(*string* breakpointId, *function* callback)
### offWidthChange(*string* breakpointId, *function* callback)
Unsubscribes the `callback` function from the breakpoint event.


### inBreakpoint(*string* breakpointId)
Returns `true` if in breakpoint, false otherwise.
