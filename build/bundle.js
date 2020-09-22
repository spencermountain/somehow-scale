
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function get_interpolator(a, b) {
        if (a === b || a !== a)
            return () => a;
        const type = typeof a;
        if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
            throw new Error('Cannot interpolate values of different type');
        }
        if (Array.isArray(a)) {
            const arr = b.map((bi, i) => {
                return get_interpolator(a[i], bi);
            });
            return t => arr.map(fn => fn(t));
        }
        if (type === 'object') {
            if (!a || !b)
                throw new Error('Object cannot be null');
            if (is_date(a) && is_date(b)) {
                a = a.getTime();
                b = b.getTime();
                const delta = b - a;
                return t => new Date(a + t * delta);
            }
            const keys = Object.keys(b);
            const interpolators = {};
            keys.forEach(key => {
                interpolators[key] = get_interpolator(a[key], b[key]);
            });
            return t => {
                const result = {};
                keys.forEach(key => {
                    result[key] = interpolators[key](t);
                });
                return result;
            };
        }
        if (type === 'number') {
            const delta = b - a;
            return t => a + t * delta;
        }
        throw new Error(`Cannot interpolate ${type} values`);
    }
    function tweened(value, defaults = {}) {
        const store = writable(value);
        let task;
        let target_value = value;
        function set(new_value, opts) {
            if (value == null) {
                store.set(value = new_value);
                return Promise.resolve();
            }
            target_value = new_value;
            let previous_task = task;
            let started = false;
            let { delay = 0, duration = 400, easing = identity, interpolate = get_interpolator } = assign(assign({}, defaults), opts);
            if (duration === 0) {
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                store.set(value = target_value);
                return Promise.resolve();
            }
            const start = now() + delay;
            let fn;
            task = loop(now => {
                if (now < start)
                    return true;
                if (!started) {
                    fn = interpolate(value, new_value);
                    if (typeof duration === 'function')
                        duration = duration(value, new_value);
                    started = true;
                }
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                const elapsed = now - start;
                if (elapsed > duration) {
                    store.set(value = new_value);
                    return false;
                }
                // @ts-ignore
                store.set(value = fn(easing(elapsed / duration)));
                return true;
            });
            return task.promise;
        }
        return {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe
        };
    }

    const fmt = function (num) {
      const round = (x) => Math.round(x * 10) / 10;
      const decimal = (x) => String(round(x % 1)).replace(/^0/, '');
      if (num > 1000000) {
        num = round(num / 1000000);
        return [num, decimal(num), 'm']
      }
      if (num > 1000) {
        num = round(num / 1000);
        return [num, decimal(num), 'k']
      }
      return [num.toLocaleString(), '']
    };

    const layout = function (arr) {
      if (!arr.length) {
        return []
      }
      // find max
      let max = arr[0].value;
      arr.forEach((o) => {
        if (o.value > max) {
          max = o.value;
        }
      });
      // add percentage of max
      arr.forEach((o) => {
        let percentage = (o.value / max) * 100;
        o.height = percentage;
        o.percentage = parseInt(percentage, 10);
        o.height = o.percentage;
        o.width = '100%';
        if (o.percentage <= 5) {
          o.width = '25%';
          o.rescaled = true;
          o.height = o.percentage * 4;
          if (o.percentage <= 0) {
            o.height = 0;
          }
        }
        o.fmt = fmt(o.value);
      });
      return arr
    };

    /* src/Scale.svelte generated by Svelte v3.24.1 */
    const file = "src/Scale.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1v9k28o-style";
    	style.textContent = ".container.svelte-1v9k28o{height:100%;position:relative;width:100%;display:flex;flex-direction:row;justify-content:space-around;align-items:center;text-align:center;flex-wrap:nowrap;align-self:stretch}.box.svelte-1v9k28o{position:relative;box-sizing:border-box;padding:10px;display:flex;height:100%;flex:1;flex-direction:column;justify-content:flex-end;align-items:flex-end}.label.svelte-1v9k28o{position:relative;color:#b3b7ba;max-width:200px;font-size:11px;margin-top:4px;text-align:right;margin-right:45px}.value.svelte-1v9k28o{position:relative;color:#949a9e;font-size:20px;margin:7px;opacity:0.8;margin-right:45px;justify-content:center;display:flex;align-items:first baseline}.num.svelte-1v9k28o{opacity:1}.unit.svelte-1v9k28o{font-size:12px;margin-left:1px;color:#949a9e}.sized.svelte-1v9k28o{position:relative;width:100%;align-self:center;display:flex;flex-direction:row;justify-content:flex-end;flex-wrap:nowrap}.axis.svelte-1v9k28o{width:6px;margin-left:7px;border-left:1px dashed lightgrey;border-top:1px dashed lightgrey;border-bottom:1px dashed lightgrey;height:100%}.beside.svelte-1v9k28o{display:flex;flex-direction:row;flex-wrap:nowrap;align-items:center;justify-content:flex-start;position:relative;margin-left:5px;box-sizing:border-box;padding-top:12px;padding-bottom:12px;height:100%;width:45px}.percent.svelte-1v9k28o{color:#b3b7ba;font-size:12px;width:40px}.inside.svelte-1v9k28o{color:#fbfbfb}.bar.svelte-1v9k28o{display:flex;box-sizing:border-box;justify-content:flex-end;align-items:flex-end;border-radius:2px;box-shadow:2px 2px 8px 0px rgba(0, 0, 0, 0.2);height:100%}.bar.svelte-1v9k28o:hover{box-shadow:2px 2px 8px 0px steelblue}.ghost.svelte-1v9k28o{height:100%;width:25%}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2NhbGUuc3ZlbHRlIiwic291cmNlcyI6WyJTY2FsZS5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgaW1wb3J0IHsgc2V0Q29udGV4dCB9IGZyb20gJ3N2ZWx0ZSdcbiAgaW1wb3J0IHsgdHdlZW5lZCB9IGZyb20gJ3N2ZWx0ZS9tb3Rpb24nXG4gIGltcG9ydCBsYXlvdXQgZnJvbSAnLi9sYXlvdXQnXG4gIGV4cG9ydCBsZXQgaGVpZ2h0ID0gNDAwXG5cbiAgaW1wb3J0IHsgd3JpdGFibGUgfSBmcm9tICdzdmVsdGUvc3RvcmUnXG4gIGxldCB0aGluZ3MgPSB3cml0YWJsZShbXSlcbiAgc2V0Q29udGV4dCgndGhpbmdzJywgdGhpbmdzKVxuXG4gICQ6IGggPSBoZWlnaHRcbiAgJDogYXJyID0gbGF5b3V0KCR0aGluZ3MsIGgpXG48L3NjcmlwdD5cblxuPHN0eWxlPlxuICAuY29udGFpbmVyIHtcbiAgICBoZWlnaHQ6IDEwMCU7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgZmxleC1kaXJlY3Rpb246IHJvdztcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWFyb3VuZDtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICBmbGV4LXdyYXA6IG5vd3JhcDtcbiAgICBhbGlnbi1zZWxmOiBzdHJldGNoO1xuICB9XG4gIC5ib3gge1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICAgIHBhZGRpbmc6IDEwcHg7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBoZWlnaHQ6IDEwMCU7XG4gICAgZmxleDogMTtcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuICAgIGp1c3RpZnktY29udGVudDogZmxleC1lbmQ7XG4gICAgYWxpZ24taXRlbXM6IGZsZXgtZW5kO1xuICB9XG4gIC5sYWJlbCB7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIGNvbG9yOiAjYjNiN2JhO1xuICAgIG1heC13aWR0aDogMjAwcHg7XG4gICAgZm9udC1zaXplOiAxMXB4O1xuICAgIG1hcmdpbi10b3A6IDRweDtcbiAgICB0ZXh0LWFsaWduOiByaWdodDtcbiAgICBtYXJnaW4tcmlnaHQ6IDQ1cHg7XG4gIH1cbiAgLnZhbHVlIHtcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgY29sb3I6ICM5NDlhOWU7XG4gICAgZm9udC1zaXplOiAyMHB4O1xuICAgIG1hcmdpbjogN3B4O1xuICAgIG9wYWNpdHk6IDAuODtcbiAgICBtYXJnaW4tcmlnaHQ6IDQ1cHg7XG4gICAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBhbGlnbi1pdGVtczogZmlyc3QgYmFzZWxpbmU7XG4gIH1cbiAgLm51bSB7XG4gICAgb3BhY2l0eTogMTtcbiAgfVxuICAudW5pdCB7XG4gICAgZm9udC1zaXplOiAxMnB4O1xuICAgIG1hcmdpbi1sZWZ0OiAxcHg7XG4gICAgY29sb3I6ICM5NDlhOWU7XG4gIH1cbiAgLyogdGhlIGFjdHVhbCBiYXIgKi9cbiAgLnNpemVkIHtcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgd2lkdGg6IDEwMCU7XG4gICAgYWxpZ24tc2VsZjogY2VudGVyO1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgZmxleC1kaXJlY3Rpb246IHJvdztcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IGZsZXgtZW5kO1xuICAgIGZsZXgtd3JhcDogbm93cmFwO1xuICB9XG4gIC5heGlzIHtcbiAgICB3aWR0aDogNnB4O1xuICAgIG1hcmdpbi1sZWZ0OiA3cHg7XG4gICAgYm9yZGVyLWxlZnQ6IDFweCBkYXNoZWQgbGlnaHRncmV5O1xuICAgIGJvcmRlci10b3A6IDFweCBkYXNoZWQgbGlnaHRncmV5O1xuICAgIGJvcmRlci1ib3R0b206IDFweCBkYXNoZWQgbGlnaHRncmV5O1xuICAgIGhlaWdodDogMTAwJTtcbiAgfVxuICAuYmVzaWRlIHtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGZsZXgtZGlyZWN0aW9uOiByb3c7XG4gICAgZmxleC13cmFwOiBub3dyYXA7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IGZsZXgtc3RhcnQ7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIG1hcmdpbi1sZWZ0OiA1cHg7XG4gICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICBwYWRkaW5nLXRvcDogMTJweDtcbiAgICBwYWRkaW5nLWJvdHRvbTogMTJweDtcbiAgICBoZWlnaHQ6IDEwMCU7XG4gICAgd2lkdGg6IDQ1cHg7XG4gIH1cbiAgLnBlcmNlbnQge1xuICAgIGNvbG9yOiAjYjNiN2JhO1xuICAgIGZvbnQtc2l6ZTogMTJweDtcbiAgICB3aWR0aDogNDBweDtcbiAgfVxuICAuaW5zaWRlIHtcbiAgICBjb2xvcjogI2ZiZmJmYjtcbiAgfVxuICAuYmFyIHtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gICAganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDtcbiAgICBhbGlnbi1pdGVtczogZmxleC1lbmQ7XG4gICAgYm9yZGVyLXJhZGl1czogMnB4O1xuICAgIGJveC1zaGFkb3c6IDJweCAycHggOHB4IDBweCByZ2JhKDAsIDAsIDAsIDAuMik7XG4gICAgaGVpZ2h0OiAxMDAlO1xuICB9XG4gIC5iYXI6aG92ZXIge1xuICAgIGJveC1zaGFkb3c6IDJweCAycHggOHB4IDBweCBzdGVlbGJsdWU7XG4gIH1cbiAgLmdob3N0IHtcbiAgICBoZWlnaHQ6IDEwMCU7XG4gICAgd2lkdGg6IDI1JTtcbiAgfVxuPC9zdHlsZT5cblxuPCEtLSA8cHJlPntKU09OLnN0cmluZ2lmeShhcnIsIG51bGwsIDIpfTwvcHJlPiAtLT5cbjxkaXYgY2xhc3M9XCJjb250YWluZXJcIiBzdHlsZT1cImhlaWdodDp7aH1weDtcIj5cbiAgeyNlYWNoIGFyciBhcyBiYXJ9XG4gICAgPGRpdiBjbGFzcz1cImJveFwiPlxuICAgICAgPCEtLSB0b3AgbnVtYmVyIC0tPlxuICAgICAgPGRpdiBjbGFzcz1cInZhbHVlXCIgc3R5bGU9XCJib3JkZXItYm90dG9tOiAycHggc29saWQge2Jhci5jb2xvcn07XCI+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwibnVtXCI+e2Jhci5mbXRbMF19PC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInVuaXRcIj57YmFyLmZtdFsyXSB8fCAnJ308L3NwYW4+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJzaXplZFwiIHN0eWxlPVwiaGVpZ2h0OntiYXIuaGVpZ2h0fSU7IFwiPlxuICAgICAgICB7I2lmIGJhci5yZXNjYWxlZH1cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZ2hvc3RcIiAvPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJnaG9zdFwiIC8+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImdob3N0XCIgLz5cbiAgICAgICAgey9pZn1cbiAgICAgICAgPGRpdlxuICAgICAgICAgIGNsYXNzPVwiYmFyXCJcbiAgICAgICAgICBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6e2Jhci5jb2xvcn07IHdpZHRoOntiYXIud2lkdGh9OyBtYXgtd2lkdGg6e2Jhci53aWR0aH07XCI+XG4gICAgICAgICAgeyNpZiBiYXIucmVzY2FsZWQgJiYgYmFyLnBlcmNlbnRhZ2UgIT09IDB9XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW5zaWRlXCI+e2Jhci5wZXJjZW50YWdlICE9PSAxMDAgPyBiYXIucGVyY2VudGFnZSArICclJyA6ICcnfTwvZGl2PlxuICAgICAgICAgIHsvaWZ9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmVzaWRlXCI+XG4gICAgICAgICAgeyNpZiBiYXIucGVyY2VudGFnZSAhPT0gMTAwICYmIGJhci5yZXNjYWxlZCAhPT0gdHJ1ZX1cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJheGlzXCIgLz5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwZXJjZW50XCI+e2Jhci5wZXJjZW50YWdlICE9PSAxMDAgPyBiYXIucGVyY2VudGFnZSArICclJyA6ICcnfTwvZGl2PlxuICAgICAgICAgIHsvaWZ9XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgICA8IS0tIGJvdHRvbSBsYWJlbCAtLT5cbiAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPntiYXIubGFiZWx9PC9kaXY+XG4gICAgPC9kaXY+XG4gIHsvZWFjaH1cbjwvZGl2PlxuPHNsb3QgLz5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFlRSxVQUFVLGVBQUMsQ0FBQyxBQUNWLE1BQU0sQ0FBRSxJQUFJLENBQ1osUUFBUSxDQUFFLFFBQVEsQ0FDbEIsS0FBSyxDQUFFLElBQUksQ0FDWCxPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxHQUFHLENBQ25CLGVBQWUsQ0FBRSxZQUFZLENBQzdCLFdBQVcsQ0FBRSxNQUFNLENBQ25CLFVBQVUsQ0FBRSxNQUFNLENBQ2xCLFNBQVMsQ0FBRSxNQUFNLENBQ2pCLFVBQVUsQ0FBRSxPQUFPLEFBQ3JCLENBQUMsQUFDRCxJQUFJLGVBQUMsQ0FBQyxBQUNKLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLFVBQVUsQ0FBRSxVQUFVLENBQ3RCLE9BQU8sQ0FBRSxJQUFJLENBQ2IsT0FBTyxDQUFFLElBQUksQ0FDYixNQUFNLENBQUUsSUFBSSxDQUNaLElBQUksQ0FBRSxDQUFDLENBQ1AsY0FBYyxDQUFFLE1BQU0sQ0FDdEIsZUFBZSxDQUFFLFFBQVEsQ0FDekIsV0FBVyxDQUFFLFFBQVEsQUFDdkIsQ0FBQyxBQUNELE1BQU0sZUFBQyxDQUFDLEFBQ04sUUFBUSxDQUFFLFFBQVEsQ0FDbEIsS0FBSyxDQUFFLE9BQU8sQ0FDZCxTQUFTLENBQUUsS0FBSyxDQUNoQixTQUFTLENBQUUsSUFBSSxDQUNmLFVBQVUsQ0FBRSxHQUFHLENBQ2YsVUFBVSxDQUFFLEtBQUssQ0FDakIsWUFBWSxDQUFFLElBQUksQUFDcEIsQ0FBQyxBQUNELE1BQU0sZUFBQyxDQUFDLEFBQ04sUUFBUSxDQUFFLFFBQVEsQ0FDbEIsS0FBSyxDQUFFLE9BQU8sQ0FDZCxTQUFTLENBQUUsSUFBSSxDQUNmLE1BQU0sQ0FBRSxHQUFHLENBQ1gsT0FBTyxDQUFFLEdBQUcsQ0FDWixZQUFZLENBQUUsSUFBSSxDQUNsQixlQUFlLENBQUUsTUFBTSxDQUN2QixPQUFPLENBQUUsSUFBSSxDQUNiLFdBQVcsQ0FBRSxLQUFLLENBQUMsUUFBUSxBQUM3QixDQUFDLEFBQ0QsSUFBSSxlQUFDLENBQUMsQUFDSixPQUFPLENBQUUsQ0FBQyxBQUNaLENBQUMsQUFDRCxLQUFLLGVBQUMsQ0FBQyxBQUNMLFNBQVMsQ0FBRSxJQUFJLENBQ2YsV0FBVyxDQUFFLEdBQUcsQ0FDaEIsS0FBSyxDQUFFLE9BQU8sQUFDaEIsQ0FBQyxBQUVELE1BQU0sZUFBQyxDQUFDLEFBQ04sUUFBUSxDQUFFLFFBQVEsQ0FDbEIsS0FBSyxDQUFFLElBQUksQ0FDWCxVQUFVLENBQUUsTUFBTSxDQUNsQixPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxHQUFHLENBQ25CLGVBQWUsQ0FBRSxRQUFRLENBQ3pCLFNBQVMsQ0FBRSxNQUFNLEFBQ25CLENBQUMsQUFDRCxLQUFLLGVBQUMsQ0FBQyxBQUNMLEtBQUssQ0FBRSxHQUFHLENBQ1YsV0FBVyxDQUFFLEdBQUcsQ0FDaEIsV0FBVyxDQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUNqQyxVQUFVLENBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQ2hDLGFBQWEsQ0FBRSxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FDbkMsTUFBTSxDQUFFLElBQUksQUFDZCxDQUFDLEFBQ0QsT0FBTyxlQUFDLENBQUMsQUFDUCxPQUFPLENBQUUsSUFBSSxDQUNiLGNBQWMsQ0FBRSxHQUFHLENBQ25CLFNBQVMsQ0FBRSxNQUFNLENBQ2pCLFdBQVcsQ0FBRSxNQUFNLENBQ25CLGVBQWUsQ0FBRSxVQUFVLENBQzNCLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLFdBQVcsQ0FBRSxHQUFHLENBQ2hCLFVBQVUsQ0FBRSxVQUFVLENBQ3RCLFdBQVcsQ0FBRSxJQUFJLENBQ2pCLGNBQWMsQ0FBRSxJQUFJLENBQ3BCLE1BQU0sQ0FBRSxJQUFJLENBQ1osS0FBSyxDQUFFLElBQUksQUFDYixDQUFDLEFBQ0QsUUFBUSxlQUFDLENBQUMsQUFDUixLQUFLLENBQUUsT0FBTyxDQUNkLFNBQVMsQ0FBRSxJQUFJLENBQ2YsS0FBSyxDQUFFLElBQUksQUFDYixDQUFDLEFBQ0QsT0FBTyxlQUFDLENBQUMsQUFDUCxLQUFLLENBQUUsT0FBTyxBQUNoQixDQUFDLEFBQ0QsSUFBSSxlQUFDLENBQUMsQUFDSixPQUFPLENBQUUsSUFBSSxDQUNiLFVBQVUsQ0FBRSxVQUFVLENBQ3RCLGVBQWUsQ0FBRSxRQUFRLENBQ3pCLFdBQVcsQ0FBRSxRQUFRLENBQ3JCLGFBQWEsQ0FBRSxHQUFHLENBQ2xCLFVBQVUsQ0FBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDOUMsTUFBTSxDQUFFLElBQUksQUFDZCxDQUFDLEFBQ0QsbUJBQUksTUFBTSxBQUFDLENBQUMsQUFDVixVQUFVLENBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsQUFDdkMsQ0FBQyxBQUNELE1BQU0sZUFBQyxDQUFDLEFBQ04sTUFBTSxDQUFFLElBQUksQ0FDWixLQUFLLENBQUUsR0FBRyxBQUNaLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (135:8) {#if bar.rescaled}
    function create_if_block_2(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			attr_dev(div0, "class", "ghost svelte-1v9k28o");
    			add_location(div0, file, 135, 10, 2861);
    			attr_dev(div1, "class", "ghost svelte-1v9k28o");
    			add_location(div1, file, 136, 10, 2893);
    			attr_dev(div2, "class", "ghost svelte-1v9k28o");
    			add_location(div2, file, 137, 10, 2925);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(135:8) {#if bar.rescaled}",
    		ctx
    	});

    	return block;
    }

    // (143:10) {#if bar.rescaled && bar.percentage !== 0}
    function create_if_block_1(ctx) {
    	let div;

    	let t_value = (/*bar*/ ctx[7].percentage !== 100
    	? /*bar*/ ctx[7].percentage + "%"
    	: "") + "";

    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "inside svelte-1v9k28o");
    			add_location(div, file, 143, 12, 3152);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*arr*/ 2 && t_value !== (t_value = (/*bar*/ ctx[7].percentage !== 100
    			? /*bar*/ ctx[7].percentage + "%"
    			: "") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(143:10) {#if bar.rescaled && bar.percentage !== 0}",
    		ctx
    	});

    	return block;
    }

    // (148:10) {#if bar.percentage !== 100 && bar.rescaled !== true}
    function create_if_block(ctx) {
    	let div0;
    	let t0;
    	let div1;

    	let t1_value = (/*bar*/ ctx[7].percentage !== 100
    	? /*bar*/ ctx[7].percentage + "%"
    	: "") + "";

    	let t1;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = text(t1_value);
    			attr_dev(div0, "class", "axis svelte-1v9k28o");
    			add_location(div0, file, 148, 12, 3367);
    			attr_dev(div1, "class", "percent svelte-1v9k28o");
    			add_location(div1, file, 149, 12, 3400);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*arr*/ 2 && t1_value !== (t1_value = (/*bar*/ ctx[7].percentage !== 100
    			? /*bar*/ ctx[7].percentage + "%"
    			: "") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(148:10) {#if bar.percentage !== 100 && bar.rescaled !== true}",
    		ctx
    	});

    	return block;
    }

    // (127:2) {#each arr as bar}
    function create_each_block(ctx) {
    	let div5;
    	let div0;
    	let span0;
    	let t0_value = /*bar*/ ctx[7].fmt[0] + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = (/*bar*/ ctx[7].fmt[2] || "") + "";
    	let t2;
    	let t3;
    	let div3;
    	let t4;
    	let div1;
    	let t5;
    	let div2;
    	let t6;
    	let div4;
    	let t7_value = /*bar*/ ctx[7].label + "";
    	let t7;
    	let t8;
    	let if_block0 = /*bar*/ ctx[7].rescaled && create_if_block_2(ctx);
    	let if_block1 = /*bar*/ ctx[7].rescaled && /*bar*/ ctx[7].percentage !== 0 && create_if_block_1(ctx);
    	let if_block2 = /*bar*/ ctx[7].percentage !== 100 && /*bar*/ ctx[7].rescaled !== true && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			div3 = element("div");
    			if (if_block0) if_block0.c();
    			t4 = space();
    			div1 = element("div");
    			if (if_block1) if_block1.c();
    			t5 = space();
    			div2 = element("div");
    			if (if_block2) if_block2.c();
    			t6 = space();
    			div4 = element("div");
    			t7 = text(t7_value);
    			t8 = space();
    			attr_dev(span0, "class", "num svelte-1v9k28o");
    			add_location(span0, file, 130, 8, 2663);
    			attr_dev(span1, "class", "unit svelte-1v9k28o");
    			add_location(span1, file, 131, 8, 2709);
    			attr_dev(div0, "class", "value svelte-1v9k28o");
    			set_style(div0, "border-bottom", "2px solid " + /*bar*/ ctx[7].color);
    			add_location(div0, file, 129, 6, 2589);
    			attr_dev(div1, "class", "bar svelte-1v9k28o");
    			set_style(div1, "background-color", /*bar*/ ctx[7].color);
    			set_style(div1, "width", /*bar*/ ctx[7].width);
    			set_style(div1, "max-width", /*bar*/ ctx[7].width);
    			add_location(div1, file, 139, 8, 2969);
    			attr_dev(div2, "class", "beside svelte-1v9k28o");
    			add_location(div2, file, 146, 8, 3270);
    			attr_dev(div3, "class", "sized svelte-1v9k28o");
    			set_style(div3, "height", /*bar*/ ctx[7].height + "%");
    			add_location(div3, file, 133, 6, 2773);
    			attr_dev(div4, "class", "label svelte-1v9k28o");
    			add_location(div4, file, 154, 6, 3558);
    			attr_dev(div5, "class", "box svelte-1v9k28o");
    			add_location(div5, file, 127, 4, 2539);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div0, span0);
    			append_dev(span0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, span1);
    			append_dev(span1, t2);
    			append_dev(div5, t3);
    			append_dev(div5, div3);
    			if (if_block0) if_block0.m(div3, null);
    			append_dev(div3, t4);
    			append_dev(div3, div1);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			if (if_block2) if_block2.m(div2, null);
    			append_dev(div5, t6);
    			append_dev(div5, div4);
    			append_dev(div4, t7);
    			append_dev(div5, t8);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*arr*/ 2 && t0_value !== (t0_value = /*bar*/ ctx[7].fmt[0] + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*arr*/ 2 && t2_value !== (t2_value = (/*bar*/ ctx[7].fmt[2] || "") + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*arr*/ 2) {
    				set_style(div0, "border-bottom", "2px solid " + /*bar*/ ctx[7].color);
    			}

    			if (/*bar*/ ctx[7].rescaled) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div3, t4);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*bar*/ ctx[7].rescaled && /*bar*/ ctx[7].percentage !== 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*arr*/ 2) {
    				set_style(div1, "background-color", /*bar*/ ctx[7].color);
    			}

    			if (dirty & /*arr*/ 2) {
    				set_style(div1, "width", /*bar*/ ctx[7].width);
    			}

    			if (dirty & /*arr*/ 2) {
    				set_style(div1, "max-width", /*bar*/ ctx[7].width);
    			}

    			if (/*bar*/ ctx[7].percentage !== 100 && /*bar*/ ctx[7].rescaled !== true) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					if_block2.m(div2, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*arr*/ 2) {
    				set_style(div3, "height", /*bar*/ ctx[7].height + "%");
    			}

    			if (dirty & /*arr*/ 2 && t7_value !== (t7_value = /*bar*/ ctx[7].label + "")) set_data_dev(t7, t7_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(127:2) {#each arr as bar}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let t;
    	let current;
    	let each_value = /*arr*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const default_slot_template = /*$$slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "container svelte-1v9k28o");
    			set_style(div, "height", /*h*/ ctx[0] + "px");
    			add_location(div, file, 125, 0, 2468);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			insert_dev(target, t, anchor);

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*arr*/ 2) {
    				each_value = /*arr*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (!current || dirty & /*h*/ 1) {
    				set_style(div, "height", /*h*/ ctx[0] + "px");
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $things;
    	let { height = 400 } = $$props;
    	let things = writable([]);
    	validate_store(things, "things");
    	component_subscribe($$self, things, value => $$invalidate(6, $things = value));
    	setContext("things", things);
    	const writable_props = ["height"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Scale> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Scale", $$slots, ['default']);

    	$$self.$$set = $$props => {
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		setContext,
    		tweened,
    		layout,
    		height,
    		writable,
    		things,
    		h,
    		arr,
    		$things
    	});

    	$$self.$inject_state = $$props => {
    		if ("height" in $$props) $$invalidate(3, height = $$props.height);
    		if ("things" in $$props) $$invalidate(2, things = $$props.things);
    		if ("h" in $$props) $$invalidate(0, h = $$props.h);
    		if ("arr" in $$props) $$invalidate(1, arr = $$props.arr);
    	};

    	let h;
    	let arr;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*height*/ 8) {
    			 $$invalidate(0, h = height);
    		}

    		if ($$self.$$.dirty & /*$things, h*/ 65) {
    			 $$invalidate(1, arr = layout($things));
    		}
    	};

    	return [h, arr, things, height, $$scope, $$slots];
    }

    class Scale extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1v9k28o-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, { height: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Scale",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get height() {
    		throw new Error("<Scale>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Scale>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var spencerColor = createCommonjsModule(function (module, exports) {
    !function(e){module.exports=e();}(function(){return function u(i,a,c){function f(r,e){if(!a[r]){if(!i[r]){var o="function"==typeof commonjsRequire&&commonjsRequire;if(!e&&o)return o(r,!0);if(d)return d(r,!0);var n=new Error("Cannot find module '"+r+"'");throw n.code="MODULE_NOT_FOUND",n}var t=a[r]={exports:{}};i[r][0].call(t.exports,function(e){return f(i[r][1][e]||e)},t,t.exports,u,i,a,c);}return a[r].exports}for(var d="function"==typeof commonjsRequire&&commonjsRequire,e=0;e<c.length;e++)f(c[e]);return f}({1:[function(e,r,o){r.exports={blue:"#6699cc",green:"#6accb2",yellow:"#e1e6b3",red:"#cc7066",pink:"#F2C0BB",brown:"#705E5C",orange:"#cc8a66",purple:"#d8b3e6",navy:"#335799",olive:"#7f9c6c",fuscia:"#735873",beige:"#e6d7b3",slate:"#8C8C88",suede:"#9c896c",burnt:"#603a39",sea:"#50617A",sky:"#2D85A8",night:"#303b50",rouge:"#914045",grey:"#838B91",mud:"#C4ABAB",royal:"#275291",cherry:"#cc6966",tulip:"#e6b3bc",rose:"#D68881",fire:"#AB5850",greyblue:"#72697D",greygreen:"#8BA3A2",greypurple:"#978BA3",burn:"#6D5685",slategrey:"#bfb0b3",light:"#a3a5a5",lighter:"#d7d5d2",fudge:"#4d4d4d",lightgrey:"#949a9e",white:"#fbfbfb",dimgrey:"#606c74",softblack:"#463D4F",dark:"#443d3d",black:"#333333"};},{}],2:[function(e,r,o){var n=e("./colors"),t={juno:["blue","mud","navy","slate","pink","burn"],barrow:["rouge","red","orange","burnt","brown","greygreen"],roma:["#8a849a","#b5b0bf","rose","lighter","greygreen","mud"],palmer:["red","navy","olive","pink","suede","sky"],mark:["#848f9a","#9aa4ac","slate","#b0b8bf","mud","grey"],salmon:["sky","sea","fuscia","slate","mud","fudge"],dupont:["green","brown","orange","red","olive","blue"],bloor:["night","navy","beige","rouge","mud","grey"],yukon:["mud","slate","brown","sky","beige","red"],david:["blue","green","yellow","red","pink","light"],neste:["mud","cherry","royal","rouge","greygreen","greypurple"],ken:["red","sky","#c67a53","greygreen","#dfb59f","mud"]};Object.keys(t).forEach(function(e){t[e]=t[e].map(function(e){return n[e]||e});}),r.exports=t;},{"./colors":1}],3:[function(e,r,o){var n=e("./colors"),t=e("./combos"),u={colors:n,list:Object.keys(n).map(function(e){return n[e]}),combos:t};r.exports=u;},{"./colors":1,"./combos":2}]},{},[3])(3)});
    });

    function uuid() {
      return 'xxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16)
      })
    }

    /* src/Thing.svelte generated by Svelte v3.24.1 */

    function create_fragment$1(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $things;
    	let { color = "steelblue" } = $$props;
    	let { label = "" } = $$props;
    	let { value = 0 } = $$props;
    	let { aspect = "" } = $$props;
    	let things = getContext("things");
    	validate_store(things, "things");
    	component_subscribe($$self, things, value => $$invalidate(6, $things = value));
    	let { id = uuid() } = $$props;
    	let colors = spencerColor.colors;
    	color = colors[color] || color;

    	$things.push({
    		color,
    		id,
    		aspect,
    		value: Number(value),
    		label
    	});

    	afterUpdate(() => {
    		things.update(arr => {
    			let o = arr.find(o => o.id === id);

    			if (o) {
    				o.value = value;
    			}

    			return arr;
    		});
    	});

    	const writable_props = ["color", "label", "value", "aspect", "id"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Thing> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Thing", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("value" in $$props) $$invalidate(3, value = $$props.value);
    		if ("aspect" in $$props) $$invalidate(4, aspect = $$props.aspect);
    		if ("id" in $$props) $$invalidate(5, id = $$props.id);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		afterUpdate,
    		c: spencerColor,
    		uuid,
    		color,
    		label,
    		value,
    		aspect,
    		things,
    		id,
    		colors,
    		$things
    	});

    	$$self.$inject_state = $$props => {
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("label" in $$props) $$invalidate(2, label = $$props.label);
    		if ("value" in $$props) $$invalidate(3, value = $$props.value);
    		if ("aspect" in $$props) $$invalidate(4, aspect = $$props.aspect);
    		if ("things" in $$props) $$invalidate(0, things = $$props.things);
    		if ("id" in $$props) $$invalidate(5, id = $$props.id);
    		if ("colors" in $$props) colors = $$props.colors;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [things, color, label, value, aspect, id];
    }

    class Thing extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			color: 1,
    			label: 2,
    			value: 3,
    			aspect: 4,
    			id: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Thing",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get color() {
    		throw new Error("<Thing>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Thing>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Thing>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Thing>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Thing>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Thing>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get aspect() {
    		throw new Error("<Thing>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set aspect(value) {
    		throw new Error("<Thing>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Thing>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Thing>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const scaleLinear = function (obj) {
      let world = obj.world || [];
      let minmax = obj.minmax || [];
      const calc = (num) => {
        let range = minmax[1] - minmax[0];
        let percent = (num - minmax[0]) / range;
        let size = world[1] - world[0];
        let res = size * percent;
        if (res > minmax.max) {
          return minmax.max
        }
        if (res < minmax.min) {
          return minmax.min
        }
        return Math.round(res)
      };
      // invert the calculation. return a %?
      calc.backward = (num) => {
        let size = world[1] - world[0];
        let range = minmax[1] - minmax[0];
        let percent = (num - world[0]) / size;
        return Math.round(percent * range)
      };
      return calc
    };

    const getBox = function (e) {
      let el = e.target;
      for (let i = 0; i < 7; i += 1) {
        if (el.classList.contains('container') === true) {
          break
        }
        el = el.parentNode || el;
      }
      return el.getBoundingClientRect()
    };

    // handle initial click
    const goHere = function (e, cb) {
      let outside = getBox(e);
      let res = {
        start: {},
        diff: {},
        value: {
          x: e.pageX - outside.left, //seems to work?
          y: e.clientY - outside.top,
        },
      };
      res.percent = {
        x: res.value.x / outside.width,
        y: res.value.y / outside.height,
      };
      cb(res);
    };

    const onFirstClick = function (e, cb) {
      let outside = getBox(e);
      let start = {
        x: e.pageX - outside.left,
        y: e.clientY - outside.top,
      };
      const onDrag = function (event) {
        let res = {
          start: start,
          diff: {
            x: event.pageX - start.x - outside.left,
            y: event.clientY - start.y - outside.top,
          },
        };
        res.value = {
          x: event.pageX - outside.left,
          y: event.clientY - outside.top,
        };
        // ensure values are within bounds
        if (res.value.x > outside.width) {
          res.value.x = outside.width;
        }
        if (res.value.y > outside.height) {
          res.value.y = outside.height;
        }
        if (res.value.x < 0) {
          res.value.x = 0;
        }
        if (res.value.y < 0) {
          res.value.y = 0;
        }
        // finally, calculate percents
        res.percent = {
          x: res.value.x / outside.width,
          y: res.value.y / outside.height,
        };
        cb(res);
      };

      // stop event
      window.addEventListener('pointerup', () => {
        window.removeEventListener('pointermove', onDrag);
        window.removeEventListener('pointerup', this);
      });
      window.addEventListener('pointermove', onDrag);
      // fire first
      goHere(e, cb);
    };

    var dragHandler = onFirstClick;

    /* Users/spencer/mountain/somehow-slider/src/Horizontal/Horizontal.svelte generated by Svelte v3.24.1 */
    const file$1 = "Users/spencer/mountain/somehow-slider/src/Horizontal/Horizontal.svelte";

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-sjpf61-style";
    	style.textContent = ".container.svelte-sjpf61{position:relative;height:40px;width:100%;cursor:pointer;outline:none}.background.svelte-sjpf61{position:absolute;background-color:lightgrey;border-radius:8px;box-shadow:2px 2px 8px 0px rgba(0, 0, 0, 0.2);top:33%;height:33%;width:100%;touch-action:none;padding-right:15px}.handle.svelte-sjpf61{position:relative;border-radius:8px;box-shadow:2px 2px 8px 0px rgba(0, 0, 0, 0.2);position:absolute;width:15px;height:100%;cursor:col-resize;border:1px solid grey;position:relative;background-color:steelblue;touch-action:none}.number.svelte-sjpf61{position:absolute;top:50px;user-select:none}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSG9yaXpvbnRhbC5zdmVsdGUiLCJzb3VyY2VzIjpbIkhvcml6b250YWwuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCBzY2FsZUxpbmVhciBmcm9tICcuLi9zY2FsZSdcbiAgaW1wb3J0IG9uRmlyc3RDbGljayBmcm9tICcuLi9kcmFnSGFuZGxlcidcbiAgZXhwb3J0IGxldCB2YWx1ZSA9IDBcbiAgZXhwb3J0IGxldCBtYXggPSAxMDBcbiAgZXhwb3J0IGxldCBtaW4gPSAwXG4gIGxldCBzY2FsZSA9IHNjYWxlTGluZWFyKHsgd29ybGQ6IFswLCAxMDBdLCBtaW5tYXg6IFttaW4sIG1heF0gfSlcbiAgbGV0IHBlcmNlbnQgPSBzY2FsZSh2YWx1ZSlcblxuICBmdW5jdGlvbiBzdGFydENsaWNrKGUpIHtcbiAgICBvbkZpcnN0Q2xpY2soZSwgcmVzID0+IHtcbiAgICAgIHBlcmNlbnQgPSByZXMucGVyY2VudC54ICogMTAwXG4gICAgICB2YWx1ZSA9IHNjYWxlLmJhY2t3YXJkKHBlcmNlbnQpXG4gICAgfSlcbiAgfVxuICBmdW5jdGlvbiBoYW5kbGVLZXlkb3duKGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50LmtleSA9PT0gJ0Fycm93TGVmdCcpIHtcbiAgICAgIHBlcmNlbnQgLT0gMVxuICAgICAgdmFsdWUgPSBzY2FsZS5iYWNrd2FyZChwZXJjZW50KVxuICAgIH1cbiAgICBpZiAoZXZlbnQua2V5ID09PSAnQXJyb3dSaWdodCcpIHtcbiAgICAgIHBlcmNlbnQgKz0gMVxuICAgICAgdmFsdWUgPSBzY2FsZS5iYWNrd2FyZChwZXJjZW50KVxuICAgIH1cbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXG4gIH1cbjwvc2NyaXB0PlxuXG48c3R5bGU+XG4gIC5jb250YWluZXIge1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICBoZWlnaHQ6IDQwcHg7XG4gICAgd2lkdGg6IDEwMCU7XG4gICAgY3Vyc29yOiBwb2ludGVyO1xuICAgIG91dGxpbmU6IG5vbmU7XG4gIH1cbiAgLmJhY2tncm91bmQge1xuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiBsaWdodGdyZXk7XG4gICAgYm9yZGVyLXJhZGl1czogOHB4O1xuICAgIGJveC1zaGFkb3c6IDJweCAycHggOHB4IDBweCByZ2JhKDAsIDAsIDAsIDAuMik7XG4gICAgdG9wOiAzMyU7XG4gICAgaGVpZ2h0OiAzMyU7XG4gICAgd2lkdGg6IDEwMCU7XG4gICAgdG91Y2gtYWN0aW9uOiBub25lO1xuICAgIHBhZGRpbmctcmlnaHQ6IDE1cHg7XG4gIH1cbiAgLmhhbmRsZSB7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIGJvcmRlci1yYWRpdXM6IDhweDtcbiAgICBib3gtc2hhZG93OiAycHggMnB4IDhweCAwcHggcmdiYSgwLCAwLCAwLCAwLjIpO1xuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICB3aWR0aDogMTVweDtcbiAgICBoZWlnaHQ6IDEwMCU7XG4gICAgY3Vyc29yOiBjb2wtcmVzaXplO1xuICAgIGJvcmRlcjogMXB4IHNvbGlkIGdyZXk7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIGJhY2tncm91bmQtY29sb3I6IHN0ZWVsYmx1ZTtcbiAgICB0b3VjaC1hY3Rpb246IG5vbmU7XG4gIH1cbiAgLm51bWJlciB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIHRvcDogNTBweDtcbiAgICB1c2VyLXNlbGVjdDogbm9uZTtcbiAgfVxuPC9zdHlsZT5cblxuPCEtLSA8ZGl2Pnt2YWx1ZX08L2Rpdj5cbjxkaXY+e3BlcmNlbnR9PC9kaXY+IC0tPlxuPGRpdiBjbGFzcz1cImNvbnRhaW5lclwiIG9uOnBvaW50ZXJkb3duPXtzdGFydENsaWNrfSBvbjprZXlkb3duPXtoYW5kbGVLZXlkb3dufT5cbiAgPGRpdiBjbGFzcz1cImJhY2tncm91bmRcIiAvPlxuICA8ZGl2IGNsYXNzPVwiaGFuZGxlXCIgc3R5bGU9XCJsZWZ0OntwZXJjZW50fSU7XCIgb246cG9pbnRlcmRvd249e3N0YXJ0Q2xpY2t9PlxuICAgIDxkaXYgY2xhc3M9XCJudW1iZXJcIj57TWF0aC5yb3VuZCh2YWx1ZSl9PC9kaXY+XG4gIDwvZGl2PlxuPC9kaXY+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBNkJFLFVBQVUsY0FBQyxDQUFDLEFBQ1YsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsTUFBTSxDQUFFLElBQUksQ0FDWixLQUFLLENBQUUsSUFBSSxDQUNYLE1BQU0sQ0FBRSxPQUFPLENBQ2YsT0FBTyxDQUFFLElBQUksQUFDZixDQUFDLEFBQ0QsV0FBVyxjQUFDLENBQUMsQUFDWCxRQUFRLENBQUUsUUFBUSxDQUNsQixnQkFBZ0IsQ0FBRSxTQUFTLENBQzNCLGFBQWEsQ0FBRSxHQUFHLENBQ2xCLFVBQVUsQ0FBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDOUMsR0FBRyxDQUFFLEdBQUcsQ0FDUixNQUFNLENBQUUsR0FBRyxDQUNYLEtBQUssQ0FBRSxJQUFJLENBQ1gsWUFBWSxDQUFFLElBQUksQ0FDbEIsYUFBYSxDQUFFLElBQUksQUFDckIsQ0FBQyxBQUNELE9BQU8sY0FBQyxDQUFDLEFBQ1AsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsYUFBYSxDQUFFLEdBQUcsQ0FDbEIsVUFBVSxDQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUM5QyxRQUFRLENBQUUsUUFBUSxDQUNsQixLQUFLLENBQUUsSUFBSSxDQUNYLE1BQU0sQ0FBRSxJQUFJLENBQ1osTUFBTSxDQUFFLFVBQVUsQ0FDbEIsTUFBTSxDQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUN0QixRQUFRLENBQUUsUUFBUSxDQUNsQixnQkFBZ0IsQ0FBRSxTQUFTLENBQzNCLFlBQVksQ0FBRSxJQUFJLEFBQ3BCLENBQUMsQUFDRCxPQUFPLGNBQUMsQ0FBQyxBQUNQLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEdBQUcsQ0FBRSxJQUFJLENBQ1QsV0FBVyxDQUFFLElBQUksQUFDbkIsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    function create_fragment$2(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div2;
    	let div1;
    	let t1_value = Math.round(/*value*/ ctx[0]) + "";
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t1 = text(t1_value);
    			attr_dev(div0, "class", "background svelte-sjpf61");
    			add_location(div0, file$1, 70, 2, 1574);
    			attr_dev(div1, "class", "number svelte-sjpf61");
    			add_location(div1, file$1, 72, 4, 1681);
    			attr_dev(div2, "class", "handle svelte-sjpf61");
    			set_style(div2, "left", /*percent*/ ctx[1] + "%");
    			add_location(div2, file$1, 71, 2, 1603);
    			attr_dev(div3, "class", "container svelte-sjpf61");
    			add_location(div3, file$1, 69, 0, 1493);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, t1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div2, "pointerdown", /*startClick*/ ctx[2], false, false, false),
    					listen_dev(div3, "pointerdown", /*startClick*/ ctx[2], false, false, false),
    					listen_dev(div3, "keydown", /*handleKeydown*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*value*/ 1 && t1_value !== (t1_value = Math.round(/*value*/ ctx[0]) + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*percent*/ 2) {
    				set_style(div2, "left", /*percent*/ ctx[1] + "%");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { value = 0 } = $$props;
    	let { max = 100 } = $$props;
    	let { min = 0 } = $$props;
    	let scale = scaleLinear({ world: [0, 100], minmax: [min, max] });
    	let percent = scale(value);

    	function startClick(e) {
    		dragHandler(e, res => {
    			$$invalidate(1, percent = res.percent.x * 100);
    			$$invalidate(0, value = scale.backward(percent));
    		});
    	}

    	function handleKeydown(event) {
    		if (event.key === "ArrowLeft") {
    			$$invalidate(1, percent -= 1);
    			$$invalidate(0, value = scale.backward(percent));
    		}

    		if (event.key === "ArrowRight") {
    			$$invalidate(1, percent += 1);
    			$$invalidate(0, value = scale.backward(percent));
    		}

    		event.preventDefault();
    	}

    	const writable_props = ["value", "max", "min"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Horizontal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Horizontal", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("max" in $$props) $$invalidate(4, max = $$props.max);
    		if ("min" in $$props) $$invalidate(5, min = $$props.min);
    	};

    	$$self.$capture_state = () => ({
    		scaleLinear,
    		onFirstClick: dragHandler,
    		value,
    		max,
    		min,
    		scale,
    		percent,
    		startClick,
    		handleKeydown
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("max" in $$props) $$invalidate(4, max = $$props.max);
    		if ("min" in $$props) $$invalidate(5, min = $$props.min);
    		if ("scale" in $$props) scale = $$props.scale;
    		if ("percent" in $$props) $$invalidate(1, percent = $$props.percent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [value, percent, startClick, handleKeydown, max, min];
    }

    class Horizontal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-sjpf61-style")) add_css$1();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { value: 0, max: 4, min: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Horizontal",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get value() {
    		throw new Error("<Horizontal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Horizontal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get max() {
    		throw new Error("<Horizontal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set max(value) {
    		throw new Error("<Horizontal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get min() {
    		throw new Error("<Horizontal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set min(value) {
    		throw new Error("<Horizontal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var spencerColor$1 = createCommonjsModule(function (module, exports) {
    !function(e){module.exports=e();}(function(){return function u(i,a,c){function f(r,e){if(!a[r]){if(!i[r]){var o="function"==typeof commonjsRequire&&commonjsRequire;if(!e&&o)return o(r,!0);if(d)return d(r,!0);var n=new Error("Cannot find module '"+r+"'");throw n.code="MODULE_NOT_FOUND",n}var t=a[r]={exports:{}};i[r][0].call(t.exports,function(e){return f(i[r][1][e]||e)},t,t.exports,u,i,a,c);}return a[r].exports}for(var d="function"==typeof commonjsRequire&&commonjsRequire,e=0;e<c.length;e++)f(c[e]);return f}({1:[function(e,r,o){r.exports={blue:"#6699cc",green:"#6accb2",yellow:"#e1e6b3",red:"#cc7066",pink:"#F2C0BB",brown:"#705E5C",orange:"#cc8a66",purple:"#d8b3e6",navy:"#335799",olive:"#7f9c6c",fuscia:"#735873",beige:"#e6d7b3",slate:"#8C8C88",suede:"#9c896c",burnt:"#603a39",sea:"#50617A",sky:"#2D85A8",night:"#303b50",rouge:"#914045",grey:"#838B91",mud:"#C4ABAB",royal:"#275291",cherry:"#cc6966",tulip:"#e6b3bc",rose:"#D68881",fire:"#AB5850",greyblue:"#72697D",greygreen:"#8BA3A2",greypurple:"#978BA3",burn:"#6D5685",slategrey:"#bfb0b3",light:"#a3a5a5",lighter:"#d7d5d2",fudge:"#4d4d4d",lightgrey:"#949a9e",white:"#fbfbfb",dimgrey:"#606c74",softblack:"#463D4F",dark:"#443d3d",black:"#333333"};},{}],2:[function(e,r,o){var n=e("./colors"),t={juno:["blue","mud","navy","slate","pink","burn"],barrow:["rouge","red","orange","burnt","brown","greygreen"],roma:["#8a849a","#b5b0bf","rose","lighter","greygreen","mud"],palmer:["red","navy","olive","pink","suede","sky"],mark:["#848f9a","#9aa4ac","slate","#b0b8bf","mud","grey"],salmon:["sky","sea","fuscia","slate","mud","fudge"],dupont:["green","brown","orange","red","olive","blue"],bloor:["night","navy","beige","rouge","mud","grey"],yukon:["mud","slate","brown","sky","beige","red"],david:["blue","green","yellow","red","pink","light"],neste:["mud","cherry","royal","rouge","greygreen","greypurple"],ken:["red","sky","#c67a53","greygreen","#dfb59f","mud"]};Object.keys(t).forEach(function(e){t[e]=t[e].map(function(e){return n[e]||e});}),r.exports=t;},{"./colors":1}],3:[function(e,r,o){var n=e("./colors"),t=e("./combos"),u={colors:n,list:Object.keys(n).map(function(e){return n[e]}),combos:t};r.exports=u;},{"./colors":1,"./combos":2}]},{},[3])(3)});
    });

    //  latitude / longitude
    //  (-90|90) /  (-180|180)
    //
    // places with more than 5m people
    var cities = {
      tokyo: [35.68972, 139.69222],
      delhi: [28.61, 77.23],
      shanghai: [31.22861, 121.47472],
      'sao paulo': [-23.55, -46.63333],
      'mexico city': [19.43333, -99.13333],
      cairo: [30.03333, 31.23333],
      mumbai: [18.975, 72.82583],
      beijing: [39.9069, 116.3976],
      dhaka: [23.76389, 90.38889],
      osaka: [34.69389, 135.50222],
      'new york city': [40.661, -73.944],
      karachi: [24.86, 67.01],
      'buenos aires': [-34.60333, -58.38167],
      chongqing: [29.5637, 106.5504],
      istanbul: [41.01361, 28.955],
      kolkata: [22.5726, 88.3639],
      manila: [14.58, 121],
      lagos: [6.45503, 3.38408],
      'rio de janeiro': [-22.90833, -43.19639],
      tianjin: [39.1336, 117.2054],
      kinshasa: [-4.325, 15.32222],
      guangzhou: [23.132, 113.266],
      'los angeles': [34.05, -118.25],
      moscow: [55.75583, 37.61722],
      shenzhen: [22.5415, 114.0596],
      lahore: [31.54972, 74.34361],
      bangalore: [12.98333, 77.58333],
      paris: [48.85661, 2.35222],
      bogotá: [4.71111, -74.07222],
      jakarta: [-6.2, 106.81667],
      chennai: [13.08333, 80.26667],
      lima: [-12.05, -77.03333],
      bangkok: [13.7525, 100.49417],
      seoul: [37.56667, 126.96667],
      nagoya: [35.18333, 136.9],
      hyderabad: [17.37, 78.48],
      london: [51.50722, -0.1275],
      tehran: [35.68917, 51.38889],
      chicago: [41.82192, -87.70304],
      chengdu: [30.657, 104.066],
      nanjing: [32.0614, 118.7636],
      wuhan: [30.5934, 114.3046],
      'ho chi minh city': [10.8, 106.65],
      luanda: [-8.83833, 13.23444],
      ahmedabad: [23.03, 72.58],
      'kuala lumpur': [3.14778, 101.69528],
      "xi'an": [34.265, 108.954],
      'hong kong': [22.3, 114.2],
      dongguan: [23.021, 113.752],
      hangzhou: [30.267, 120.153],
      foshan: [23.0214, 113.1216],
      shenyang: [41.8047, 123.434],
      riyadh: [24.63333, 46.71667],
      baghdad: [33.33333, 44.38333],
      santiago: [-33.45, -70.66667],
      surat: [21.17024, 72.83106],
      madrid: [40.38333, -3.71667],
      suzhou: [31.2998, 120.5853],
      pune: [18.52028, 73.85667],
      harbin: [45.7576, 126.6409],
      houston: [29.76278, -95.38306],
      dallas: [32.77917, -96.80889],
      toronto: [43.74167, -79.37333],
      'dar es salaam': [-6.8, 39.28333],
      miami: [25.77528, -80.20889],
      'belo horizonte': [-19.91667, -43.93333],
      singapore: [1.28333, 103.83333],
      philadelphia: [39.95278, -75.16361],
      atlanta: [33.755, -84.39],
      fukuoka: [33.58333, 130.4],
      khartoum: [15.50056, 32.56],
      barcelona: [41.38333, 2.18333],
      johannesburg: [-26.20444, 28.04556],
      'saint petersburg': [59.9375, 30.30861],
      qingdao: [36.0669, 120.3827],
      dalian: [38.914, 121.6148],
      'washington, d.c.': [38.90472, -77.01639],
      yangon: [16.85, 96.18333],
      alexandria: [31.2, 29.91667],
      jinan: [36.6702, 117.0207],
      guadalajara: [20.67667, -103.3475]
    };

    var ontario = {
      brampton: [43.68333, -79.76667],
      barrie: [44.37111, -79.67694],
      belleville: [44.16667, -77.38333],
      brantford: [43.16667, -80.25],
      cornwall: [45.0275, -74.74],
      brockville: [44.58333, -75.68333],
      burlington: [43.31667, -79.8],
      cambridge: [43.36667, -80.31667],
      'clarence-rockland': [45.48333, -75.2],
      guelph: [43.55, -80.25],
      dryden: [49.78333, -92.83333],
      'elliot lake': [46.38333, -82.65],
      'greater sudbury': [46.49, -81.01],
      'haldimand county': [42.93333, -79.88333],
      hamilton: [43.25667, -79.86917],
      kitchener: [43.41861, -80.47278],
      kingston: [44.23333, -76.5],
      kenora: [49.76667, -94.48333],
      'kawartha lakes': [44.35, -78.75],
      london: [42.98361, -81.24972],
      mississauga: [43.6, -79.65],
      markham: [43.87667, -79.26333],
      'niagara falls': [43.06, -79.10667],
      'norfolk county': [42.85, -80.26667],
      ottawa: [45.42472, -75.695],
      'north bay': [46.3, -79.45],
      orillia: [44.6, -79.41667],
      oshawa: [43.9, -78.85],
      'owen sound': [44.56667, -80.93333],
      pickering: [43.83944, -79.08139],
      peterborough: [44.3, -78.31667],
      'port colborne': [42.88333, -79.25],
      pembroke: [45.81667, -77.1],
      sarnia: [42.99944, -82.30889],
      'st. catharines': [43.18333, -79.23333],
      'richmond hill': [43.86667, -79.43333],
      'quinte west': [44.18333, -77.56667],
      'sault ste. marie': [46.53333, -84.35],
      'thunder bay': [48.38222, -89.24611],
      stratford: [43.37083, -80.98194],
      'st. thomas': [42.775, -81.18333],
      thorold: [43.11667, -79.2],
      'temiskaming shores': [47.51667, -79.68333],
      toronto: [43.74167, -79.37333],
      waterloo: [43.46667, -80.51667],
      timmins: [48.46667, -81.33333],
      vaughan: [43.83333, -79.5],
      welland: [42.98333, -79.23333],
      windsor: [42.28333, -83],
      woodstock: [43.13056, -80.74667]
    };

    var northAmerica = {
      'mexico city': [19.43333, -99.13333],
      'new york city': [40.661, -73.944],
      'los angeles': [34.05, -118.25],
      toronto: [43.74167, -79.37333],
      chicago: [41.82192, -87.70304],
      houston: [29.76278, -95.38306],
      havana: [23.13667, -82.35889],
      montreal: [45.50889, -73.56167],
      'ecatepec de morelos': [19.60972, -99.06],
      philadelphia: [39.95278, -75.16361],
      'san antonio': [29.425, -98.49389],
      guadalajara: [20.67667, -103.3475],
      puebla: [19, -97.88333],
      'san diego': [32.715, -117.1625],
      dallas: [32.77917, -96.80889],
      tijuana: [32.525, -117.03333],
      calgary: [51.05, -114.06667],
      tegucigalpa: [14.1, -87.21667],
      zapopan: [20.72028, -103.39194],
      monterrey: [25.66667, -100.3],
      managua: [12.13639, -86.25139],
      'santo domingo': [18.46667, -69.95],
      'guatemala city': [14.61333, -90.53528],
      'port-au-prince': [18.53333, -72.33333],
      naucalpan: [19.47528, -99.23778],
      ottawa: [45.42472, -75.695],
      austin: [30.26722, -97.74306],
      edmonton: [53.53444, -113.49028],
      querétaro: [20.58333, -100.38333],
      toluca: [19.2925, -99.65694],
      jacksonville: [30.33694, -81.66139],
      'san francisco': [37.7775, -122.41639],
      indianapolis: [39.76861, -86.15806],
      'fort worth': [32.75, -97.33333],
      charlotte: [35.22722, -80.84306],
      hermosillo: [29.09889, -110.95417],
      saltillo: [25.43333, -101],
      aguascalientes: [22.01667, -102.35],
      mississauga: [43.6, -79.65],
      'san luis potosí': [22.6, -100.43333],
      veracruz: [19.43333, -96.38333],
      'san pedro sula': [15.5, -88.03333],
      'santiago de los caballeros': [19.45726, -70.6888],
      culiacán: [24.80694, -107.39389],
      winnipeg: [49.88444, -97.14639],
      mexicali: [32.66333, -115.46778],
      cancún: [21.16056, -86.8475],
      acapulco: [16.86361, -99.8825],
      tlalnepantla: [19.53667, -99.19472],
      seattle: [47.60972, -122.33306],
      denver: [39.73917, -104.99028],
      'el paso': [31.75917, -106.48861],
      chimalhuacán: [19.4375, -98.95417],
      detroit: [42.33139, -83.04583],
      'washington, d.c.': [38.90472, -77.01639],
      boston: [42.35806, -71.06361],
      tlaquepaque: [20.61667, -103.31667],
      nashville: [36.16667, -86.78333],
      torreón: [25.53944, -103.44861],
      vancouver: [49.25, -123.1],
      reynosa: [26.09222, -98.27778],
      'oklahoma city': [35.46861, -97.52139],
      'las vegas': [36.175, -115.13639],
      baltimore: [39.28333, -76.61667],
      brampton: [43.68333, -79.76667],
      louisville: [38.22533, -85.74167],
      morelia: [19.76833, -101.18944],
      milwaukee: [43.05, -87.95],
      'tuxtla gutiérrez': [16.75278, -93.11667],
      apodaca: [25.78333, -100.18333],
      durango: [24.93333, -104.91667],
      albuquerque: [35.11083, -106.61],
      'quebec city': [46.81389, -71.20806],
      tucson: [32.22167, -110.92639],
      'cuautitlán izcalli': [19.64611, -99.21139],
      surrey: [51.25, -0.41667],
      'ciudad lópez mateos': [19.56111, -99.24694],
      tultitlán: [19.645, -99.16944],
      fresno: [36.75, -119.76667]
    };

    const points = [
      ['afghanistan', 'kabul', 34.28, 69.11],
      ['albania', 'tirane', 41.18, 19.49],
      ['algeria', 'algiers', 36.42, 3.08],
      ['american samoa', 'pago pago', -14.16, -170.43],
      ['andorra', 'andorra la vella', 42.31, 1.32],
      ['angola', 'luanda', -8.5, 13.15],
      ['antigua and barbuda', 'west indies', 17.2, -61.48],
      ['argentina', 'buenos aires', -36.3, -60.0],
      ['armenia', 'yerevan', 40.1, 44.31],
      ['aruba', 'oranjestad', 12.32, -70.02],
      ['australia', 'canberra', -35.15, 149.08],
      ['austria', 'vienna', 48.12, 16.22],
      ['azerbaijan', 'baku', 40.29, 49.56],
      ['bahamas', 'nassau', 25.05, -77.2],
      ['bahrain', 'manama', 26.1, 50.3],
      ['bangladesh', 'dhaka', 23.43, 90.26],
      ['barbados', 'bridgetown', 13.05, -59.3],
      ['belarus', 'minsk', 53.52, 27.3],
      ['belgium', 'brussels', 50.51, 4.21],
      ['belize', 'belmopan', 17.18, -88.3],
      ['benin', 'porto novo', 6.23, 2.42],
      ['bhutan', 'thimphu', 27.31, 89.45],
      ['bolivia', 'la paz', -16.2, -68.1],
      ['bosnia and herzegovina', 'sarajevo', 43.52, 18.26],
      ['botswana', 'gaborone', -24.45, 25.57],
      ['brazil', 'brasilia', -15.47, -47.55],
      ['british virgin islands', 'road town', 18.27, -64.37],
      ['brunei darussalam', 'bandar seri begawan', 4.52, 115.0],
      ['bulgaria', 'sofia', 42.45, 23.2],
      ['burkina faso', 'ouagadougou', 12.15, -1.3],
      ['burundi', 'bujumbura', -3.16, 29.18],
      ['cambodia', 'phnom penh', 11.33, 104.55],
      ['cameroon', 'yaounde', 3.5, 11.35],
      ['canada', 'ottawa', 45.27, -75.42],
      ['cape verde', 'praia', 15.02, -23.34],
      ['cayman islands', 'george town', 19.2, -81.24],
      ['central african republic', 'bangui', 4.23, 18.35],
      ['chad', "n'djamena", 12.1, 14.59],
      ['chile', 'santiago', -33.24, -70.4],
      ['china', 'beijing', 39.55, 116.2],
      ['colombia', 'bogota', 4.34, -74.0],
      ['comros', 'moroni', -11.4, 43.16],
      ['congo', 'brazzaville', -4.09, 15.12],
      ['costa rica', 'san jose', 9.55, -84.02],
      ["cote d'ivoire", 'yamoussoukro', 6.49, -5.17],
      ['croatia', 'zagreb', 45.5, 15.58],
      ['cuba', 'havana', 23.08, -82.22],
      ['cyprus', 'nicosia', 35.1, 33.25],
      ['czech republic', 'prague', 50.05, 14.22],
      ['democratic republic of the congo', 'kinshasa', -4.2, 15.15],
      ['denmark', 'copenhagen', 55.41, 12.34],
      ['djibouti', 'djibouti', 11.08, 42.2],
      ['dominica', 'roseau', 15.2, -61.24],
      ['dominica republic', 'santo domingo', 18.3, -69.59],
      ['east timor', 'dili', -8.29, 125.34],
      ['ecuador', 'quito', -0.15, -78.35],
      ['egypt', 'cairo', 30.01, 31.14],
      ['el salvador', 'san salvador', 13.4, -89.1],
      ['equatorial guinea', 'malabo', 3.45, 8.5],
      ['eritrea', 'asmara', 15.19, 38.55],
      ['estonia', 'tallinn', 59.22, 24.48],
      ['ethiopia', 'addis ababa', 9.02, 38.42],
      ['falkland islands', 'stanley', -51.4, -59.51],
      ['faroe islands', 'torshavn', 62.05, -6.56],
      ['fiji', 'suva', -18.06, 178.3],
      ['finland', 'helsinki', 60.15, 25.03],
      ['france', 'paris', 48.5, 2.2],
      ['french guiana', 'cayenne', 5.05, -52.18],
      ['french polynesia', 'papeete', -17.32, -149.34],
      ['gabon', 'libreville', 0.25, 9.26],
      ['gambia', 'banjul', 13.28, -16.4],
      ['georgia', 'tbilisi', 41.43, 44.5],
      ['germany', 'berlin', 52.3, 13.25],
      ['ghana', 'accra', 5.35, -0.06],
      ['greece', 'athens', 37.58, 23.46],
      ['greenland', 'nuuk', 64.1, -51.35],
      ['guadeloupe', 'basse-terre', 16.0, -61.44],
      ['guatemala', 'guatemala', 14.4, -90.22],
      ['guernsey', 'st. peter port', 49.26, -2.33],
      ['guinea', 'conakry', 9.29, -13.49],
      ['guinea-bissau', 'bissau', 11.45, -15.45],
      ['guyana', 'georgetown', 6.5, -58.12],
      ['haiti', 'port-au-prince', 18.4, -72.2],
      ['honduras', 'tegucigalpa', 14.05, -87.14],
      ['hungary', 'budapest', 47.29, 19.05],
      ['iceland', 'reykjavik', 64.1, -21.57],
      ['india', 'new delhi', 28.37, 77.13],
      ['indonesia', 'jakarta', -6.09, 106.49],
      ['iran', 'tehran', 35.44, 51.3],
      ['iraq', 'baghdad', 33.2, 44.3],
      ['ireland', 'dublin', 53.21, -6.15],
      ['israel', 'jerusalem', 31.71, -35.1],
      ['italy', 'rome', 41.54, 12.29],
      ['jamaica', 'kingston', 18.0, -76.5],
      ['jordan', 'amman', 31.57, 35.52],
      ['kazakhstan', 'astana', 51.1, 71.3],
      ['kenya', 'nairobi', -1.17, 36.48],
      ['kiribati', 'tarawa', 1.3, 173.0],
      ['kuwait', 'kuwait', 29.3, 48.0],
      ['kyrgyzstan', 'bishkek', 42.54, 74.46],
      ['laos', 'vientiane', 17.58, 102.36],
      ['latvia', 'riga', 56.53, 24.08],
      ['lebanon', 'beirut', 33.53, 35.31],
      ['lesotho', 'maseru', -29.18, 27.3],
      ['liberia', 'monrovia', 6.18, -10.47],
      ['libyan arab jamahiriya', 'tripoli', 32.49, 13.07],
      ['liechtenstein', 'vaduz', 47.08, 9.31],
      ['lithuania', 'vilnius', 54.38, 25.19],
      ['luxembourg', 'luxembourg', 49.37, 6.09],
      ['macao, china', 'macau', 22.12, 113.33],
      ['madagascar', 'antananarivo', -18.55, 47.31],
      ['macedonia', 'skopje', 42.01, 21.26],
      ['malawi', 'lilongwe', -14.0, 33.48],
      ['malaysia', 'kuala lumpur', 3.09, 101.41],
      ['maldives', 'male', 4.0, 73.28],
      ['mali', 'bamako', 12.34, -7.55],
      ['malta', 'valletta', 35.54, 14.31],
      ['martinique', 'fort-de-france', 14.36, -61.02],
      ['mauritania', 'nouakchott', -20.1, 57.3],
      ['mayotte', 'mamoudzou', -12.48, 45.14],
      ['mexico', 'mexico', 19.2, -99.1],
      ['micronesia', 'palikir', 6.55, 158.09],
      ['moldova, republic of', 'chisinau', 47.02, 28.5],
      ['mozambique', 'maputo', -25.58, 32.32],
      ['myanmar', 'yangon', 16.45, 96.2],
      ['namibia', 'windhoek', -22.35, 17.04],
      ['nepal', 'kathmandu', 27.45, 85.2],
      ['netherlands', 'amsterdam', 52.23, 4.54],
      ['netherlands antilles', 'willemstad', 12.05, -69.0],
      ['new caledonia', 'noumea', -22.17, 166.3],
      ['new zealand', 'wellington', -41.19, 174.46],
      ['nicaragua', 'managua', 12.06, -86.2],
      ['niger', 'niamey', 13.27, 2.06],
      ['nigeria', 'abuja', 9.05, 7.32],
      ['norfolk island', 'kingston', -45.2, 168.43],
      ['north korea', 'pyongyang', 39.09, 125.3],
      ['northern mariana islands', 'saipan', 15.12, 145.45],
      ['norway', 'oslo', 59.55, 10.45],
      ['oman', 'masqat', 23.37, 58.36],
      ['pakistan', 'islamabad', 33.4, 73.1],
      ['palau', 'koror', 7.2, 134.28],
      ['panama', 'panama', 9.0, -79.25],
      ['papua new guinea', 'port moresby', -9.24, 147.08],
      ['paraguay', 'asuncion', -25.1, -57.3],
      ['peru', 'lima', -12.0, -77.0],
      ['philippines', 'manila', 14.4, 121.03],
      ['poland', 'warsaw', 52.13, 21.0],
      ['portugal', 'lisbon', 38.42, -9.1],
      ['puerto rico', 'san juan', 18.28, -66.07],
      ['qatar', 'doha', 25.15, 51.35],
      ['republic of korea', 'seoul', 37.31, 126.58],
      ['romania', 'bucuresti', 44.27, 26.1],
      ['russia', 'moscow', 55.45, 37.35],
      ['rawanda', 'kigali', -1.59, 30.04],
      ['saint kitts and nevis', 'basseterre', 17.17, -62.43],
      ['saint lucia', 'castries', 14.02, -60.58],
      ['saint pierre and miquelon', 'saint-pierre', 46.46, -56.12],
      ['saint vincent and the greenadines', 'kingstown', 13.1, -61.1],
      ['samoa', 'apia', -13.5, -171.5],
      ['san marino', 'san marino', 43.55, 12.3],
      ['sao tome and principe', 'sao tome', 0.1, 6.39],
      ['saudi arabia', 'riyadh', 24.41, 46.42],
      ['senegal', 'dakar', 14.34, -17.29],
      ['sierra leone', 'freetown', 8.3, -13.17],
      ['slovakia', 'bratislava', 48.1, 17.07],
      ['slovenia', 'ljubljana', 46.04, 14.33],
      ['solomon islands', 'honiara', -9.27, 159.57],
      ['somalia', 'mogadishu', 2.02, 45.25],
      ['south africa', 'pretoria', -25.44, 28.12],
      ['spain', 'madrid', 40.25, -3.45],
      ['sudan', 'khartoum', 15.31, 32.35],
      ['suriname', 'paramaribo', 5.5, -55.1],
      ['swaziland', 'mbabane', -26.18, 31.06],
      ['sweden', 'stockholm', 59.2, 18.03],
      ['switzerland', 'bern', 46.57, 7.28],
      ['syria', 'damascus', 33.3, 36.18],
      ['tajikistan', 'dushanbe', 38.33, 68.48],
      ['thailand', 'bangkok', 13.45, 100.35],
      ['togo', 'lome', 6.09, 1.2],
      ['tonga', "nuku'alofa", -21.1, -174.0],
      ['tunisia', 'tunis', 36.5, 10.11],
      ['turkey', 'ankara', 39.57, 32.54],
      ['turkmenistan', 'ashgabat', 38.0, 57.5],
      ['tuvalu', 'funafuti', -8.31, 179.13],
      ['uganda', 'kampala', 0.2, 32.3],
      ['ukraine', 'kiev', 50.3, 30.28],
      ['united arab emirates', 'abu dhabi', 24.28, 54.22],
      ['united kingdom', 'london', 51.36, -0.05],
      ['united republic of tanzania', 'dodoma', -6.08, 35.45],
      ['united states of america', 'washington dc', 39.91, -77.02],
      ['united states of virgin islands', 'charlotte amalie', 18.21, -64.56],
      ['uruguay', 'montevideo', -34.5, -56.11],
      ['uzbekistan', 'tashkent', 41.2, 69.1],
      ['vanuatu', 'port-vila', -17.45, 168.18],
      ['venezuela', 'caracas', 10.3, -66.55],
      ['viet nam', 'hanoi', 21.05, 105.55],
      ['yugoslavia', 'belgrade', 44.5, 20.37],
      ['zambia', 'lusaka', -15.28, 28.16],
      ['zimbabwe', 'harare', -17.43, 31.02]
    ];

    let obj = {};
    points.forEach(a => {
      obj[a[0]] = [a[2], a[3]];
      obj[a[1]] = [a[2], a[3]];
    });
    var countries = obj;

    var points$1 = Object.assign({}, cities, ontario, northAmerica, countries);

    /* Demo.svelte generated by Svelte v3.24.1 */
    const file$2 = "Demo.svelte";

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-4yct1l-style";
    	style.textContent = ".mt4.svelte-4yct1l{margin-top:8rem}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGVtby5zdmVsdGUiLCJzb3VyY2VzIjpbIkRlbW8uc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCB7IFNjYWxlLCBUaGluZyB9IGZyb20gJy4vc3JjJ1xuICBpbXBvcnQgeyBIb3Jpem9udGFsIH0gZnJvbSAnL1VzZXJzL3NwZW5jZXIvbW91bnRhaW4vc29tZWhvdy1zbGlkZXIvc3JjL2luZGV4Lm1qcydcbiAgbGV0IGxlZnQgPSAxMjBcbiAgbGV0IHJpZ2h0ID0gNTBcbiAgbGV0IGhlaWdodCA9IDUwMFxuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBsZWZ0ID0gNzAwXG4gIH0sIDE1MDApXG4gIGxldCB2YWwgPSAzMDBcbjwvc2NyaXB0PlxuXG48c3R5bGU+XG4gIC5tdDQge1xuICAgIG1hcmdpbi10b3A6IDhyZW07XG4gIH1cbjwvc3R5bGU+XG5cbjxkaXYgY2xhc3M9XCJtYWluIG00XCI+XG4gIDxoMj5zb21laG93LXNjYWxlPC9oMj5cbiAgPGRpdj5cbiAgICBhIHN2ZWx0ZSBpbmZvZ3JhcGhpYyBjb21wb25lbnQgLVxuICAgIDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vc3BlbmNlcm1vdW50YWluL3NvbWVob3ctc2NhbGVcIiBjbGFzcz1cIm00XCI+Z2l0aHViPC9hPlxuICA8L2Rpdj5cbiAgPGRpdiBjbGFzcz1cIm10NFwiPlxuICAgIDxIb3Jpem9udGFsIG1pbj17MTAwfSBtYXg9ezE3MDB9IGJpbmQ6dmFsdWU9e3JpZ2h0fSAvPlxuICAgIDxTY2FsZSBoZWlnaHQ9e3ZhbH0+XG4gICAgICA8VGhpbmcgY29sb3I9XCJibHVlXCIgYmluZDp2YWx1ZT17bGVmdH0gbGFiZWw9XCJzbWFsbCBibHVlXCIgLz5cbiAgICAgIDxUaGluZyBjb2xvcj1cImdyZWVuXCIgdmFsdWU9e3JpZ2h0fSBsYWJlbD1cIm1lZGl1bSBncmVlblwiIC8+XG4gICAgPC9TY2FsZT5cbiAgPC9kaXY+XG5cbiAgPGRpdiBjbGFzcz1cIm10NFwiPlxuICAgIDxIb3Jpem9udGFsIG1pbj17MTAwfSBtYXg9ezE3MDB9IHZhbHVlPXs4MH0gLz5cbiAgICA8U2NhbGUgaGVpZ2h0PXt2YWx9PlxuICAgICAgPFRoaW5nIGNvbG9yPVwicmVkXCIgdmFsdWU9ezIyfSBsYWJlbD1cIjJuZCByZWRcIiAvPlxuICAgICAgPFRoaW5nIGNvbG9yPVwiZ3JlZW5cIiB2YWx1ZT17Mzh9IGxhYmVsPVwibWVkaXVtIGdyZWVuXCIgLz5cbiAgICAgIDxUaGluZyBjb2xvcj1cIm11ZFwiIHZhbHVlPXsxOH0gbGFiZWw9XCJtdWRcIiAvPlxuICAgIDwvU2NhbGU+XG4gIDwvZGl2PlxuPC9kaXY+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBYUUsSUFBSSxjQUFDLENBQUMsQUFDSixVQUFVLENBQUUsSUFBSSxBQUNsQixDQUFDIn0= */";
    	append_dev(document.head, style);
    }

    // (27:4) <Scale height={val}>
    function create_default_slot_1(ctx) {
    	let thing0;
    	let updating_value;
    	let t;
    	let thing1;
    	let current;

    	function thing0_value_binding(value) {
    		/*thing0_value_binding*/ ctx[4].call(null, value);
    	}

    	let thing0_props = { color: "blue", label: "small blue" };

    	if (/*left*/ ctx[0] !== void 0) {
    		thing0_props.value = /*left*/ ctx[0];
    	}

    	thing0 = new Thing({ props: thing0_props, $$inline: true });
    	binding_callbacks.push(() => bind(thing0, "value", thing0_value_binding));

    	thing1 = new Thing({
    			props: {
    				color: "green",
    				value: /*right*/ ctx[1],
    				label: "medium green"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(thing0.$$.fragment);
    			t = space();
    			create_component(thing1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(thing0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(thing1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const thing0_changes = {};

    			if (!updating_value && dirty & /*left*/ 1) {
    				updating_value = true;
    				thing0_changes.value = /*left*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			thing0.$set(thing0_changes);
    			const thing1_changes = {};
    			if (dirty & /*right*/ 2) thing1_changes.value = /*right*/ ctx[1];
    			thing1.$set(thing1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(thing0.$$.fragment, local);
    			transition_in(thing1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(thing0.$$.fragment, local);
    			transition_out(thing1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(thing0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(thing1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(27:4) <Scale height={val}>",
    		ctx
    	});

    	return block;
    }

    // (35:4) <Scale height={val}>
    function create_default_slot(ctx) {
    	let thing0;
    	let t0;
    	let thing1;
    	let t1;
    	let thing2;
    	let current;

    	thing0 = new Thing({
    			props: {
    				color: "red",
    				value: 22,
    				label: "2nd red"
    			},
    			$$inline: true
    		});

    	thing1 = new Thing({
    			props: {
    				color: "green",
    				value: 38,
    				label: "medium green"
    			},
    			$$inline: true
    		});

    	thing2 = new Thing({
    			props: { color: "mud", value: 18, label: "mud" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(thing0.$$.fragment);
    			t0 = space();
    			create_component(thing1.$$.fragment);
    			t1 = space();
    			create_component(thing2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(thing0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(thing1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(thing2, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(thing0.$$.fragment, local);
    			transition_in(thing1.$$.fragment, local);
    			transition_in(thing2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(thing0.$$.fragment, local);
    			transition_out(thing1.$$.fragment, local);
    			transition_out(thing2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(thing0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(thing1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(thing2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(35:4) <Scale height={val}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div3;
    	let h2;
    	let t1;
    	let div0;
    	let t2;
    	let a;
    	let t4;
    	let div1;
    	let horizontal0;
    	let updating_value;
    	let t5;
    	let scale0;
    	let t6;
    	let div2;
    	let horizontal1;
    	let t7;
    	let scale1;
    	let current;

    	function horizontal0_value_binding(value) {
    		/*horizontal0_value_binding*/ ctx[3].call(null, value);
    	}

    	let horizontal0_props = { min: 100, max: 1700 };

    	if (/*right*/ ctx[1] !== void 0) {
    		horizontal0_props.value = /*right*/ ctx[1];
    	}

    	horizontal0 = new Horizontal({ props: horizontal0_props, $$inline: true });
    	binding_callbacks.push(() => bind(horizontal0, "value", horizontal0_value_binding));

    	scale0 = new Scale({
    			props: {
    				height: /*val*/ ctx[2],
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	horizontal1 = new Horizontal({
    			props: { min: 100, max: 1700, value: 80 },
    			$$inline: true
    		});

    	scale1 = new Scale({
    			props: {
    				height: /*val*/ ctx[2],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			h2 = element("h2");
    			h2.textContent = "somehow-scale";
    			t1 = space();
    			div0 = element("div");
    			t2 = text("a svelte infographic component -\n    ");
    			a = element("a");
    			a.textContent = "github";
    			t4 = space();
    			div1 = element("div");
    			create_component(horizontal0.$$.fragment);
    			t5 = space();
    			create_component(scale0.$$.fragment);
    			t6 = space();
    			div2 = element("div");
    			create_component(horizontal1.$$.fragment);
    			t7 = space();
    			create_component(scale1.$$.fragment);
    			add_location(h2, file$2, 19, 2, 336);
    			attr_dev(a, "href", "https://github.com/spencermountain/somehow-scale");
    			attr_dev(a, "class", "m4");
    			add_location(a, file$2, 22, 4, 408);
    			add_location(div0, file$2, 20, 2, 361);
    			attr_dev(div1, "class", "mt4 svelte-4yct1l");
    			add_location(div1, file$2, 24, 2, 500);
    			attr_dev(div2, "class", "mt4 svelte-4yct1l");
    			add_location(div2, file$2, 32, 2, 758);
    			attr_dev(div3, "class", "main m4");
    			add_location(div3, file$2, 18, 0, 312);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h2);
    			append_dev(div3, t1);
    			append_dev(div3, div0);
    			append_dev(div0, t2);
    			append_dev(div0, a);
    			append_dev(div3, t4);
    			append_dev(div3, div1);
    			mount_component(horizontal0, div1, null);
    			append_dev(div1, t5);
    			mount_component(scale0, div1, null);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			mount_component(horizontal1, div2, null);
    			append_dev(div2, t7);
    			mount_component(scale1, div2, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const horizontal0_changes = {};

    			if (!updating_value && dirty & /*right*/ 2) {
    				updating_value = true;
    				horizontal0_changes.value = /*right*/ ctx[1];
    				add_flush_callback(() => updating_value = false);
    			}

    			horizontal0.$set(horizontal0_changes);
    			const scale0_changes = {};

    			if (dirty & /*$$scope, right, left*/ 67) {
    				scale0_changes.$$scope = { dirty, ctx };
    			}

    			scale0.$set(scale0_changes);
    			const scale1_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				scale1_changes.$$scope = { dirty, ctx };
    			}

    			scale1.$set(scale1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(horizontal0.$$.fragment, local);
    			transition_in(scale0.$$.fragment, local);
    			transition_in(horizontal1.$$.fragment, local);
    			transition_in(scale1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(horizontal0.$$.fragment, local);
    			transition_out(scale0.$$.fragment, local);
    			transition_out(horizontal1.$$.fragment, local);
    			transition_out(scale1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_component(horizontal0);
    			destroy_component(scale0);
    			destroy_component(horizontal1);
    			destroy_component(scale1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let left = 120;
    	let right = 50;
    	let height = 500;

    	setTimeout(
    		() => {
    			$$invalidate(0, left = 700);
    		},
    		1500
    	);

    	let val = 300;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Demo> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Demo", $$slots, []);

    	function horizontal0_value_binding(value) {
    		right = value;
    		$$invalidate(1, right);
    	}

    	function thing0_value_binding(value) {
    		left = value;
    		$$invalidate(0, left);
    	}

    	$$self.$capture_state = () => ({
    		Scale,
    		Thing,
    		Horizontal,
    		left,
    		right,
    		height,
    		val
    	});

    	$$self.$inject_state = $$props => {
    		if ("left" in $$props) $$invalidate(0, left = $$props.left);
    		if ("right" in $$props) $$invalidate(1, right = $$props.right);
    		if ("height" in $$props) height = $$props.height;
    		if ("val" in $$props) $$invalidate(2, val = $$props.val);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [left, right, val, horizontal0_value_binding, thing0_value_binding];
    }

    class Demo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-4yct1l-style")) add_css$2();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Demo",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    // wire-in query params
    // let user = ''
    // const URLSearchParams = window.URLSearchParams
    // if (typeof URLSearchParams !== undefined) {
    //   const urlParams = new URLSearchParams(window.location.search)
    //   const myParam = urlParams.get('user')
    //   if (myParam) {
    //     user = myParam
    //   }
    // }

    const app = new Demo({
      target: document.body
      // props: { user: user }
    });

    return app;

}());
