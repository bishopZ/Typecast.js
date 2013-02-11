//     TypeCast.js
//     (c) 2012 Bishop Zareh
//     TypeCast is freely distributed under the MIT license.
(function(){

    var root = this,
        noTypecast = root.Type,
        VERSION = '0.1';

    // tada! the K-combinator, from SKI calculus
    var K = function(v){ return function(){ return v; } };
    
    // helpers to un-chain values
    var pop = function(v){ if(v instanceof TypedObject) { return v.a(); } return v; };
    var popType = function(v){ if(v instanceof TypedObject) { return v.type(); } return v; };

    // straight class inheritance, like prototype
    var inherit = function(from, to, skip, context) {
        _.each(from, function(fn, prop){
            if(!skip || _.indexOf(skip, prop) === -1) {
                if (context && typeof fn === 'function'){
                    to[prop] = _.bind(fn, context);
                } else {
                    to[prop] = fn; 
                }   
            }            
        });
        return to;  
    };

    // so that chained function always return a new Typed Object
    var wrap = function(from, to, type, context) {
        context = context || this;
        _.each(from, function(fn, prop){
            to[prop] = function(){
                var args = _.map(arguments, function(v){ return pop(v); });
                var value = fn.apply(context, args);
                type = type || Type.detect(value);
                return Type(type, value);
            };
        });
        return to;  
    };

    /* ******************************************* */

    // // class Vars 
    var _definitions = {};
    var _types = [];
    var _transforms = {};

    // // classes

    var TypeClass = function(name, value){
        if(Type.types.is(name)) return false;

        // defaults
        this.name = name;
        this.is = function(v){ return typeof v === typeof value; };
        this.can = K(true);
        this.make = K(value);
        this.a = 
        this.val = 
        this.get = K(value);
        this.type = K(name);
       // this.typeof = K(typeof value);
        
        return this;
    };

    var TypedObject = function(type, value){
        type = popType(type), value = pop(value);
        if (!Type.types.is(type)) { return {}; };
        value = (Type.is(type, value)) ? value : Type.make(type, value);

        this.name = type;
        this.type = K(type);
        //this.typeof = K(typeof value);
        this.a = K(value);
        this.val = 
        this.get = function(){ return this.a(); };
        this.set = function(v){ this.a = K(v); return this; };
        this.can = function(t){
             if (Type.types.is(t)) {
                if (Type.can(t, this.a())) {
                    return true; 
                };
            }; return false;
        };
        this.is = function(t){ 
            if (Type.types.is(t)) {
                if (Type.is(t, this.a())) {
                    return true; 
                };
            }; return false;
        };
        this.ifis = function(type, fn, elseFn) {
            if (Type.is('function', fn)) {
                 if (this.type() === type || Type.is('boolean', type)) { 
                    return fn.call(this.a()); 
                 } else if (Type.is('function', elseFn)) {
                    return elseFn.call(this.a()); 
                 };
            };
            return false;
        };
        this.to = function(t){
            var value = this.a()
                transform = _transforms[this.type()][t];
            if(transform) { 
                value = transform(value);
            }
            if (Type.types.is(t)) return Type(t, value);
            return Type(Type.detect(value), value);
        }

        return this;
    };

    /*  ************************************************ */

    // Main interface

    var Type = function(a, b){
        if (Type.is('def', b)){
            var out = new TypedObject(a, b); // get defaults
            inherit(_definitions[a], out, ['a']); // clobber by class
            wrap(_transforms[a], out.to, false, out); // add transforms
            return out;
        }
        return Type(Type.detect(a), a);
    };

    // wrapping and requiring underscore
    if (root._) {
        var _ = Type._ = root._; 
    } else { 
        return false; 
    } 

    // typing functions

    Type.detect = function(v){ 
        v = pop(v);
        if(Type.is('null', v)) return 'null';
        if(Type.is('nan', v)) return 'nan';
        if(Type.is('args', v)) return 'args';
        if(Type.is('arr', v)) return 'array';
        return typeof v;
    }
    Type.types = function(){ return _types; };
    Type.types.is = function(t){
        if(typeof t === 'string') 
            for(var i=0,l=_types.length;i<l;i++) 
                if(_types[i].toLowerCase() === t.toLowerCase()) 
                    return true; 
        return false; 
    }; 

    // Using custom inheritance
    // because prototype and constructor are not consitent across browsers

    Type.extend = function(def){
        var name = def.name,
            value = def.a, 
            inherits = def.inherits || [],
            alias = def.alias || [],
            methods = def.methods || {},
            transforms = def.transforms || {};

        alias.unshift(name);
        
        var classDef = new TypeClass(name, value); // defaults
        _.each(inherits, function(type){ inherit(Type[type], classDef, ['a']); });
        inherit(def, classDef, ['inherits', 'alias', 'methods', 'name', 'a']);
        
        var transformsDef = {};
        _.each(inherits, function(type){ inherit(_transforms[type], transformsDef); });
        inherit(transforms, transformsDef);
        
        // main Type.typeName() interface
        var wrappedClass = function(a) {
            return Type.can(name, a) ? Type(name, a) : Type(name, classDef.a());
        }
        inherit(classDef, wrappedClass);

        // create the interface
        _.each(alias, function(type){
            _types.push(type);
            _transforms[type] = transforms;
            Type[type] = wrappedClass;
        });

        // create inheritance object(s) for new Typed Objects of this type
        var objectDef = new TypedObject(name, value); // defaults
        _.each(inherits, function(type){ inherit(_definitions[type], objectDef); });
        wrap(methods, objectDef, name); // wrapping fn for chaining
        _.each(alias, function(type){ _definitions[type] = objectDef; }); 
       
    };
    // helpers for specific extentions
    Type.extend.transforms = function(from, to, transforms){
        if (!Type.types.is(from) || !Type.is('obj', transforms)) { return false; };
        inherit(transforms, _transforms[from][to]);
    };
    Type.extend.objects = function(type, methods){
        if (!Type.types.is(type) || !Type.is('obj', methods)) { return false; };
        inherit(methods, _definition[type]);
    }; 
    Type.extend.methods = function(type, methods){
        if (!Type.types.is(type) || !Type.is('obj', methods)) { return false; };
        inherit(methods, Type[type]);
    }; 

    // Type helpers, exposed
    Type.extend.wrap= K,
    Type.extend.pop= pop,
    Type.extend.popType= popType,
    Type.extend.inherit= inherit,
    Type.extend.wrap= wrap;
    
    /*  ************************************************ */
    // Main functions

    Type.a = function(t){
        var type = popType(t);
        if (Type.types.is(type)) return Type[type].a();
        return false;
    };
    Type.is = function(t, v){
        var type = popType(t), value = pop(v);
        if (Type.types.is(type) && Type[type]) return Type[type].is(value);
        return false;
    };
    Type.can = function(a, b){ 
        var type = popType(a), value = pop(b);    
        if (Type.types.is(type)) return Type(type, value) instanceof TypedObject;
        return false;
    }; 
    Type.to = function(a,b){
        var type = popType(a), value = pop(b);
        if (Type.types.is(type)) return Type(type, value);
        return false;
    };
    Type.make = function(a,b){
        var type = popType(a), value = pop(b);
        //if (Type.types.is(type)) return Type[type].make.apply(value, Type('args', arguments).sub(1).a()); );
        if (Type.types.is(type)) return Type[type].make(value);
        return false;
    };

    /*  ************************************************ */

    // almost done
    Type.VERSION = VERSION;
    Type.noConflict = function(clearAll){
        if(clearAll && root._) { _ = Type._ = _.noConflict(); }
        root.Type = noTypecast;
        return Type;
    };

    // Export the TypeCast object, for node & require & closure & browsers
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = Type;
        };
        exports.Type = Type;
    } else {
        root['Type'] = Type;
    };

}).call(this);