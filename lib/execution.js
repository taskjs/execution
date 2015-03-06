var Promise = require('es6-promise').Promise;
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('lodash');

var parseOptions = function (options) {
    options = _.omit(options, function(opt){
        return _.isPlainObject(opt) && _.isUndefined(opt.default)
    });

    return _.merge({}, options, function(a, b){
        return  b && (b.default == null?b : b.default);
    });
}

var Status = {
    PENDING:  0, // Indicates that the task has not been executed yet.
    RUNNING:  1, // Indicates that the task is running.
    REJECTED: 2, // Indicates that the task has completed without errors.
    RESOLVED: 3, // Indicates that the task not completed.
    FINISHED: 4, // Indicates that the task has finished.
    FAULTED:  5  // Indicates that the task finished due to an unhandled exception.
};

function Execution (config) {
    if (!(this instanceof Execution)) return new Execution(config);
    this.status = Status.PENDING;
    _.extend(this, config);
    EventEmitter.call(this);
}

util.inherits(Execution, EventEmitter);

Execution.Status = Status;
Execution.Promise = Promise;

Execution.extend = function (props) {

    var ctor = function ()  {
        Execution.apply(this, arguments);
    };
    util.inherits(ctor, this);

    _.extend(ctor.prototype, props);

    if(ctor.prototype.options){
        ctor.prototype.options = parseOptions(ctor.prototype.options)
    }

    // Export options on constructor.
    ctor.options = props.options;
    ctor.extend = this.extend;
    ctor.Status = this.Status;
    ctor.Promise = this.Promise;
    return ctor;
};

// Task timeout.
Execution.prototype.timeout = 0;
// Ignore task inputs.
Execution.prototype.ignore = false;

Execution.prototype.status = null;
Execution.prototype.options = {};
Execution.prototype._inputs = [];
Execution.prototype.logger = console;

Object.defineProperty(Execution.prototype, 'inputs', {
    get: function() {
        return this.ignore? []: this._inputs;
    },
    set: function(val) {
        if(val != null){
            this._inputs = Array.isArray(val)? val: [val];
        }
    }
});

Execution.prototype.setTimeout = function(msecs, callback) {
    if (msecs > 0 && !isNaN(msecs) && isFinite(msecs)) {
        this.timeout = msecs;
        if (callback) {
            this.on('timeout', callback);
            this._timeoutHandler = callback;
        }
    }
};

Execution.prototype.clearTimeout = function(callback){
    if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
    }

    callback = callback || this._timeoutHandler;
    if (callback) {
        this.removeListener('timeout', callback);
    }
};

/**
 * Main entry point for task.
 */
Execution.prototype.run = function (inputs, options, logger, settings) {
    return this._run(inputs, options, logger, settings);
};

Execution.prototype._run = function(inputs, options, logger, settings){

    this.inputs = inputs;

    if(this.options){
        this.options = _.cloneDeep(this.options)
    }

    if(options){
        _.extend(this.options || {}, options);
    }

    if(logger){
        this.logger = logger;
    }

    if(settings){
        _.extend(this, settings);
    }

    var promise = this._execute();
    promise.catch(this._error.bind(this));
    return promise;
};

Execution.prototype._execute = function(){
    var self = this;
    return new Promise(function (resolve, reject) {
        self.emit('execute');
        self.status = Status.RUNNING;

        var resolveHandler = function(){
            if(self.status === Status.RUNNING){
                self.clearTimeout();
                self.status = Status.RESOLVED;
                resolve.apply(self, arguments);
            }
        };

        var rejectHandler = function(){
            if(self.status === Status.RUNNING){
                self.clearTimeout();
                self.status = Status.REJECTED;
                reject.apply(self, arguments);
            }
        };

        if(self.timeout){
            self._timer = setTimeout(function(){
                self.emit('timeout');
                rejectHandler(new Error('Execution timed out.'));
                self._timer = null;
            }, self.timeout);
        }

        self.execute(resolveHandler, rejectHandler);
    });
};

Execution.prototype._error = function(err) {
    this.status = Status.FAULTED;

    // Hack on default error message that will break run.
    try{
        this.emit('error', err);
    }catch(e){}

    return this.error(err);
};

Execution.prototype.execute = function (resolve, reject) {
    throw new Error("Must override the execute method")
};

Execution.prototype.error = function (err) {
    this.logger.log(err.stack || err);
};

module.exports = Execution;
