var backbone_associations=function(){var q=this,f,g,A,n,w,x,E,r,F,G,H,v,D,B,C,y,I,z;void 0!==q.exports?(f=require("underscore"),g=require("backbone"),void 0!==q.module&&module.exports&&(module.exports=g),q.exports=g):(f=q._,g=q.Backbone);A=g.Model;n=g.Collection;w=A.prototype;x=n.prototype;E="change add remove reset sort destroy".split(" ");G=["reset","sort"];g.Associations={VERSION:"0.5.4"};D=function(){return v};B=function(a){if(!f.isString(a)||1>f.size(a))a=".";v=a;F=RegExp("[\\"+v+"\\[\\]]+", "g");H=RegExp("[^\\"+v+"\\[\\]]+","g")};try{Object.defineProperty(g.Associations,"SEPARATOR",{enumerable:!0,get:D,set:B})}catch(J){}g.Associations.Many=g.Many="Many";g.Associations.One=g.One="One";g.Associations.Self=g.Self="Self";g.Associations.SEPARATOR=".";g.Associations.getSeparator=D;g.Associations.setSeparator=B;B();r=g.AssociatedModel=g.Associations.AssociatedModel=A.extend({relations:void 0,_proxyCalls:void 0,get:function(a){return w.get.call(this,a)||this._getAttr.apply(this,arguments)}, set:function(a,c,b){var d;f.isObject(a)||null===a?(d=a,b=c):(d={},d[a]=c);a=this._set(d,b);this._processPendingEvents();return a},_set:function(a,c){var b,d,e=this;if(!a)return this;f.map(f.keys(a),function(c){b=b||{};if(c.match(F)){var g=C(c),h=f.initial(g),g=g[g.length-1],h=e.get(h);h instanceof r&&(d=b[h.cid]=b[h.cid]||{model:h,data:{}},d.data[g]=a[c])}else d=b[e.cid]=b[e.cid]||{model:e,data:{}},d.data[c]=a[c]});b?f.map(f.keys(b),function(a){d=b[a];e._setAttr.call(d.model,d.data,c)||(e=!1)}):e= e._setAttr(a,c);return e},_setAttr:function(a,c){c=c||{};c.unset&&f.map(f.keys(a),function(b){a[b]=void 0});this.parents=this.parents||[];this.relations&&f.each(this.relations,function(b){var d=b.key,e=b.relatedModel,s=b.collectionType,p=b.map,h=this.attributes[d],m=h&&h.idAttribute,l,k,t,u=!1;!e||e.prototype instanceof A||(e=f.isFunction(e)?e.call(this,b,a):e);"string"===typeof e&&(e=e===g.Self?this.constructor:y(e));"string"===typeof s&&(s=y(s));"string"===typeof p&&(p=y(p));k=b.options?f.extend({}, b.options,c):c;if(!e&&!s)throw Error("specify either a relatedModel or collectionType");if(a[d]){l=f.result(a,d);l=p?p.call(this,l,s||e):l;if(b.type===g.Many){if(s&&!s.prototype instanceof n)throw Error("collectionType must inherit from Backbone.Collection");h?(h._deferEvents=!0,h[k.reset?"reset":"set"](l instanceof n?l.models:l,k),b=h):(u=!0,l instanceof n?b=l:(b=s?new s:this._createCollection(e),b[k.reset?"reset":"set"](l,k)))}else if(b.type===g.One){if(!e)throw Error("specify a relatedModel for Backbone.One type"); if(!(e.prototype instanceof g.AssociatedModel))throw Error("specify an AssociatedModel for Backbone.One type");b=l instanceof r?l:new e(l,k);h&&b.attributes[m]&&h.attributes[m]===b.attributes[m]?(h._deferEvents=!0,h._set(l instanceof r?l.attributes:l,k),b=h):u=!0}else throw Error("type attribute must be specified and have the values Backbone.One or Backbone.Many");t=a[d]=b;if(u||t&&!t._proxyCallback)t._proxyCallback=function(){return this._bubbleEvent(d,t,arguments)},t.on("all",t._proxyCallback,this)}a.hasOwnProperty(d)&& (h=a[d],m=this.attributes[d],h?(h.parents=h.parents||[],-1===f.indexOf(h.parents,this)&&h.parents.push(this)):m&&0<m.parents.length&&(m.parents=f.difference(m.parents,[this]),m._proxyCallback&&m.off("all",m._proxyCallback,this)))},this);return w.set.call(this,a,c)},_bubbleEvent:function(a,c,b){var d=b[0].split(":"),e=d[0],g="nested-change"===b[0],p=b[1],h=b[2],m=-1,l=c._proxyCalls,k,t=-1!==f.indexOf(E,e),u,q;if(!g){1<f.size(d)&&(k=d[1]);-1!==f.indexOf(G,e)&&(h=p);c instanceof n&&t&&p&&(u=C(k),q=f.initial(u), (d=c.find(function(a){if(p===a)return!0;if(!a)return!1;var b=a.get(q);if((b instanceof r||b instanceof n)&&p===b)return!0;b=a.get(u);if((b instanceof r||b instanceof n)&&p===b||b instanceof n&&h&&h===b)return!0}))&&(m=c.indexOf(d)));k=a+(-1===m||"change"!==e&&!k?"":"["+m+"]")+(k?v+k:"");if(/\[\*\]/g.test(k))return this;d=k.replace(/\[\d+\]/g,"[*]");m=[];m.push.apply(m,b);m[0]=e+":"+k;l=c._proxyCalls=l||{};if(this._isEventAvailable(l,k))return this;l[k]=!0;"change"===e&&(this._previousAttributes[a]= c._previousAttributes,this.changed[a]=c);this.trigger.apply(this,m);"change"===e&&this.get(k)!==b[2]&&(a=["nested-change",k,b[1]],b[2]&&a.push(b[2]),this.trigger.apply(this,a));l&&k&&delete l[k];k!==d&&(m[0]=e+":"+d,this.trigger.apply(this,m));return this}},_isEventAvailable:function(a,c){return f.find(f.keys(a),function(a){return-1!==c.indexOf(a,c.length-a.length)})},_createCollection:function(a){var c=a;"string"===typeof c&&(c=y(c));if(c&&c.prototype instanceof r||f.isFunction(c))a=new n,a.model= c;else throw Error("type must inherit from Backbone.AssociatedModel");return a},_processPendingEvents:function(){this._processedEvents||(this._processedEvents=!0,this._deferEvents=!1,f.each(this._pendingEvents,function(a){a.c.trigger.apply(a.c,a.a)}),this._pendingEvents=[],f.each(this.relations,function(a){(a=this.attributes[a.key])&&a._processPendingEvents()},this),delete this._processedEvents)},trigger:function(){this._deferEvents?(this._pendingEvents=this._pendingEvents||[],this._pendingEvents.push({c:this, a:arguments})):w.trigger.apply(this,arguments)},toJSON:function(a){var c={},b;c[this.idAttribute]=this.id;this.visited||(this.visited=!0,c=w.toJSON.apply(this,arguments),this.relations&&f.each(this.relations,function(d){var e=this.attributes[d.key];e&&(b=e.toJSON?e.toJSON(a):e,c[d.key]=f.isArray(b)?f.compact(b):b)},this),delete this.visited);return c},clone:function(){return new this.constructor(this.toJSON())},cleanup:function(){f.each(this.relations,function(a){if(a=this.attributes[a.key])a.parents= f.difference(a.parents,[this])},this);this.off()},_getAttr:function(a){var c=this;a=C(a);var b,d;if(!(1>f.size(a))){for(d=0;d<a.length;d+=1){b=a[d];if(!c)break;c=c instanceof n?isNaN(b)?void 0:c.at(b):c.attributes[b]}return c}}});C=function(a){return""===a?[""]:f.isString(a)?a.match(H):a||[]};y=function(a){return f.reduce(a.split(v),function(a,b){return a[b]},q)};I=function(a,c,b){var d,e;f.find(a,function(a){if(d=f.find(a.relations,function(b){return a.get(b.key)===c},this))return e=a,!0},this); return d&&d.map?d.map.call(e,b,c):b};z={};f.each(["set","remove","reset"],function(a){z[a]=n.prototype[a];x[a]=function(c){var b=arguments;this.model.prototype instanceof r&&this.parents&&(b[0]=I(this.parents,this,c));return z[a].apply(this,b)}});z.trigger=x.trigger;x.trigger=function(){this._deferEvents?(this._pendingEvents=this._pendingEvents||[],this._pendingEvents.push({c:this,a:arguments})):z.trigger.apply(this,arguments)};x._processPendingEvents=r.prototype._processPendingEvents};backbone_associations.call(this);
