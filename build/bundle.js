
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
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

    const things = writable([]);

    // const ratio = 0.61803

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
        // o.width = percentage * ratio
        o.percentage = parseInt(percentage, 10);
        o.height = o.percentage;
        o.width = '100%';
        if (o.percentage <= 5) {
          o.width = '25%';
          o.rescaled = true;
          o.height = o.percentage * 4;
        }
        o.fmt = fmt(o.value);
      });
      return arr
    };

    /* src/Scale.svelte generated by Svelte v3.24.1 */
    const file = "src/Scale.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1ic7itr-style";
    	style.textContent = ".container.svelte-1ic7itr{height:100%;position:relative;width:100%;display:flex;flex-direction:row;justify-content:space-around;align-items:center;text-align:center;flex-wrap:nowrap;align-self:stretch}.box.svelte-1ic7itr{position:relative;box-sizing:border-box;padding:10px;display:flex;height:100%;flex:1;flex-direction:column;justify-content:flex-end;align-items:flex-end}.label.svelte-1ic7itr{position:relative;color:#b3b7ba;max-width:200px;font-size:11px;margin-top:4px;text-align:right;margin-right:45px}.value.svelte-1ic7itr{position:relative;color:#949a9e;font-size:20px;margin:7px;opacity:0.8;margin-right:45px;justify-content:center;display:flex;align-items:first baseline}.num.svelte-1ic7itr{opacity:1}.unit.svelte-1ic7itr{font-size:12px;margin-left:1px;color:#949a9e}.sized.svelte-1ic7itr{position:relative;width:100%;align-self:center;display:flex;flex-direction:row;justify-content:flex-end;flex-wrap:nowrap}.axis.svelte-1ic7itr{width:6px;margin-left:7px;border-left:1px dashed lightgrey;border-top:1px dashed lightgrey;border-bottom:1px dashed lightgrey;height:100%}.beside.svelte-1ic7itr{display:flex;flex-direction:row;flex-wrap:nowrap;align-items:center;justify-content:flex-start;position:relative;margin-left:5px;box-sizing:border-box;padding-top:12px;padding-bottom:12px;height:100%;width:45px}.percent.svelte-1ic7itr{color:#b3b7ba;font-size:12px;width:40px}.inside.svelte-1ic7itr{color:#fbfbfb}.bar.svelte-1ic7itr{display:flex;box-sizing:border-box;padding:2%;justify-content:flex-end;align-items:flex-end;border-radius:2px;box-shadow:2px 2px 8px 0px rgba(0, 0, 0, 0.2)}.bar.svelte-1ic7itr:hover{box-shadow:2px 2px 8px 0px steelblue}.ghost.svelte-1ic7itr{height:100%;width:25%}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2NhbGUuc3ZlbHRlIiwic291cmNlcyI6WyJTY2FsZS5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgaW1wb3J0IHsgc2V0Q29udGV4dCwgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSdcbiAgaW1wb3J0IHsgdGhpbmdzIH0gZnJvbSAnLi9zdG9yZSdcbiAgaW1wb3J0IGxheW91dCBmcm9tICcuL2xheW91dCdcbiAgZXhwb3J0IGxldCBoZWlnaHQgPSA0MDBcblxuICBsZXQgYXJyID0gW11cbiAgb25Nb3VudCgoKSA9PiB7XG4gICAgYXJyID0gbGF5b3V0KCR0aGluZ3MsIGhlaWdodClcbiAgfSlcbjwvc2NyaXB0PlxuXG48c3R5bGU+XG4gIC5jb250YWluZXIge1xuICAgIGhlaWdodDogMTAwJTtcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgd2lkdGg6IDEwMCU7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LWRpcmVjdGlvbjogcm93O1xuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYXJvdW5kO1xuICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gICAgdGV4dC1hbGlnbjogY2VudGVyO1xuICAgIGZsZXgtd3JhcDogbm93cmFwO1xuICAgIGFsaWduLXNlbGY6IHN0cmV0Y2g7XG4gIH1cblxuICAuYm94IHtcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICBwYWRkaW5nOiAxMHB4O1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgaGVpZ2h0OiAxMDAlO1xuICAgIGZsZXg6IDE7XG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IGZsZXgtZW5kO1xuICAgIGFsaWduLWl0ZW1zOiBmbGV4LWVuZDtcbiAgfVxuICAubGFiZWwge1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICBjb2xvcjogI2IzYjdiYTtcbiAgICBtYXgtd2lkdGg6IDIwMHB4O1xuICAgIGZvbnQtc2l6ZTogMTFweDtcbiAgICBtYXJnaW4tdG9wOiA0cHg7XG4gICAgdGV4dC1hbGlnbjogcmlnaHQ7XG4gICAgbWFyZ2luLXJpZ2h0OiA0NXB4O1xuICB9XG4gIC52YWx1ZSB7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIGNvbG9yOiAjOTQ5YTllO1xuICAgIGZvbnQtc2l6ZTogMjBweDtcbiAgICBtYXJnaW46IDdweDtcbiAgICBvcGFjaXR5OiAwLjg7XG4gICAgbWFyZ2luLXJpZ2h0OiA0NXB4O1xuICAgIGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgYWxpZ24taXRlbXM6IGZpcnN0IGJhc2VsaW5lO1xuICB9XG4gIC5udW0ge1xuICAgIG9wYWNpdHk6IDE7XG4gIH1cbiAgLnVuaXQge1xuICAgIGZvbnQtc2l6ZTogMTJweDtcbiAgICBtYXJnaW4tbGVmdDogMXB4O1xuICAgIGNvbG9yOiAjOTQ5YTllO1xuICB9XG4gIC8qIC5kZWMge1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICBmb250LXNpemU6IDE0cHg7XG4gICAgY29sb3I6ICM5NDlhOWU7XG4gICAgbWFyZ2luLWxlZnQ6IDFweDtcbiAgICBjb2xvcjogI2IzYjdiYTtcbiAgICB0b3A6IDNweDtcbiAgfSAqL1xuICAvKiB0aGUgYWN0dWFsIGJhciAqL1xuICAuc2l6ZWQge1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBhbGlnbi1zZWxmOiBjZW50ZXI7XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBmbGV4LWRpcmVjdGlvbjogcm93O1xuICAgIGp1c3RpZnktY29udGVudDogZmxleC1lbmQ7XG4gICAgZmxleC13cmFwOiBub3dyYXA7XG4gICAgLyogYm9yZGVyLWJvdHRvbTogMXB4IGRhc2hlZCBsaWdodGdyZXk7ICovXG4gIH1cbiAgLmF4aXMge1xuICAgIHdpZHRoOiA2cHg7XG4gICAgbWFyZ2luLWxlZnQ6IDdweDtcbiAgICBib3JkZXItbGVmdDogMXB4IGRhc2hlZCBsaWdodGdyZXk7XG4gICAgYm9yZGVyLXRvcDogMXB4IGRhc2hlZCBsaWdodGdyZXk7XG4gICAgYm9yZGVyLWJvdHRvbTogMXB4IGRhc2hlZCBsaWdodGdyZXk7XG4gICAgaGVpZ2h0OiAxMDAlO1xuICB9XG4gIC5iZXNpZGUge1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgZmxleC1kaXJlY3Rpb246IHJvdztcbiAgICBmbGV4LXdyYXA6IG5vd3JhcDtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIGp1c3RpZnktY29udGVudDogZmxleC1zdGFydDtcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgbWFyZ2luLWxlZnQ6IDVweDtcbiAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICAgIHBhZGRpbmctdG9wOiAxMnB4O1xuICAgIHBhZGRpbmctYm90dG9tOiAxMnB4O1xuICAgIGhlaWdodDogMTAwJTtcbiAgICB3aWR0aDogNDVweDtcbiAgfVxuICAucGVyY2VudCB7XG4gICAgY29sb3I6ICNiM2I3YmE7XG4gICAgZm9udC1zaXplOiAxMnB4O1xuICAgIHdpZHRoOiA0MHB4O1xuICB9XG4gIC5pbnNpZGUge1xuICAgIGNvbG9yOiAjZmJmYmZiO1xuICB9XG4gIC5iYXIge1xuICAgIC8qIG1pbi13aWR0aDogMTAwcHg7ICovXG4gICAgLyogZmxleDogMTsgKi9cbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gICAgcGFkZGluZzogMiU7XG4gICAganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDtcbiAgICBhbGlnbi1pdGVtczogZmxleC1lbmQ7XG4gICAgYm9yZGVyLXJhZGl1czogMnB4O1xuICAgIGJveC1zaGFkb3c6IDJweCAycHggOHB4IDBweCByZ2JhKDAsIDAsIDAsIDAuMik7XG4gIH1cbiAgLmJhcjpob3ZlciB7XG4gICAgYm94LXNoYWRvdzogMnB4IDJweCA4cHggMHB4IHN0ZWVsYmx1ZTtcbiAgfVxuICAuZ2hvc3Qge1xuICAgIGhlaWdodDogMTAwJTtcbiAgICB3aWR0aDogMjUlO1xuICAgIC8qIGJvcmRlci1yYWRpdXM6IDNweDsgKi9cbiAgICAvKiBib3JkZXI6IDFweCBkb3R0ZWQgbGlnaHRncmV5OyAqL1xuICB9XG48L3N0eWxlPlxuXG48ZGl2IGNsYXNzPVwiY29udGFpbmVyXCIgc3R5bGU9XCJtaW4taGVpZ2h0OntoZWlnaHR9cHg7XCI+XG5cbiAgeyNlYWNoIGFyciBhcyBiYXJ9XG4gICAgPGRpdiBjbGFzcz1cImJveFwiPlxuICAgICAgPCEtLSB0b3AgbnVtYmVyIC0tPlxuICAgICAgPGRpdiBjbGFzcz1cInZhbHVlXCIgc3R5bGU9XCJib3JkZXItYm90dG9tOiAycHggc29saWQge2Jhci5jb2xvcn07XCI+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwibnVtXCI+e2Jhci5mbXRbMF19PC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInVuaXRcIj57YmFyLmZtdFsyXSB8fCAnJ308L3NwYW4+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJzaXplZFwiIHN0eWxlPVwiaGVpZ2h0OntiYXIuaGVpZ2h0fSU7IFwiPlxuICAgICAgICB7I2lmIGJhci5yZXNjYWxlZH1cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZ2hvc3RcIiAvPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJnaG9zdFwiIC8+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImdob3N0XCIgLz5cbiAgICAgICAgey9pZn1cbiAgICAgICAgPGRpdlxuICAgICAgICAgIGNsYXNzPVwiYmFyXCJcbiAgICAgICAgICBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6e2Jhci5jb2xvcn07IHdpZHRoOntiYXIud2lkdGh9OyBtYXgtd2lkdGg6e2Jhci53aWR0aH07XG4gICAgICAgICAgaGVpZ2h0OjEwMCU7XCI+XG4gICAgICAgICAgeyNpZiBiYXIucmVzY2FsZWR9XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW5zaWRlXCI+e2Jhci5wZXJjZW50YWdlICE9PSAxMDAgPyBiYXIucGVyY2VudGFnZSArICclJyA6ICcnfTwvZGl2PlxuICAgICAgICAgIHsvaWZ9XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3M9XCJiZXNpZGVcIj5cbiAgICAgICAgICB7I2lmIGJhci5wZXJjZW50YWdlICE9PSAxMDAgJiYgYmFyLnJlc2NhbGVkICE9PSB0cnVlfVxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImF4aXNcIiAvPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInBlcmNlbnRcIj57YmFyLnBlcmNlbnRhZ2UgIT09IDEwMCA/IGJhci5wZXJjZW50YWdlICsgJyUnIDogJyd9PC9kaXY+XG4gICAgICAgICAgey9pZn1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICAgIDwhLS0gYm90dG9tIGxhYmVsIC0tPlxuICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+e2Jhci5sYWJlbH08L2Rpdj5cbiAgICA8L2Rpdj5cbiAgey9lYWNofVxuXG48L2Rpdj5cbjxzbG90IC8+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBYUUsVUFBVSxlQUFDLENBQUMsQUFDVixNQUFNLENBQUUsSUFBSSxDQUNaLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEtBQUssQ0FBRSxJQUFJLENBQ1gsT0FBTyxDQUFFLElBQUksQ0FDYixjQUFjLENBQUUsR0FBRyxDQUNuQixlQUFlLENBQUUsWUFBWSxDQUM3QixXQUFXLENBQUUsTUFBTSxDQUNuQixVQUFVLENBQUUsTUFBTSxDQUNsQixTQUFTLENBQUUsTUFBTSxDQUNqQixVQUFVLENBQUUsT0FBTyxBQUNyQixDQUFDLEFBRUQsSUFBSSxlQUFDLENBQUMsQUFDSixRQUFRLENBQUUsUUFBUSxDQUNsQixVQUFVLENBQUUsVUFBVSxDQUN0QixPQUFPLENBQUUsSUFBSSxDQUNiLE9BQU8sQ0FBRSxJQUFJLENBQ2IsTUFBTSxDQUFFLElBQUks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 */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (147:8) {#if bar.rescaled}
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
    			attr_dev(div0, "class", "ghost svelte-1ic7itr");
    			add_location(div0, file, 147, 10, 3050);
    			attr_dev(div1, "class", "ghost svelte-1ic7itr");
    			add_location(div1, file, 148, 10, 3082);
    			attr_dev(div2, "class", "ghost svelte-1ic7itr");
    			add_location(div2, file, 149, 10, 3114);
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
    		source: "(147:8) {#if bar.rescaled}",
    		ctx
    	});

    	return block;
    }

    // (156:10) {#if bar.rescaled}
    function create_if_block_1(ctx) {
    	let div;

    	let t_value = (/*bar*/ ctx[5].percentage !== 100
    	? /*bar*/ ctx[5].percentage + "%"
    	: "") + "";

    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "inside svelte-1ic7itr");
    			add_location(div, file, 156, 12, 3340);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*arr*/ 2 && t_value !== (t_value = (/*bar*/ ctx[5].percentage !== 100
    			? /*bar*/ ctx[5].percentage + "%"
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
    		source: "(156:10) {#if bar.rescaled}",
    		ctx
    	});

    	return block;
    }

    // (162:10) {#if bar.percentage !== 100 && bar.rescaled !== true}
    function create_if_block(ctx) {
    	let div0;
    	let t0;
    	let div1;

    	let t1_value = (/*bar*/ ctx[5].percentage !== 100
    	? /*bar*/ ctx[5].percentage + "%"
    	: "") + "";

    	let t1;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = text(t1_value);
    			attr_dev(div0, "class", "axis svelte-1ic7itr");
    			add_location(div0, file, 162, 12, 3556);
    			attr_dev(div1, "class", "percent svelte-1ic7itr");
    			add_location(div1, file, 163, 12, 3589);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*arr*/ 2 && t1_value !== (t1_value = (/*bar*/ ctx[5].percentage !== 100
    			? /*bar*/ ctx[5].percentage + "%"
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
    		source: "(162:10) {#if bar.percentage !== 100 && bar.rescaled !== true}",
    		ctx
    	});

    	return block;
    }

    // (139:2) {#each arr as bar}
    function create_each_block(ctx) {
    	let div5;
    	let div0;
    	let span0;
    	let t0_value = /*bar*/ ctx[5].fmt[0] + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = (/*bar*/ ctx[5].fmt[2] || "") + "";
    	let t2;
    	let t3;
    	let div3;
    	let t4;
    	let div1;
    	let t5;
    	let div2;
    	let t6;
    	let div4;
    	let t7_value = /*bar*/ ctx[5].label + "";
    	let t7;
    	let t8;
    	let if_block0 = /*bar*/ ctx[5].rescaled && create_if_block_2(ctx);
    	let if_block1 = /*bar*/ ctx[5].rescaled && create_if_block_1(ctx);
    	let if_block2 = /*bar*/ ctx[5].percentage !== 100 && /*bar*/ ctx[5].rescaled !== true && create_if_block(ctx);

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
    			attr_dev(span0, "class", "num svelte-1ic7itr");
    			add_location(span0, file, 142, 8, 2852);
    			attr_dev(span1, "class", "unit svelte-1ic7itr");
    			add_location(span1, file, 143, 8, 2898);
    			attr_dev(div0, "class", "value svelte-1ic7itr");
    			set_style(div0, "border-bottom", "2px solid " + /*bar*/ ctx[5].color);
    			add_location(div0, file, 141, 6, 2778);
    			attr_dev(div1, "class", "bar svelte-1ic7itr");
    			set_style(div1, "background-color", /*bar*/ ctx[5].color);
    			set_style(div1, "width", /*bar*/ ctx[5].width);
    			set_style(div1, "max-width", /*bar*/ ctx[5].width);
    			set_style(div1, "height", "100%");
    			add_location(div1, file, 151, 8, 3158);
    			attr_dev(div2, "class", "beside svelte-1ic7itr");
    			add_location(div2, file, 160, 8, 3459);
    			attr_dev(div3, "class", "sized svelte-1ic7itr");
    			set_style(div3, "height", /*bar*/ ctx[5].height + "%");
    			add_location(div3, file, 145, 6, 2962);
    			attr_dev(div4, "class", "label svelte-1ic7itr");
    			add_location(div4, file, 168, 6, 3747);
    			attr_dev(div5, "class", "box svelte-1ic7itr");
    			add_location(div5, file, 139, 4, 2728);
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
    			if (dirty & /*arr*/ 2 && t0_value !== (t0_value = /*bar*/ ctx[5].fmt[0] + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*arr*/ 2 && t2_value !== (t2_value = (/*bar*/ ctx[5].fmt[2] || "") + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*arr*/ 2) {
    				set_style(div0, "border-bottom", "2px solid " + /*bar*/ ctx[5].color);
    			}

    			if (/*bar*/ ctx[5].rescaled) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div3, t4);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*bar*/ ctx[5].rescaled) {
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
    				set_style(div1, "background-color", /*bar*/ ctx[5].color);
    			}

    			if (dirty & /*arr*/ 2) {
    				set_style(div1, "width", /*bar*/ ctx[5].width);
    			}

    			if (dirty & /*arr*/ 2) {
    				set_style(div1, "max-width", /*bar*/ ctx[5].width);
    			}

    			if (/*bar*/ ctx[5].percentage !== 100 && /*bar*/ ctx[5].rescaled !== true) {
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
    				set_style(div3, "height", /*bar*/ ctx[5].height + "%");
    			}

    			if (dirty & /*arr*/ 2 && t7_value !== (t7_value = /*bar*/ ctx[5].label + "")) set_data_dev(t7, t7_value);
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
    		source: "(139:2) {#each arr as bar}",
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

    	const default_slot_template = /*$$slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "container svelte-1ic7itr");
    			set_style(div, "min-height", /*height*/ ctx[0] + "px");
    			add_location(div, file, 136, 0, 2647);
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

    			if (!current || dirty & /*height*/ 1) {
    				set_style(div, "min-height", /*height*/ ctx[0] + "px");
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
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
    	validate_store(things, "things");
    	component_subscribe($$self, things, $$value => $$invalidate(4, $things = $$value));
    	let { height = 400 } = $$props;
    	let arr = [];

    	onMount(() => {
    		$$invalidate(1, arr = layout($things));
    	});

    	const writable_props = ["height"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Scale> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Scale", $$slots, ['default']);

    	$$self.$$set = $$props => {
    		if ("height" in $$props) $$invalidate(0, height = $$props.height);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		setContext,
    		onMount,
    		things,
    		layout,
    		height,
    		arr,
    		$things
    	});

    	$$self.$inject_state = $$props => {
    		if ("height" in $$props) $$invalidate(0, height = $$props.height);
    		if ("arr" in $$props) $$invalidate(1, arr = $$props.arr);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [height, arr, $$scope, $$slots];
    }

    class Scale extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1ic7itr-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, { height: 0 });

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

    /* src/Thing.svelte generated by Svelte v3.24.1 */
    const file$1 = "src/Thing.svelte";

    function create_fragment$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			add_location(div, file$1, 19, 0, 354);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
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
    	validate_store(things, "things");
    	component_subscribe($$self, things, $$value => $$invalidate(4, $things = $$value));
    	let { color = "steelblue" } = $$props;
    	let { label = "" } = $$props;
    	let { value = 0 } = $$props;
    	let { aspect = "" } = $$props;
    	let colors = spencerColor.colors;
    	color = colors[color] || color;

    	$things.push({
    		color,
    		aspect,
    		value: Number(value),
    		label
    	});

    	const writable_props = ["color", "label", "value", "aspect"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Thing> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Thing", $$slots, []);

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("value" in $$props) $$invalidate(2, value = $$props.value);
    		if ("aspect" in $$props) $$invalidate(3, aspect = $$props.aspect);
    	};

    	$$self.$capture_state = () => ({
    		things,
    		color,
    		label,
    		value,
    		aspect,
    		c: spencerColor,
    		colors,
    		$things
    	});

    	$$self.$inject_state = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("value" in $$props) $$invalidate(2, value = $$props.value);
    		if ("aspect" in $$props) $$invalidate(3, aspect = $$props.aspect);
    		if ("colors" in $$props) colors = $$props.colors;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [color, label, value, aspect];
    }

    class Thing extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { color: 0, label: 1, value: 2, aspect: 3 });

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
    }

    /* Demo.svelte generated by Svelte v3.24.1 */
    const file$2 = "Demo.svelte";

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-1h9yarm-style";
    	style.textContent = ".container.svelte-1h9yarm{height:800px}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGVtby5zdmVsdGUiLCJzb3VyY2VzIjpbIkRlbW8uc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCB7IFNjYWxlLCBUaGluZyB9IGZyb20gJy4vc3JjJ1xuPC9zY3JpcHQ+XG5cbjxzdHlsZT5cbiAgLmNvbnRhaW5lciB7XG4gICAgLyogYm9yZGVyOiAxcHggc29saWQgZ3JleTsgKi9cbiAgICBoZWlnaHQ6IDgwMHB4O1xuICB9XG48L3N0eWxlPlxuXG48ZGl2IGNsYXNzPVwibWFpbiBtNFwiPlxuICA8aDI+c29tZWhvdy1zY2FsZTwvaDI+XG4gIDxkaXY+XG4gICAgYSBzdmVsdGUgaW5mb2dyYXBoaWMgY29tcG9uZW50IC1cbiAgICA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL3NwZW5jZXJtb3VudGFpbi9zb21laG93LXNjYWxlXCIgY2xhc3M9XCJtNFwiPmdpdGh1YjwvYT5cbiAgPC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJtdDQgY29udGFpbmVyXCI+XG4gICAgPFNjYWxlPlxuICAgICAgPFRoaW5nIGNvbG9yPVwiYmx1ZVwiIHZhbHVlPVwiMjAwXCIgbGFiZWw9XCJzbWFsbCBibHVlXCIgLz5cbiAgICAgIDxUaGluZyBjb2xvcj1cImJsdWVcIiB2YWx1ZT1cIjI1MDBcIiBsYWJlbD1cIm1lZGl1bSBibHVlXCIgLz5cbiAgICAgIDxUaGluZyBjb2xvcj1cImdyZWVuXCIgdmFsdWU9XCI1MDAwXCIgbGFiZWw9XCJiaWcgZ3JlZW5cIiAvPlxuICAgIDwvU2NhbGU+XG4gIDwvZGl2PlxuPC9kaXY+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0UsVUFBVSxlQUFDLENBQUMsQUFFVixNQUFNLENBQUUsS0FBSyxBQUNmLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    // (19:4) <Scale>
    function create_default_slot(ctx) {
    	let thing0;
    	let t0;
    	let thing1;
    	let t1;
    	let thing2;
    	let current;

    	thing0 = new Thing({
    			props: {
    				color: "blue",
    				value: "200",
    				label: "small blue"
    			},
    			$$inline: true
    		});

    	thing1 = new Thing({
    			props: {
    				color: "blue",
    				value: "2500",
    				label: "medium blue"
    			},
    			$$inline: true
    		});

    	thing2 = new Thing({
    			props: {
    				color: "green",
    				value: "5000",
    				label: "big green"
    			},
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
    		source: "(19:4) <Scale>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div2;
    	let h2;
    	let t1;
    	let div0;
    	let t2;
    	let a;
    	let t4;
    	let div1;
    	let scale;
    	let current;

    	scale = new Scale({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "somehow-scale";
    			t1 = space();
    			div0 = element("div");
    			t2 = text("a svelte infographic component -\n    ");
    			a = element("a");
    			a.textContent = "github";
    			t4 = space();
    			div1 = element("div");
    			create_component(scale.$$.fragment);
    			add_location(h2, file$2, 12, 2, 173);
    			attr_dev(a, "href", "https://github.com/spencermountain/somehow-scale");
    			attr_dev(a, "class", "m4");
    			add_location(a, file$2, 15, 4, 245);
    			add_location(div0, file$2, 13, 2, 198);
    			attr_dev(div1, "class", "mt4 container svelte-1h9yarm");
    			add_location(div1, file$2, 17, 2, 337);
    			attr_dev(div2, "class", "main m4");
    			add_location(div2, file$2, 11, 0, 149);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h2);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, t2);
    			append_dev(div0, a);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			mount_component(scale, div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const scale_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				scale_changes.$$scope = { dirty, ctx };
    			}

    			scale.$set(scale_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(scale.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(scale.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(scale);
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
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Demo> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Demo", $$slots, []);
    	$$self.$capture_state = () => ({ Scale, Thing });
    	return [];
    }

    class Demo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1h9yarm-style")) add_css$1();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Demo",
    			options,
    			id: create_fragment$2.name
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
