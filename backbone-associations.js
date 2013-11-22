//
//  Backbone-associations.js 0.5.4
//
//  (c) 2013 Dhruva Ray, Jaynti Kanani, Persistent Systems Ltd.
//  Backbone-associations may be freely distributed under the MIT license.
//  For all details and documentation:
//  https://github.com/dhruvaray/backbone-associations/
//
/*jslint nomen: true*/
/*global exports, require, module*/

// Initial Setup
// --------------
var backbone_associations = function () {
    "use strict";

    // Save a reference to the global object (`window` in the browser, `exports`
    // on the server).
    // The top-level namespace. All public Backbone classes and modules will be attached to this.
    // Exported for the browser and CommonJS.
    var root = this, _, Backbone, BackboneModel, BackboneCollection, ModelProto, CollectionProto,
        defaultEvents, AssociatedModel, pathChecker, collectionEvents, delimiters, pathSeparator,
        getSeparator, setSeparator, getPathArray, map2Scope, map2models, proxies;

    if (root.exports !== undefined) {
        _ = require('underscore');
        Backbone = require('backbone');
        if (root.module !== undefined && module.exports) {
            module.exports = Backbone;
        }
        root.exports = Backbone;
    } else {
        _ = root._;
        Backbone = root.Backbone;
    }
    // Create local reference `Model` prototype.
    BackboneModel = Backbone.Model;
    BackboneCollection = Backbone.Collection;
    ModelProto = BackboneModel.prototype;
    CollectionProto = BackboneCollection.prototype;

    // Built-in Backbone `events`.
    defaultEvents = ["change", "add", "remove", "reset", "sort", "destroy"];
    collectionEvents = ["reset", "sort"];

    Backbone.Associations = {
        VERSION: "0.5.4"
    };

    // Define `getter` and `setter` for `separator`
    getSeparator = function () {
        return pathSeparator;
    };
    // Define `setSeperator`
    setSeparator = function (value) {
        if (!_.isString(value) || _.size(value) < 1) {
            value = ".";
        }
        // set private properties
        pathSeparator = value;
        pathChecker = new RegExp("[\\" + pathSeparator + "\\[\\]]+", "g");
        delimiters = new RegExp("[^\\" + pathSeparator + "\\[\\]]+", "g");
    };

    try {
        // Define `SEPERATOR` property to Backbone.Associations
        Object.defineProperty(Backbone.Associations, 'SEPARATOR', {
            enumerable: true,
            get: getSeparator,
            set: setSeparator
        });
    } catch (e) {}

    // Backbone.AssociatedModel
    // --------------

    //Add `Many` and `One` relations to Backbone Object.
    Backbone.Associations.Many = Backbone.Many = "Many";
    Backbone.Associations.One = Backbone.One = "One";
    Backbone.Associations.Self = Backbone.Self = "Self";
    // Set default separator
    Backbone.Associations.SEPARATOR = ".";
    Backbone.Associations.getSeparator = getSeparator;
    Backbone.Associations.setSeparator = setSeparator;
    setSeparator();
    // Define `AssociatedModel` (Extends Backbone.Model).
    AssociatedModel = Backbone.AssociatedModel = Backbone.Associations.AssociatedModel = BackboneModel.extend({
        // Define relations with Associated Model.
        relations: undefined,
        // Define `Model` property which can keep track of already fired `events`,
        // and prevent redundant event to be triggered in case of cyclic model graphs.
        _proxyCalls: undefined,

        // Get the value of an attribute.
        get: function (attr) {
            var obj = ModelProto.get.call(this, attr);
            return obj || this._getAttr.apply(this, arguments);
        },

        // Set a hash of model attributes on the Backbone Model.
        set: function (key, value, options) {
            var attributes, result;
            // Duplicate backbone's behavior to allow separate key/value parameters,
            // instead of a single 'attributes' object.
            if (_.isObject(key) || key === null) {
                attributes = key;
                options = value;
            } else {
                attributes = {};
                attributes[key] = value;
            }
            result = this._set(attributes, options);
            // Trigger events which have been blocked until the entire object graph is updated.
            this._processPendingEvents();
            return result;

        },

        // Works with an attribute hash and options + fully qualified paths
        _set: function (attributes, options) {
            var modelMap, obj, result = this;
            if (!attributes) { return this; }
            _.map(_.keys(attributes), function (attr) {
                //Create a map for each unique object whose attributes we want to set
                modelMap = modelMap || {};
                if (attr.match(pathChecker)) {
                    var pathTokens = getPathArray(attr), initials = _.initial(pathTokens),
                        last = pathTokens[pathTokens.length - 1],
                        parentModel = result.get(initials);
                    if (parentModel instanceof AssociatedModel) {
                        obj = modelMap[parentModel.cid] = modelMap[parentModel.cid] || {'model': parentModel, 'data': {}};
                        obj.data[last] = attributes[attr];
                    }
                } else {
                    obj = modelMap[result.cid] = (modelMap[result.cid] || {'model': result, 'data': {}});
                    obj.data[attr] = attributes[attr];
                }
            });

            if (modelMap) {
                _.map(_.keys(modelMap), function (modelId) {
                    obj = modelMap[modelId];
                    if (!result._setAttr.call(obj.model, obj.data, options)) { result = false; }
                });
            } else {
                result = result._setAttr(attributes, options);
            }
            return result;

        },

        // Set a hash of model attributes on the object,
        // fire Backbone `event` with options.
        // It maintains relations between models during the set operation.
        // It also bubbles up child events to the parent.
        _setAttr: function (attributes, options) {
            // Extract attributes and options.
            options = options || {};
            if (options.unset) { _.map(_.keys(attributes), function (attr) { attributes[attr] = undefined; }); }

            this.parents = this.parents || [];

            if (this.relations) {
                // Iterate over `this.relations` and `set` model and collection values
                // if `relations` are available.
                _.each(this.relations, function (relation) {
                    var relationKey = relation.key, RelatedModel = relation.relatedModel,
                        CollectionType = relation.collectionType, map = relation.map, currVal = this.attributes[relationKey],
                        idKey = currVal && currVal.idAttribute,
                        val, relationOptions, data, relationValue, newCtx = false, updated, original;

                    // Call function if relatedModel is implemented as a function
                    if (RelatedModel && !(RelatedModel.prototype instanceof BackboneModel)) {
                        RelatedModel = _.isFunction(RelatedModel) ? RelatedModel.call(this, relation, attributes) : RelatedModel;
                    }

                    // Get class if relation and map is stored as a string.
                    if (typeof RelatedModel === 'string') {
                        RelatedModel = (RelatedModel === Backbone.Self) ? this.constructor : map2Scope(RelatedModel);
                    }

                    if (typeof CollectionType === 'string') { CollectionType = map2Scope(CollectionType); }

                    if (typeof map === 'string') { map = map2Scope(map); }
                    // Merge in `options` specific to this relation.
                    relationOptions = relation.options ? _.extend({}, relation.options, options) : options;

                    if ((!RelatedModel) && (!CollectionType)) {
                        throw new Error('specify either a relatedModel or collectionType');
                    }

                    if (attributes[relationKey]) {
                        // Get value of attribute with relation key in `val`.
                        val = _.result(attributes, relationKey);
                        // Map `val` if a transformation function is provided.
                        val = map ? map.call(this, val, CollectionType || RelatedModel) : val;

                        // If `relation.type` is `Backbone.Many`,
                        // Create `Backbone.Collection` with passed data and perform Backbone `set`.
                        if (relation.type === Backbone.Many) {
                            // `collectionType` of defined `relation` should be instance of `Backbone.Collection`.
                            if (CollectionType && !CollectionType.prototype instanceof BackboneCollection) {
                                throw new Error('collectionType must inherit from Backbone.Collection');
                            }

                            if (currVal) {
                                // Setting this flag will prevent events from firing immediately. That way clients
                                // will not get events until the entire object graph is updated.
                                currVal._deferEvents = true;

                                // Use Backbone.Collection's `reset` or smart `set` method
                                currVal[relationOptions.reset ? 'reset' : 'set'](val instanceof BackboneCollection ? val.models : val, relationOptions);

                                data = currVal;

                            } else {
                                newCtx = true;

                                if (val instanceof BackboneCollection) {
                                    data = val;
                                } else {
                                    data = CollectionType ? (new CollectionType()) : this._createCollection(RelatedModel);
                                    data[relationOptions.reset ? 'reset' : 'set'](val, relationOptions);
                                }
                            }

                        } else if (relation.type === Backbone.One) {

                            if (!RelatedModel) {
                                throw new Error('specify a relatedModel for Backbone.One type');
                            }

                            if (!(RelatedModel.prototype instanceof Backbone.AssociatedModel)) {
                                throw new Error('specify an AssociatedModel for Backbone.One type');
                            }

                            data = val instanceof AssociatedModel ? val : new RelatedModel(val, relationOptions);
                            //Is the passed in data for the same key?
                            if (currVal && data.attributes[idKey] && currVal.attributes[idKey] === data.attributes[idKey]) {
                                // Setting this flag will prevent events from firing immediately. That way clients
                                // will not get events until the entire object graph is updated.
                                currVal._deferEvents = true;
                                // Perform the traditional `set` operation
                                currVal._set(val instanceof AssociatedModel ? val.attributes : val, relationOptions);
                                data = currVal;
                            } else {
                                newCtx = true;
                            }

                        } else {
                            throw new Error('type attribute must be specified and have the values Backbone.One or Backbone.Many');
                        }


                        attributes[relationKey] = data;
                        relationValue = data;

                        // Add proxy events to respective parents.
                        // Only add callback if not defined or new Ctx has been identified.
                        if (newCtx || (relationValue && !relationValue._proxyCallback)) {
                            relationValue._proxyCallback = function () {
                                return this._bubbleEvent(relationKey, relationValue, arguments);
                            };
                            relationValue.on("all", relationValue._proxyCallback, this);
                        }

                    }
                    //Distinguish between the value of undefined versus a set no-op
                    if (attributes.hasOwnProperty(relationKey)) {
                        //Maintain reverse pointers - a.k.a parents
                        updated = attributes[relationKey];
                        original = this.attributes[relationKey];
                        if (updated) {
                            updated.parents = updated.parents || [];
                            if (_.indexOf(updated.parents, this) === -1) { updated.parents.push(this); }
                        } else if (original && original.parents.length > 0) { // New value is undefined
                            original.parents = _.difference(original.parents, [this]);
                            // Don't bubble to this parent anymore
                            if (original._proxyCallback) { original.off("all", original._proxyCallback, this); }
                        }
                    }
                }, this);
            }
            // Return results for `BackboneModel.set`.
            return ModelProto.set.call(this, attributes, options);
        },
        // Bubble-up event to `parent` Model
        _bubbleEvent: function (relationKey, relationValue, eventArguments) {
            var args = eventArguments,
                opt = args[0].split(":"),
                eventType = opt[0],
                catch_all = args[0] === "nested-change",
                eventObject = args[1],
                colObject = args[2],
                indexEventObject = -1,
                _proxyCalls = relationValue._proxyCalls,
                cargs,
                eventPath,
                basecolEventPath,
                isDefaultEvent = _.indexOf(defaultEvents, eventType) !== -1,
                pathTokens,
                initialTokens,
                colModel,
                ncargs;

            //Short circuit the listen in to the nested-graph event
            if (catch_all) { return; }

            // Change the event name to a fully qualified path.
            if (_.size(opt) > 1) { (eventPath = opt[1]); }

            if (_.indexOf(collectionEvents, eventType) !== -1) {
                colObject = eventObject;
            }

            // Find the specific object in the collection which has changed.
            if (relationValue instanceof BackboneCollection && isDefaultEvent && eventObject) {
                pathTokens = getPathArray(eventPath);
                initialTokens = _.initial(pathTokens);

                colModel = relationValue.find(function (model) {
                    if (eventObject === model) { return true; }
                    if (!model) { return false; }
                    var changedModel = model.get(initialTokens);

                    if ((changedModel instanceof AssociatedModel || changedModel instanceof BackboneCollection) && eventObject === changedModel) {
                        return true;
                    }

                    changedModel = model.get(pathTokens);

                    if ((changedModel instanceof AssociatedModel || changedModel instanceof BackboneCollection) && eventObject === changedModel) {
                        return true;
                    }

                    if (changedModel instanceof BackboneCollection && colObject && colObject === changedModel) {
                        return true;
                    }
                });
                if (colModel) { (indexEventObject = relationValue.indexOf(colModel)); }
            }

            // Manipulate `eventPath`.
            eventPath = relationKey + ((indexEventObject !== -1 && (eventType === "change" || eventPath)) ? "[" + indexEventObject + "]" : "") + (eventPath ? pathSeparator + eventPath : "");

            // Short circuit collection * events
            if (/\[\*\]/g.test(eventPath)) { return this; }
            basecolEventPath = eventPath.replace(/\[\d+\]/g, '[*]');

            cargs = [];
            cargs.push.apply(cargs, args);
            cargs[0] = eventType + ":" + eventPath;

            // If event has been already triggered as result of same source `eventPath`,
            // no need to re-trigger event to prevent cycle.
            _proxyCalls = relationValue._proxyCalls = (_proxyCalls || {});
            if (this._isEventAvailable(_proxyCalls, eventPath)) { return this; }

            // Add `eventPath` in `_proxyCalls` to keep track of already triggered `event`.
            _proxyCalls[eventPath] = true;

            // Set up previous attributes correctly.
            if ("change" === eventType) {
                this._previousAttributes[relationKey] = relationValue._previousAttributes;
                this.changed[relationKey] = relationValue;
            }

            // Bubble up event to parent `model` with new changed arguments.
            this.trigger.apply(this, cargs);

            //Only fire for change. Not change:attribute
            if ("change" === eventType && this.get(eventPath) !== args[2]) {
                ncargs = ["nested-change", eventPath, args[1]];
                if (args[2]) { ncargs.push(args[2]); } //args[2] will be options if present
                this.trigger.apply(this, ncargs);
            }

            // Remove `eventPath` from `_proxyCalls`,
            // if `eventPath` and `_proxyCalls` are available,
            // which allow event to be triggered on for next operation of `set`.
            if (_proxyCalls && eventPath) { delete _proxyCalls[eventPath]; }

            // Create a collection modified event with wild-card
            if (eventPath !== basecolEventPath) {
                cargs[0] = eventType + ":" + basecolEventPath;
                this.trigger.apply(this, cargs);
            }

            return this;
        },

        // Has event been fired from this source. Used to prevent event recursion in cyclic graphs
        _isEventAvailable: function (_proxyCalls, path) {
            return _.find(_.keys(_proxyCalls), function (eventKey) {
                return path.indexOf(eventKey, path.length - eventKey.length) !== -1;
            });
        },

        // Returns New `collection` of type `relation.relatedModel`.
        _createCollection: function (type) {
            var collection, relatedModel = type;
            if (typeof (relatedModel) === 'string') { (relatedModel = map2Scope(relatedModel)); }
            // Creates new `Backbone.Collection` and defines model class.
            if ((relatedModel && (relatedModel.prototype instanceof AssociatedModel)) || _.isFunction(relatedModel)) {
                collection = new BackboneCollection();
                collection.model = relatedModel;
            } else {
                throw new Error('type must inherit from Backbone.AssociatedModel');
            }
            return collection;
        },

        // Process all pending events after the entire object graph has been updated
        _processPendingEvents: function () {
            if (!this._processedEvents) {
                this._processedEvents = true;

                this._deferEvents = false;

                // Trigger all pending events
                _.each(this._pendingEvents, function (e) {
                    e.c.trigger.apply(e.c, e.a);
                });

                this._pendingEvents = [];

                // Traverse down the object graph and call process pending events on sub-trees
                _.each(this.relations, function (relation) {
                    var val = this.attributes[relation.key];
                    if (val) { val._processPendingEvents(); }
                }, this);

                delete this._processedEvents;
            }
        },

        // Override trigger to defer events in the object graph.
        trigger: function () {
            // Defer event processing
            if (this._deferEvents) {
                this._pendingEvents = this._pendingEvents || [];
                // Maintain a queue of pending events to trigger after the entire object graph is updated.
                this._pendingEvents.push({c: this, a: arguments});
            } else {
                ModelProto.trigger.apply(this, arguments);
            }
        },

        // The JSON representation of the model.
        toJSON: function (options) {
            var json = {}, aJson;
            json[this.idAttribute] = this.id;
            if (!this.visited) {
                this.visited = true;
                // Get json representation from `BackboneModel.toJSON`.
                json = ModelProto.toJSON.apply(this, arguments);
                // If `this.relations` is defined, iterate through each `relation`
                // and added it's json representation to parents' json representation.
                if (this.relations) {
                    _.each(this.relations, function (relation) {
                        var attr = this.attributes[relation.key];
                        if (attr) {
                            aJson = attr.toJSON ? attr.toJSON(options) : attr;
                            json[relation.key] = _.isArray(aJson) ? _.compact(aJson) : aJson;
                        }
                    }, this);
                }
                delete this.visited;
            }
            return json;
        },

        // Create a new model with identical attributes to this one.
        clone: function () {
            return new this.constructor(this.toJSON());
        },

        // Call this if you want to set an `AssociatedModel` to a falsy value like undefined/null directly.
        // Not calling this will leak memory and have wrong parents.
        // See test case "parent relations"
        cleanup: function () {
            _.each(this.relations, function (relation) {
                var val = this.attributes[relation.key];
                if (val) { (val.parents = _.difference(val.parents, [this])); }
            }, this);
            this.off();
        },

        // Navigate the path to the leaf object in the path to query for the attribute value
        _getAttr: function (path) {

            var result = this,
            //Tokenize the path
                attrs = getPathArray(path),
                key,
                i;
            if (_.size(attrs) < 1) { return; }
            for (i = 0; i < attrs.length; i += 1) {
                key = attrs[i];
                if (!result) { break; }
                //Navigate the path to get to the result
                result = result instanceof BackboneCollection
                    ? (isNaN(key) ? undefined : result.at(key))
                    : result.attributes[key];
            }
            return result;
        }
    });

    // Tokenize the fully qualified event path
    getPathArray = function (path) {
        if (path === '') { return ['']; }
        return _.isString(path) ? (path.match(delimiters)) : path || [];
    };

    map2Scope = function (path) {
        return _.reduce(path.split(pathSeparator), function (memo, elem) {
            return memo[elem];
        }, root);
    };

    //Infer the relation from the collection's parents and find the appropriate map for the passed in `models`
    map2models = function (parents, target, models) {
        var relation, surrogate;
        //Iterate over collection's parents
        _.find(parents, function (parent) {
            //Iterate over relations
            relation = _.find(parent.relations, function (rel) {
                return parent.get(rel.key) === target;
            }, this);
            if (relation) {
                surrogate = parent;//surrogate for transformation
                return true;//break;
            }
        }, this);

        //If we found a relation and it has a mapping function
        if (relation && relation.map) {
            return relation.map.call(surrogate, models, target);
        }
        return models;
    };

    proxies = {};
    // Proxy Backbone collection methods
    _.each(['set', 'remove', 'reset'], function (method) {
        proxies[method] = BackboneCollection.prototype[method];

        CollectionProto[method] = function (models) {
            var params = arguments;
            //Short-circuit if this collection doesn't hold `AssociatedModels`
            if (this.model.prototype instanceof AssociatedModel && this.parents) {
                //Find a map function if available and perform a transformation
                params[0] = map2models(this.parents, this, models);
            }
            return proxies[method].apply(this, params);
        };
    });

    // Override trigger to defer events in the object graph.
    proxies.trigger = CollectionProto.trigger;
    CollectionProto.trigger = function () {
        if (this._deferEvents) {
            this._pendingEvents = this._pendingEvents || [];
            // Maintain a queue of pending events to trigger after the entire object graph is updated.
            this._pendingEvents.push({c: this, a: arguments});
        } else {
            proxies.trigger.apply(this, arguments);
        }
    };

    // Attach process pending event functionality on collections as well. Re-use from `AssociatedModel`
    CollectionProto._processPendingEvents = AssociatedModel.prototype._processPendingEvents;


};
backbone_associations.call(this);
