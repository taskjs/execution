var Promise = require('es6-promise').Promise;
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('lodash');

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
    // Export options on constructor.
    ctor.options = props.options;
    ctor.extend = this.extend;
    ctor.Status = this.Status;
    ctor.Promise = this.Promise;
    return ctor;
};

Execution.prototype.timeout = 0;
Execution.prototype.force = false;
Execution.prototype._status = null;
Execution.prototype._inputs = [];
Execution.prototype._options = {};
Execution.prototype._logger = console;

Object.defineProperty(Execution.prototype, 'status', {
    get: function() {
        return this._status;
    },
    set: function(val) {
        this._status = val;
    }
});


Object.defineProperty(Execution.prototype, 'inputs', {
    get: function() {
        return this._inputs;
    },
    set: function(val) {
        if(val != null){
            this._inputs = Array.isArray(val)? val: [val];
        }
    }
});

Object.defineProperty(Execution.prototype, 'options', {
    get: function() {
        return this._options;
    },
    set: function(val) {
        if(_.isPlainObject(val)){
            this._options = this._parseOptions(val);
        }
    }
});

Object.defineProperty(Execution.prototype, 'logger', {
    get: function() {
        return this._logger;
    },
    set: function(val) {
        if(val){
            this._logger = val;
        }
    }
});

Execution.prototype._parseOptions = function (options) {
    options = _.omit(options, function(opt){
        return _.isPlainObject(opt) && _.isUndefined(opt.default)
    });

    return _.merge({}, this.options, options, function(a, b){
        return  b.default == null?b : b.default;
    });
};

Execution.prototype.setTimeout = function(msecs, callback) {
    if (msecs > 0 && !isNaN(msecs) && isFinite(msecs)) {
        this.timeout = msecs;
        if (callback) {
            this.on('timeout', callback);
            this._timeoutHandler = callback;
        }
    } else if (msecs === 0) {
        this.clearTimeout(callback);
    }
};

Execution.prototype.clearTimeout = function(callback){
    this.timeout = 0;
    if (this._timer) {
        clearTimeout(this._timer);
    }
    callback = callback || this._timeoutHandler;
    if (callback) {
        this.removeListener('timeout', callback);
    }
};

/**
 * Main entry point for task.
 */
Execution.prototype.run = function (inputs, options, logger) {
    return this._run(inputs, options, logger);
};

Execution.prototype._run = function(inputs, options, logger){
    var self = this;
    self.inputs = inputs;
    self.options = options;
    self.logger = logger;

    if(this.timeout){
        this._timer = setTimeout(function(){
            self.emit('timeout');
        }, this.timeout)
    }

    return this._execute().catch(this._error.bind(self));
};

Execution.prototype._execute = function(){
    var self = this;
    return new Promise(function (resolve, reject) {
        self.emit('execute');
        self.status = Status.RUNNING;

        self.execute(function(){
            self._timer && clearTimeout(self._timer);
            self.status = Status.RESOLVED;
            resolve.apply(self, arguments);
        }, function(){
            self._timer && clearTimeout(self._timer);
            self.status = Status.REJECTED;
            reject.apply(self, arguments);
        });
    });
};

Execution.prototype._error = function(err) {
    this.status = Status.FAULTED;

    // Hack on default error message
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
