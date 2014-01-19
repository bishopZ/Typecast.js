;window.type = (function(){

	var _VERSION = '0.4';

	// Let's build a little nest here...
	var undefined; // for pre-EC5 js
	var noop = function(){};
	var value = function(v){ return function(){ return v; }; };
	var compare = function(v1){ return function(v2){ return v1 === v2; }; };
    var can = function(name){ 
    	return function(v){ 
    		var t = type[name];
    		return v === t.a() || ( v != t.a() && t.to(v) === t.a() ); 
    	}; 
    };

	// basic interface 
    var type = function(v){
    	if (type.arr(v)) return 'array';
    	if (type.nan(v)) return 'nan';
    	if (type.nul(v)) return 'null';
    	if (type.args(v)) return 'arguments';
    	if (type.num(v)) return "number";
        return typeof v;
    };

    type.VERSION = _VERSION;

    // extending
    type.extend = function(obj){
    	var isNew = false;
    	if (!type[obj.name]) {
    		//isNew = true;
    		type[obj.name] = obj.is;
    		type[obj.name].a = value(obj.a);
	    	type[obj.name].to = obj.to;
	    	type[obj.name].can = obj.can; 
    	}
    	if (_.isArray(obj.alias)) {
    		_.each(obj.alias, function(alias){
    			type[alias] = type[obj.name];
    		});
    	}
    };

    // #### the Types ####

    // Intentionally does not include values that require other
    // values to be validated, such as enum or floating point with precision

    // base types
    type.extend({
		name: "any",
		a : null,
		is: value(true),
		to: _.identity,
		can: value(true)
	});
	type.extend({
		name: "nul",
		alias: ['null'],
		a : null,
		is: _.isNull,
		to: value(null),
		can: value(true)
	});

	type.extend({
		name: "undef",
		alias: ['undefined'],
		a : undefined,
		is: _.isUndefined,
		to: value(undefined),
		can: value(true)
	});

	type.extend({
		name: "nan",
		a : NaN,
		is: _.isNaN,
		to: value(NaN),
		can: value(true)
	});

	type.extend({
		name: 'def',
		alias: ['defined'],
	    a: true,
	    is: function(v){ 
	        return !( type.nan(v) || type.undef(v) || type.nul(v) ); 
	    }, 
	    to: function(v){ 
	        return (type.def(v)) ? v : type.def.a();
	    },
	    can: function(v){
	    	return (type.def(v)) ? true : false;
	    }
	}); 

	// Dual Types

	type.extend({
		name:'bool', 
		alias: ['boolean'], 
		a: true, 
	    is: _.isBoolean,
	    to: function(v){ 
	    	return /^true$/i.test(v);
	    },
	    can: can('bool'),
	});

	type.extend({
		name: 'tru',  
		alias: ['true'],
		a: true, 
	    is: compare(true), 
	    to: type.bool.a,
	    can: value(true)
	});
	type.extend({
		name: 'fal',  
		alias: ['false'],
		a: false, 
	    is: compare(false), 
	    to: value(false),
	    can: value(false)
	});
	type.extend({
		name: 'truy',  
		alias: ['truthy'],
		a: true, 
	    is: function(v){ return v == true; }, 
	    to: function(v){ return (v) ? v : true; },
	    can: value(true)
	});
	type.extend({
		name: 'faly',  
		alias: ['falsey'],
		a: false, 
	    is: function(v){ return v !== true; }, 
	    to: function(v){ return (!v) ? v : false; },
	    can: value(false)
	});
	
	// Numeric

	type.extend({
		name:'num', 
		alias: ['number'], 
    	a: 0 ,
    	is: function(v){ 
    		return _.isNumber(v) && !type.nan(parseFloat(v)); 
    	},
	    to: function(v){
	        if(type.num(v)){ return v; };
	        if(type.bool(v)){ return v ? 1 : 0; };
	        if(type.fn(v)){ 
	            var val = v();
	            if(type.num(val)){ return val; }; 
	        }; 
	        if(type.obj(v) && type.fn(v.a)) {
	        	if (type.num(v.a())) return v.a();
	        }
	        if(type.arr(v)){ return v.length; };
	        if(type.str(v)){
	            var num = v * 1 || 0;
	            return (num === 0 && !v.match(/^0+$/)) ? type.num.a() : num;
	        }
	        return type.num.a();
	    },
	    can: can("num"),
	    
	});

	type.extend({
		name:'int',
		alias: ['integer'],  
		a: 1,  
		is: function(v){ return (v % 1 === 0); },
		to: function(v){ 
			var value = parseInt(v, 10); 
			if (!isNaN(value)) return value; 
			return type.num.a();
		},
		can: can("int"),
	});

	/// Strings

	type.extend({
		name:'str',  
		alias: ['string'],
		a: '', 
		is: _.isString,  
		to: function(v){ 
			if(type.def(v)) return String(v); return type.str.a(); 
		},
		can: can("str")
	});


	type.extend({
		name:'plain',  
		a: "", 
		is: function(v){ return  type.plain.to(v).length === v.length; },
		to: function(v){ 
			if(type.str(v)) return v.replace(/^[^a-zA-Z0-9@!#\$\^%&*()+=\-\[\]\\\';,\.\/\{\}\|\":<>\? ]+$/, '' ); return type.plain.a(); 
		},
		can: can("str")
	});

	type.extend({
		name:'email',  
		a: 'test@test.com', 
		is: function(v){ 
			var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    		return re.test(v); 
    	},
    	to: function(v,w,x){ 
    		if (type.email(v)) return v;
    		if (type.def(v) && type.def(w) && type.def(x)) return v+'@'+w+'.'+x; 
    		if (type.def(v) && type.def(w)) return v+'@'+w;
    		return type.email.a();
    	},
    	can: can("email")
	});


	/** COLLECTION TYPES **/

	type.extend({
		name:'col', 
		alias: ['collection'], 
		a: [],
		is: function(v){ return _.isObject(v) || _.isArray(v); }, 
		can: value(true), 
		to: function(v){ 
			if (type.col(v)) { return v; }
			return type.arr.to(v); 
		},
	});

	type.extend({
		name:'arr',  
		alias: ['array'],
		a: [], 
		is: _.isArray, 
		to: function(v){ 
			if(type.args(v)) return _.toArray(v); 
			if(type.arr(v)) return v; 
			if(type.obj(v)) return _.values(v); 
			if(type.fn(v)){ 
				if(type.arr(v())) return v(); 
			};
			if(type.def(v)) return _.toArray(arguments); 
			return false;
		},
		can: can("arr"),
	});

	type.extend({
		name:'args', 
		alias: ['arguments'], 
		a: (function(){ return arguments; })(),
		is: function(v){
			return (v != null) // since undefined == null
	        	&& ((Object.prototype.toString.call(v) == '[object Arguments]') 
	        	|| (!!v.callee)); // fixes for ie8 non-strict-mode
    	},
    	can: function(v){ return type.args.is(v) || type.arr(v); },
		to: function(){ return arguments; },
	});

	type.extend({
	 	name:'obj', 
	 	alias: ['object'], 
	 	a: {}, 
		is: function(v){ return _.isObject(v) && !type.arr(v); }, 
		to: function(v, w){ 
			if(type.obj(v)) return v;
			if(type.arr(v)){ return (type.arr(w)) ? _.object(v,w) : _.extend({}, v); };
			if(type.fn(v)){ if(type.obj(v())){ return v(); }; };
			if(type.def(v)){ return {a: value(v)}; };
			return false;
		},
		can: can("obj"),
	});


	// /** FUNCTIONAL TYPES **/

	type.extend({
		name:'fn', 
		alias: ['function'], 
		a: noop, 
		is: _.isFunction, 
		can: function(v){ return _.isFunction(v); }, 
		to: function(v){ 
			if(type.fn.is(v)) return v; 
			return type.fn.a(); 
		},
	});


	// Regex

	type.extend({
		name:'reg',  
		alias: ['regex', 'regexp'],
		a: new RegExp(), 
		is: _.isRegExp, 
		to: function(a,b){ return new RegExp(a,b); },
		can: can("reg")
	});

	// Time

	type.extend({
		name:'date',  
		a: new Date(), 
		is: _.isDate, 
		to: function(v){ return new Date(v); },
		can: can("date"),
	});


	// Compound

	type.extend({
		name:'vec',
		alias: ['vector'],  
		a: [0],  
		is: function(v, w){ 
			var len;
			if (type.int(v)) len = v, v = w;
			if (type.arr(v)) {
				if(_.all(v, function(v){ return type.num(v); }) ) {
					if (type.def(len)) {
						if(v.length === len) { return true; };
					} else {
						return true;
					};
				};
			};
			return false; 
		},
		to: function(v, w){ 
			var len;
			if (type.int(v)) len = v, v = w;
			if (type.arr(v)) {
				var map = _.map(v, function(v){ return type.num(v); });
				if (type.def(len)) { return map.slice(0, len); }
				return map;
			}
			if (_.all(arguments, function(val){ return type.num(val); })) {
				return _.map(arguments, value);				
			}
			return type.vec.a(); 
		},
    	can: function(a){
    		return type.vec(a);
    	}
	});


	type.extend({
	 	name:'geo',  
	 	a: {lat:0, long:0}, 
	 	is: function(v){ 
	 		if (type.obj(v)) {
	 			if(v.hasOwnProperty('lat') && v.hasOwnProperty('long')) {
	 				if(type.num(v.lat) && type.num(v.long)) {
	 					return true;
	 				}
	 			}
	 		}
	 		return false; 
	 	}, 
		to: function(v, w){ 
			if(type.num(w) && type.num(v)) return {lat:v, long:w}; 
			if(type.geo(v)) return v;
			if(type.obj(v)) return _.extend(type.geo.a(), v); 
			if(type.arr(v)){ 
				if(v.length === 2) return {lat: a[0], long:a[1]};
			}
			if(type.fn(v)){ if(type.geo(v())) return v(); };
			return type.geo.a();
		},
		can: can("geo")
	});


	type.extend({
		name:'json',  
		a: {}, 
		is: function(v){ 
			if(type.str(v)) return type.obj(JSON.parse(v)); 
			if(type.obj(v) || type.arr(v)) return type.str(JSON.stringify(v));
			return false;
		}, 
		to: function(v){
			if(type.str(v)) return JSON.parse(v); 
			if(type.obj(v) || type.arr(v)) return JSON.stringify(v);
			return this.a();
		},
	});


	type.extend({
		name:'que',  
		a: [], 
		is: function(v){ 
			return type.arr(v) 
				&& _.all(v, function(v){ return type.fn(v); }); 
		}, 
		to: function(v){ 
			if(type.que(v)) return v; 
			if(type.fn(v)) return [v]; 
			return [];
		},
		can: can("que")
	});

	return type;
    
})(); // ...and fade to black